-- Bookings: crew size, field location, date rules, duplicate guard ----------
alter table public.bookings add column workers int not null default 1 check (workers between 1 and 20);
alter table public.bookings add column field_location text check (char_length(field_location) <= 120);

create unique index bookings_no_duplicates
  on public.bookings (farmer_id, work_type_id, work_date)
  where status in ('requested', 'accepted', 'in_progress');

create or replace function public.prepare_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  farmer public.profiles%rowtype;
begin
  if new.work_date < current_date or new.work_date > current_date + 30 then
    raise exception 'Pick a work date within the next 30 days';
  end if;

  select * into farmer from public.profiles where id = new.farmer_id;

  new.rate_per_hour := (select rate_per_hour from public.work_types where id = new.work_type_id);
  new.total_amount := new.rate_per_hour * new.hours * new.workers;
  new.status := 'requested';
  new.labour_id := null;
  new.labour_name := null;
  new.labour_phone := null;
  new.farmer_name := farmer.full_name;
  -- The farmer's phone is shared only with the labourer who accepts (see booking_contact).
  new.farmer_phone := null;
  new.field_location := nullif(trim(new.field_location), '');
  new.village := coalesce(farmer.village, farmer.district);
  return new;
end;
$$;

-- Phone numbers used to be copied onto open requests that every labourer can read.
update public.bookings set farmer_phone = null where farmer_phone is not null;

create or replace function public.booking_contact(_booking_id uuid)
returns table (name text, phone text)
language plpgsql stable security definer set search_path = public as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = _booking_id;
  if b.id is null then
    return;
  end if;
  if b.labour_id = auth.uid() and b.status in ('accepted', 'in_progress', 'completed') then
    return query select p.full_name, p.phone from public.profiles p where p.id = b.farmer_id;
  elsif b.farmer_id = auth.uid() and b.labour_id is not null then
    return query select b.labour_name, b.labour_phone;
  end if;
end;
$$;

revoke execute on function public.booking_contact(uuid) from public, anon;
grant execute on function public.booking_contact(uuid) to authenticated;

-- Genuine count of registered labourers (no names or numbers).
create or replace function public.registered_labour_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.user_roles where role = 'labour'
$$;

revoke execute on function public.registered_labour_count() from public, anon;
grant execute on function public.registered_labour_count() to authenticated;

-- Soil tests: record whether it was a lab report or a field kit ------------
alter table public.soil_tests add column test_method text check (test_method in ('lab', 'field_kit'));
alter table public.soil_tests add column lab_name text check (char_length(lab_name) <= 80);

