-- Roles ---------------------------------------------------------------
create type public.app_role as enum ('farmer', 'labour', 'crp');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users can read their own role"
  on public.user_roles for select to authenticated
  using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Profiles ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null,
  phone text,
  avatar_url text,
  state_code text not null default 'AP',
  village text,
  district text,
  farmer_code text unique,
  crp_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, village, district) on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "CRPs can read all profiles"
  on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'crp'));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- CRP IDs issued by RySS (claimed once at sign up) ------------------------
create table public.crp_codes (
  code text primary key,
  district text not null,
  claimed_by uuid,
  claimed_at timestamptz
);

grant all on public.crp_codes to service_role;
alter table public.crp_codes enable row level security;

insert into public.crp_codes (code, district) values
  ('RYSS-AP-1001', 'Krishna'),
  ('RYSS-AP-1002', 'Guntur'),
  ('RYSS-AP-1003', 'Anantapur'),
  ('RYSS-TS-2001', 'Warangal');

-- Work types & government rates (set by CRP) -----------------------------
create table public.work_types (
  id text primary key,
  name text not null,
  name_te text not null,
  description text not null,
  rate_per_hour numeric(8,2) not null check (rate_per_hour > 0),
  sort_order int not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

grant select on public.work_types to authenticated;
grant update (rate_per_hour, updated_by, updated_at) on public.work_types to authenticated;
grant all on public.work_types to service_role;

alter table public.work_types enable row level security;

create policy "Anyone signed in can see work types"
  on public.work_types for select to authenticated using (true);

create policy "CRPs can change rates"
  on public.work_types for update to authenticated
  using (public.has_role(auth.uid(), 'crp'))
  with check (public.has_role(auth.uid(), 'crp'));

insert into public.work_types (id, name, name_te, description, rate_per_hour, sort_order) values
  ('sowing',       'Sowing',       'విత్తనం',      'Seed sowing and dibbling in prepared beds', 60, 1),
  ('weeding',      'Weeding',      'కలుపు తీత',    'Hand weeding between crop rows',           55, 2),
  ('transplanting','Transplanting','నాట్లు',        'Transplanting paddy and vegetable seedlings', 65, 3),
  ('spraying',     'Spraying',     'పిచికారీ',      'Spraying Jeevamrutham, Neemastram and other natural inputs', 70, 4),
  ('mulching',     'Mulching',     'మల్చింగ్',      'Spreading straw and crop residue as soil cover', 55, 5),
  ('harvesting',   'Harvesting',   'కోత',          'Cutting, bundling and carrying the harvest', 75, 6);

-- Bookings (farmer → labour, Uber style) ---------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null default auth.uid(),
  labour_id uuid,
  work_type_id text not null references public.work_types(id),
  work_date date not null,
  start_time time not null,
  hours int not null check (hours between 1 and 12),
  rate_per_hour numeric(8,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  payment_method text not null check (payment_method in ('cash', 'upi')),
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'in_progress', 'completed', 'cancelled')),
  notes text,
  farmer_name text,
  farmer_phone text,
  village text,
  labour_name text,
  labour_phone text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create index bookings_farmer_idx on public.bookings (farmer_id, created_at desc);
create index bookings_labour_idx on public.bookings (labour_id, created_at desc);
create index bookings_open_idx on public.bookings (status) where status = 'requested';

grant select, insert on public.bookings to authenticated;
grant all on public.bookings to service_role;

alter table public.bookings enable row level security;

create policy "Farmers create their own bookings"
  on public.bookings for insert to authenticated
  with check (farmer_id = auth.uid() and public.has_role(auth.uid(), 'farmer'));

create policy "Farmers see their bookings"
  on public.bookings for select to authenticated
  using (farmer_id = auth.uid());

create policy "Labourers see open requests and their jobs"
  on public.bookings for select to authenticated
  using (
    public.has_role(auth.uid(), 'labour')
    and (labour_id = auth.uid() or (status = 'requested' and labour_id is null))
  );

create policy "CRPs see all bookings"
  on public.bookings for select to authenticated
  using (public.has_role(auth.uid(), 'crp'));

-- Price always comes from the CRP rate table, never from the client.
create or replace function public.prepare_booking()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  farmer public.profiles%rowtype;
begin
  select * into farmer from public.profiles where id = new.farmer_id;

  new.rate_per_hour := (select rate_per_hour from public.work_types where id = new.work_type_id);
  new.total_amount := new.rate_per_hour * new.hours;
  new.status := 'requested';
  new.labour_id := null;
  new.labour_name := null;
  new.labour_phone := null;
  new.farmer_name := farmer.full_name;
  new.farmer_phone := farmer.phone;
  new.village := coalesce(farmer.village, farmer.district);
  return new;
end;
$$;

create trigger bookings_prepare before insert on public.bookings
  for each row execute function public.prepare_booking();

