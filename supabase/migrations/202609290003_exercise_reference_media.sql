-- Private images and videos attached to an exercise, visible wherever that
-- exercise appears in a plan or workout. A path belongs to one owner/exercise.
create table public.exercise_reference_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null,
  storage_path text not null unique,
  original_name varchar(255) not null check (length(trim(original_name)) > 0),
  mime_type varchar(20) not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 52428800),
  created_at timestamptz not null default now(),
  foreign key (exercise_id, user_id) references public.exercises(id, user_id) on delete cascade,
  check (split_part(storage_path, '/', 1) = user_id::text),
  check (split_part(storage_path, '/', 2) = exercise_id::text),
  check (mime_type not like 'image/%' or file_size_bytes <= 10485760)
);
create index exercise_reference_media_exercise_created on public.exercise_reference_media(exercise_id, created_at desc);
alter table public.exercise_reference_media enable row level security;
create policy owner_all on public.exercise_reference_media for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-reference-media', 'exercise-reference-media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy forge_exercise_media_read on storage.objects for select to authenticated
using (bucket_id = 'exercise-reference-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_exercise_media_insert on storage.objects for insert to authenticated
with check (bucket_id = 'exercise-reference-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_exercise_media_delete on storage.objects for delete to authenticated
using (bucket_id = 'exercise-reference-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
