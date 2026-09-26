-- 05_storage_avatars.sql — public "avatars" bucket; each user writes only to <auth.uid()>/...
--
-- Public bucket = anyone can GET a file by its public URL (needed for <img src>).
-- Writing, overwriting, deleting and listing all go through the policies below.
-- The bucket limits are enforced by the server, so a client that skips the
-- in-app validation is still refused.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576,  -- 1 MB
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- (storage.foldername(name))[1] is the first path segment: for "abc-123/avatar"
-- it is "abc-123". Every policy requires it to equal the caller's user id, so a
-- user can never touch another user's folder or a file at the bucket root.
--
-- upload(..., { upsert: true }) needs INSERT (first upload), plus SELECT and
-- UPDATE (overwrite). Without all three, re-uploading fails.

create policy "avatars: select own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars: delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
