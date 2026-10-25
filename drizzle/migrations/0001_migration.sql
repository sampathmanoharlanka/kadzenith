-- Profile photos live in the private "avatars" bucket under <user id>/...
create policy "Signed in users can view profile photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "Users upload their own profile photo"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users replace their own profile photo"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users remove their own profile photo"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