-- Soil support requests (farmer -> CRP appointment) ------------------------
create table public.soil_support_requests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('soil_test', 'lcc_check', 'field_visit')),
  crop text check (char_length(crop) <= 60),
  preferred_date date not null,
  preferred_slot text not null check (preferred_slot in ('morning', 'afternoon')),
  notes text check (char_length(notes) <= 300),
  status text not null default 'requested'
    check (status in ('requested', 'scheduled', 'completed', 'cancelled')),
  farmer_name text,
  village text,
  crp_id uuid,
  crp_name text,
  crp_phone text,
  appointment_on date,
  appointment_time time,
  crp_note text check (char_length(crp_note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index soil_support_farmer_idx on public.soil_support_requests (farmer_id, created_at desc);
create unique index soil_support_one_open
  on public.soil_support_requests (farmer_id, request_type)
  where status in ('requested', 'scheduled');

grant select, insert on public.soil_support_requests to authenticated;
grant all on public.soil_support_requests to service_role;

alter table public.soil_support_requests enable row level security;

create policy "Farmers create their own soil requests"
  on public.soil_support_requests for insert to authenticated
  with check (farmer_id = auth.uid() and public.has_role(auth.uid(), 'farmer'));

create policy "Farmers see their soil requests"
  on public.soil_support_requests for select to authenticated
  using (farmer_id = auth.uid());

create policy "CRPs see all soil requests"
  on public.soil_support_requests for select to authenticated
  using (public.has_role(auth.uid(), 'crp'));

create or replace function public.prepare_soil_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  farmer public.profiles%rowtype;
begin
  if new.preferred_date < current_date or new.preferred_date > current_date + 60 then
    raise exception 'Pick a date within the next 60 days';
  end if;
  select * into farmer from public.profiles where id = new.farmer_id;
  new.status := 'requested';
  new.farmer_name := farmer.full_name;
  new.village := coalesce(farmer.village, farmer.district);
  new.crp_id := null;
  new.crp_name := null;
  new.crp_phone := null;
  new.appointment_on := null;
  new.appointment_time := null;
  new.crp_note := null;
  new.crop := nullif(trim(new.crop), '');
  new.notes := nullif(trim(new.notes), '');
  return new;
end;
$$;

create trigger soil_requests_prepare before insert on public.soil_support_requests
  for each row execute function public.prepare_soil_request();

create trigger soil_requests_touch before update on public.soil_support_requests
  for each row execute function public.touch_updated_at();

create or replace function public.schedule_soil_visit(
  _request_id uuid, _on date, _at time, _note text default null
)
returns public.soil_support_requests
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles%rowtype;
  result public.soil_support_requests;
begin
  if not public.has_role(auth.uid(), 'crp') then
    raise exception 'Only CRPs can schedule visits';
  end if;
  if _on < current_date then
    raise exception 'The visit date cannot be in the past';
  end if;
  select * into me from public.profiles where id = auth.uid();
  update public.soil_support_requests
     set status = 'scheduled',
         crp_id = auth.uid(),
         crp_name = me.full_name,
         crp_phone = me.phone,
         appointment_on = _on,
         appointment_time = _at,
         crp_note = nullif(trim(_note), '')
   where id = _request_id and status in ('requested', 'scheduled')
  returning * into result;
  if result.id is null then
    raise exception 'This request is already closed';
  end if;
  return result;
end;
$$;

create or replace function public.update_soil_request_status(_request_id uuid, _status text)
returns public.soil_support_requests
language plpgsql security definer set search_path = public as $$
declare
  current_row public.soil_support_requests;
  result public.soil_support_requests;
begin
  select * into current_row from public.soil_support_requests where id = _request_id;
  if current_row.id is null then
    raise exception 'Request not found';
  end if;
  if _status = 'cancelled' then
    if current_row.farmer_id <> auth.uid() or current_row.status not in ('requested', 'scheduled') then
      raise exception 'This request can no longer be cancelled';
    end if;
  elsif _status = 'completed' then
    if not public.has_role(auth.uid(), 'crp') or current_row.status <> 'scheduled' then
      raise exception 'Schedule the visit before marking it done';
    end if;
  else
    raise exception 'Unknown status %', _status;
  end if;
  update public.soil_support_requests set status = _status where id = _request_id
  returning * into result;
  return result;
end;
$$;

revoke execute on function public.schedule_soil_visit(uuid, date, time, text) from public, anon;
revoke execute on function public.update_soil_request_status(uuid, text) from public, anon;
grant execute on function public.schedule_soil_visit(uuid, date, time, text) to authenticated;
grant execute on function public.update_soil_request_status(uuid, text) to authenticated;

-- Crop plans & task ticks (farmer-owned) ------------------------------------
create table public.crop_plans (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  crop text not null check (crop in ('paddy', 'groundnut', 'cotton', 'maize', 'redgram', 'tomato')),
  sowing_date date not null,
  area_acres numeric(6,2) check (area_acres > 0 and area_acres <= 100),
  created_at timestamptz not null default now()
);

create index crop_plans_farmer_idx on public.crop_plans (farmer_id, sowing_date desc);

grant select, insert, update, delete on public.crop_plans to authenticated;
grant all on public.crop_plans to service_role;

alter table public.crop_plans enable row level security;

create policy "Farmers manage their crop plans"
  on public.crop_plans for all to authenticated
  using (farmer_id = auth.uid())
  with check (farmer_id = auth.uid() and public.has_role(auth.uid(), 'farmer'));

create policy "CRPs see crop plans"
  on public.crop_plans for select to authenticated
  using (public.has_role(auth.uid(), 'crp'));

create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  task_key text not null check (char_length(task_key) between 3 and 120),
  completed_at timestamptz not null default now(),
  unique (farmer_id, task_key)
);

grant select, insert, delete on public.task_completions to authenticated;
grant all on public.task_completions to service_role;

alter table public.task_completions enable row level security;

create policy "Farmers manage their task ticks"
  on public.task_completions for all to authenticated
  using (farmer_id = auth.uid())
  with check (farmer_id = auth.uid());

-- Farm money records (farmer-owned) -----------------------------------------
create table public.farm_records (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('expense', 'sale')),
  crop text not null check (char_length(crop) between 1 and 40),
  category text not null check (char_length(category) between 1 and 40),
  amount numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  quantity numeric(10,2) check (quantity > 0),
  unit text check (char_length(unit) <= 20),
  recorded_on date not null default current_date,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index farm_records_farmer_idx on public.farm_records (farmer_id, recorded_on desc);

grant select, insert, update, delete on public.farm_records to authenticated;
grant all on public.farm_records to service_role;

alter table public.farm_records enable row level security;

create policy "Farmers manage their own money records"
  on public.farm_records for all to authenticated
  using (farmer_id = auth.uid())
  with check (farmer_id = auth.uid());