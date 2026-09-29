-- One private reference video per scheduled workout day. A new object path is
-- used for replacements so a failed upload cannot overwrite the old video.
create table public.workout_reference_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid not null unique,
  storage_path text not null unique,
  original_name varchar(255) not null check (length(trim(original_name)) > 0),
  mime_type varchar(20) not null check (mime_type in ('video/mp4', 'video/webm')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 52428800),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workout_day_id, user_id) references public.workout_days(id, user_id) on delete cascade,
  check (split_part(storage_path, '/', 1) = user_id::text),
  check (split_part(storage_path, '/', 2) = workout_day_id::text)
);
create index workout_reference_videos_user_day on public.workout_reference_videos(user_id, workout_day_id);
create trigger workout_reference_videos_updated before update on public.workout_reference_videos
for each row execute function public.forge_touch_updated_at();

alter table public.workout_reference_videos enable row level security;
create policy owner_all on public.workout_reference_videos for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workout-reference-videos', 'workout-reference-videos', false, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy forge_video_read on storage.objects for select to authenticated
using (bucket_id = 'workout-reference-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_video_insert on storage.objects for insert to authenticated
with check (bucket_id = 'workout-reference-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_video_delete on storage.objects for delete to authenticated
using (bucket_id = 'workout-reference-videos' and (storage.foldername(name))[1] = (select auth.uid())::text);