create or replace function public.accept_booking(_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles%rowtype;
  result public.bookings;
begin
  if not public.has_role(auth.uid(), 'labour') then
    raise exception 'Only labourers can accept work';
  end if;

  select * into me from public.profiles where id = auth.uid();

  update public.bookings
     set labour_id = auth.uid(),
         labour_name = me.full_name,
         labour_phone = me.phone,
         status = 'accepted',
         accepted_at = now()
   where id = _booking_id and status = 'requested' and labour_id is null
  returning * into result;

  if result.id is null then
    raise exception 'This request was already taken by someone else';
  end if;

  return result;
end;
$$;

create or replace function public.update_booking_status(_booking_id uuid, _status text)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  current_row public.bookings;
  result public.bookings;
begin
  select * into current_row from public.bookings where id = _booking_id;
  if current_row.id is null then
    raise exception 'Booking not found';
  end if;

  if _status = 'cancelled' then
    if current_row.farmer_id <> auth.uid() or current_row.status not in ('requested', 'accepted') then
      raise exception 'This booking can no longer be cancelled';
    end if;
  elsif _status = 'in_progress' then
    if current_row.labour_id is distinct from auth.uid() or current_row.status <> 'accepted' then
      raise exception 'Work can only be started after accepting';
    end if;
  elsif _status = 'completed' then
    if current_row.labour_id is distinct from auth.uid() or current_row.status <> 'in_progress' then
      raise exception 'Start the work before completing it';
    end if;
  else
    raise exception 'Unknown status %', _status;
  end if;

  update public.bookings
     set status = _status,
         completed_at = case when _status = 'completed' then now() else completed_at end
   where id = _booking_id
  returning * into result;

  return result;
end;
$$;

revoke execute on function public.accept_booking(uuid) from public, anon;
revoke execute on function public.update_booking_status(uuid, text) from public, anon;
grant execute on function public.accept_booking(uuid) to authenticated;
grant execute on function public.update_booking_status(uuid, text) to authenticated;

alter table public.bookings replica identity full;
alter publication supabase_realtime add table public.bookings;

-- Soil tests & Leaf Colour Chart (uploaded by CRP) ------------------------
create table public.soil_tests (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  recorded_by uuid not null default auth.uid(),
  tested_on date not null default current_date,
  ph numeric(4,2),
  ec numeric(5,2),
  organic_carbon numeric(4,2),
  nitrogen numeric(6,1),
  phosphorus numeric(6,1),
  potassium numeric(6,1),
  remarks text,
  created_at timestamptz not null default now()
);

create table public.lcc_readings (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  recorded_by uuid not null default auth.uid(),
  tested_on date not null default current_date,
  crop text not null,
  leaf_score int not null check (leaf_score between 1 and 6),
  advice text,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.soil_tests to authenticated;
grant select, insert, update, delete on public.lcc_readings to authenticated;
grant all on public.soil_tests to service_role;
grant all on public.lcc_readings to service_role;

alter table public.soil_tests enable row level security;
alter table public.lcc_readings enable row level security;

create policy "Farmers see their soil tests" on public.soil_tests
  for select to authenticated using (farmer_id = auth.uid());
create policy "CRPs manage soil tests" on public.soil_tests
  for all to authenticated
  using (public.has_role(auth.uid(), 'crp'))
  with check (public.has_role(auth.uid(), 'crp'));

create policy "Farmers see their LCC readings" on public.lcc_readings
  for select to authenticated using (farmer_id = auth.uid());
create policy "CRPs manage LCC readings" on public.lcc_readings
  for all to authenticated
  using (public.has_role(auth.uid(), 'crp'))
  with check (public.has_role(auth.uid(), 'crp'));

-- Natural farming schedules (set by CRP) ----------------------------------
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.profiles(id) on delete cascade,
  method text not null,
  title text not null,
  details text,
  scheduled_on date not null,
  scheduled_time time not null default '07:00',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create index schedules_date_idx on public.schedules (scheduled_on);

grant select, insert, update, delete on public.schedules to authenticated;
grant all on public.schedules to service_role;

alter table public.schedules enable row level security;

create policy "Farmers see their own and common schedules" on public.schedules
  for select to authenticated
  using (farmer_id = auth.uid() or (farmer_id is null and public.has_role(auth.uid(), 'farmer')));
create policy "CRPs manage schedules" on public.schedules
  for all to authenticated
  using (public.has_role(auth.uid(), 'crp'))
  with check (public.has_role(auth.uid(), 'crp'));

insert into public.schedules (method, title, details, scheduled_on, scheduled_time) values
  ('beejamrutham', 'Seed treatment with Beejamrutham',
   'Soak seeds in Beejamrutham for 30 minutes, dry in shade and sow the same day.',
   current_date + 1, '06:30'),
  ('ghanajeevamrutham', 'Apply Ghanajeevamrutham',
   'Spread 200 kg per acre of dried Ghanajeevamrutham before the last ploughing.',
   current_date + 3, '07:00'),
  ('jeevamrutham', 'Jeevamrutham with irrigation',
   'Mix 200 litres of Jeevamrutham per acre with irrigation water.',
   current_date + 7, '06:00'),
  ('neemastram', 'Neemastram spray for sucking pests',
   'Spray undiluted Neemastram in the evening when aphids or jassids are seen.',
   current_date + 10, '17:00'),
  ('jeevamrutham', 'Jeevamrutham foliar spray',
   '10 litres of filtered Jeevamrutham in 100 litres of water per acre.',
   current_date + 14, '06:30'),
  ('agniastram', 'Agniastram for stem borer',
   '2.5 litres of Agniastram in 100 litres of water per acre.',
   current_date + 21, '16:30');
