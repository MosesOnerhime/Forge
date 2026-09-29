-- Run after local_db_bootstrap.sql and the migration, in a disposable DB.
insert into auth.users (id,email) values
  ('11111111-1111-4111-8111-111111111111','first@example.test'),
  ('22222222-2222-4222-8222-222222222222','second@example.test');

do $$
begin
  if (select count(*) from public.workout_days) <> 14 then
    raise exception 'Expected 7 seeded days per user';
  end if;
  if (select count(*) from public.program_exercises) <> 70 then
    raise exception 'Expected 35 seeded exercises per user';
  end if;
  if (select count(*) from public.nutrition_targets) <> 2 then
    raise exception 'Expected a nutrition target per user';
  end if;
  if (select count(*) from public.profiles where onboarding_completed_at is null) <> 2 then
    raise exception 'Expected new users to need onboarding';
  end if;
  if (select count(*) from public.profiles where default_rest_seconds = 120 and timer_notifications = false) <> 2 then
    raise exception 'Expected default timer preferences for new users';
  end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'workout-reference-videos' and not public
      and file_size_limit = 52428800
      and allowed_mime_types = array['video/mp4', 'video/webm']
  ) then raise exception 'Private workout video bucket is missing or misconfigured'; end if;
  if not exists (
    select 1 from storage.buckets
    where id = 'exercise-reference-media' and not public
      and file_size_limit = 52428800
      and allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
  ) then raise exception 'Private exercise media bucket is missing or misconfigured'; end if;
end;
$$;

grant usage on schema public, auth, storage to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
alter table storage.objects enable row level security;

set role authenticated;
set forge.test_user_id = '11111111-1111-4111-8111-111111111111';
do $$
begin
  if (select count(*) from public.workout_days) <> 7 then
    raise exception 'RLS leaked another user''s workout days';
  end if;
  if (select count(*) from public.program_exercises) <> 35 then
    raise exception 'RLS leaked another user''s exercise plan';
  end if;
  if (select count(*) from public.nutrition_targets) <> 1 then
    raise exception 'RLS leaked another user''s nutrition targets';
  end if;
end;
$$;

-- The app's setup RPC must be safe to call repeatedly.
select public.forge_ensure_user_setup();
select public.forge_ensure_user_setup();
do $$
begin
  if (select count(*) from public.workout_programs) <> 1 then
    raise exception 'Setup RPC created a duplicate program';
  end if;
end;
$$;

-- The owner can complete onboarding without changing another account.
update public.profiles set onboarding_completed_at = now() where user_id = auth.uid();
update public.profiles set default_rest_seconds = 90, timer_notifications = true where user_id = auth.uid();
update public.profiles set display_name = 'First user' where user_id = auth.uid();
do $$
begin
  if (select count(*) from public.profiles where onboarding_completed_at is not null) <> 1 then
    raise exception 'Onboarding completion did not persist for the owner';
  end if;
  if (select count(*) from public.profiles where default_rest_seconds = 90 and timer_notifications = true) <> 1 then
    raise exception 'Timer preferences did not persist through a profile edit';
  end if;
end;
$$;

-- A routine exercise can move to a different training day without breaking
-- the owner scope or the destination's unique ordering.
do $$
declare item_id uuid; target_day_id uuid; next_order integer;
begin
  select pe.id into item_id
  from public.program_exercises pe
  join public.workout_days day on day.id = pe.workout_day_id
  where day.day_of_week = 1 order by pe.sort_order limit 1;
  select id into target_day_id from public.workout_days where day_of_week = 3;
  select coalesce(max(sort_order),0)+1 into next_order
  from public.program_exercises where workout_day_id = target_day_id;
  update public.program_exercises
  set workout_day_id = target_day_id, sort_order = next_order
  where id = item_id;
  if not found or (select workout_day_id from public.program_exercises where id = item_id) <> target_day_id then
    raise exception 'Routine day reassignment failed';
  end if;
end;
$$;

-- Routine swaps are adjacent, owner scoped, and leave the plan unchanged when
-- a database failure interrupts the middle of the swap.
do $$
declare owner_day_id uuid; item_id uuid; neighbor_id uuid; foreign_item_id uuid;
begin
  select id into owner_day_id from public.workout_days where day_of_week = 1;
  select id into item_id from public.program_exercises where workout_day_id = owner_day_id and sort_order = 3;
  select id into neighbor_id from public.program_exercises where workout_day_id = owner_day_id and sort_order = 2;
  if not public.forge_reorder_program_exercise(item_id, -1) then
    raise exception 'Routine reorder did not move an exercise up';
  end if;
  if (select sort_order from public.program_exercises where id = item_id) <> 2
    or (select sort_order from public.program_exercises where id = neighbor_id) <> 3 then
    raise exception 'Routine reorder did not swap adjacent exercises';
  end if;
  if not public.forge_reorder_program_exercise(item_id, 1) then
    raise exception 'Routine reorder did not move an exercise down';
  end if;
  if (select sort_order from public.program_exercises where id = item_id) <> 3
    or (select sort_order from public.program_exercises where id = neighbor_id) <> 2 then
    raise exception 'Reverse routine reorder did not restore positions';
  end if;
  if public.forge_reorder_program_exercise(neighbor_id, -1) then
    raise exception 'Routine reorder crossed the top boundary';
  end if;
  begin
    perform public.forge_reorder_program_exercise(item_id, 0);
    raise exception 'Invalid reorder direction was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Direction must be -1 or 1' then raise; end if;
  end;
  begin
    perform public.forge_reorder_program_exercise(item_id, null);
    raise exception 'Null reorder direction was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Direction must be -1 or 1' then raise; end if;
  end;
  perform set_config('forge.test_user_id', '22222222-2222-4222-8222-222222222222', true);
  select id into foreign_item_id from public.program_exercises
  where user_id = '22222222-2222-4222-8222-222222222222' limit 1;
  perform set_config('forge.test_user_id', '11111111-1111-4111-8111-111111111111', true);
  if foreign_item_id is null then raise exception 'Cross-owner reorder fixture is missing'; end if;
  begin
    perform public.forge_reorder_program_exercise(foreign_item_id, 1);
    raise exception 'Cross-owner routine reorder was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Exercise is not in your routine' then raise; end if;
  end;
end;
$$;

reset role;


create function public.forge_test_fail_reorder() returns trigger
language plpgsql as $$
begin
  if old.sort_order = 2 and new.sort_order = 3 then
    raise exception 'Injected reorder failure';
  end if;
  return new;
end;
$$;
create trigger forge_test_fail_reorder before update on public.program_exercises
for each row execute function public.forge_test_fail_reorder();
set role authenticated;
do $$
declare owner_day_id uuid; item_id uuid; neighbor_id uuid;
begin
  select id into owner_day_id from public.workout_days where day_of_week = 1;
  select id into item_id from public.program_exercises where workout_day_id = owner_day_id and sort_order = 3;
  select id into neighbor_id from public.program_exercises where workout_day_id = owner_day_id and sort_order = 2;
  begin
    perform public.forge_reorder_program_exercise(item_id, -1);
    raise exception 'Injected failure did not interrupt reorder';
  exception when raise_exception then
    if sqlerrm <> 'Injected reorder failure' then raise; end if;
  end;
  if (select sort_order from public.program_exercises where id = item_id) <> 3
    or (select sort_order from public.program_exercises where id = neighbor_id) <> 2 then
    raise exception 'Failed routine reorder changed exercise order';
  end if;
end;
$$;
reset role;
drop trigger forge_test_fail_reorder on public.program_exercises;
drop function public.forge_test_fail_reorder();
set role authenticated;

-- Previous-performance RPC must return the latest completed occurrence.
insert into public.workout_sessions (id,user_id,workout_day_id,started_at,completed_at,status)
select '44444444-4444-4444-8444-444444444444', auth.uid(), id,
  '2026-09-01 10:00:00+00', '2026-09-01 11:00:00+00', 'completed'
from public.workout_days where day_of_week = 1 limit 1;
insert into public.workout_sessions (id,user_id,workout_day_id,started_at,status)
select '55555555-5555-4555-8555-555555555555', auth.uid(), id,
  '2026-09-08 10:00:00+00', 'active'
from public.workout_days where day_of_week = 1 limit 1;
insert into public.workout_sessions (id,user_id,workout_day_id,started_at,completed_at,status)
select '88888888-8888-4888-8888-888888888888', auth.uid(), id,
  '2026-09-05 10:00:00+00', '2026-09-05 11:00:00+00', 'completed'
from public.workout_days where day_of_week = 1 limit 1;
insert into public.session_exercises (id,user_id,session_id,exercise_id,sort_order,target_sets,min_reps,max_reps,rest_seconds)
select '66666666-6666-4666-8666-666666666666', auth.uid(),
  '44444444-4444-4444-8444-444444444444', id, 1, 3, 6, 10, 180
from public.exercises where name = 'Weighted Pull-ups' limit 1;
insert into public.session_exercises (id,user_id,session_id,exercise_id,sort_order,target_sets,min_reps,max_reps,rest_seconds)
select '77777777-7777-4777-8777-777777777777', auth.uid(),
  '55555555-5555-4555-8555-555555555555', id, 1, 3, 6, 10, 180
from public.exercises where name = 'Weighted Pull-ups' limit 1;
insert into public.session_exercises (id,user_id,session_id,exercise_id,sort_order,target_sets,min_reps,max_reps,rest_seconds)
select '99999999-9999-4999-8999-999999999999', auth.uid(),
  '88888888-8888-4888-8888-888888888888', id, 1, 3, 6, 10, 180
from public.exercises where name = 'Weighted Pull-ups' limit 1;
insert into public.workout_sets (user_id,session_exercise_id,set_number,weight_kg,reps,rir,completed,completed_at)
values (auth.uid(),'66666666-6666-4666-8666-666666666666',1,20,8,2,true,'2026-09-01 10:10:00+00');
insert into public.workout_sets (user_id,session_exercise_id,set_number,weight_kg,reps,rir,completed,completed_at)
values (auth.uid(),'99999999-9999-4999-8999-999999999999',1,12,8,2,true,'2026-09-05 10:10:00+00');
do $$
begin
  if (select count(*) from public.forge_previous_sets('55555555-5555-4555-8555-555555555555')) <> 1 then
    raise exception 'Previous-performance RPC did not return the last set';
  end if;
  if (select weight_kg from public.forge_previous_sets('55555555-5555-4555-8555-555555555555')) <> 12 then
    raise exception 'Previous-performance RPC did not return the latest completed session';
  end if;
  if (select best_volume_kg from public.forge_previous_sets('55555555-5555-4555-8555-555555555555')) <> 160 then
    raise exception 'Previous-performance RPC did not return the all-time best volume';
  end if;
end;
$$;
set forge.test_user_id = '22222222-2222-4222-8222-222222222222';
-- Start is atomic and idempotent, including across a duplicate request.
do $$
declare training_day_id uuid; rest_day_id uuid; empty_day_id uuid; first_session uuid; second_session uuid;
begin
  select id into training_day_id from public.workout_days where day_of_week = 1;
  select id into rest_day_id from public.workout_days where day_of_week = 2;
  select id into empty_day_id from public.workout_days where day_of_week = 3;
  begin
    perform public.forge_start_workout(rest_day_id);
    raise exception 'Rest day was accepted';
  exception when raise_exception then
    if sqlerrm <> 'Choose a training day in your active program' then raise; end if;
  end;
  first_session := public.forge_start_workout(training_day_id);
  second_session := public.forge_start_workout(training_day_id);
  if first_session is null or second_session <> first_session then
    raise exception 'Duplicate start created another session';
  end if;
  if (select count(*) from public.session_exercises where session_id = first_session)
      <> (select count(*) from public.program_exercises where workout_day_id = training_day_id) then
    raise exception 'Workout start did not copy the full plan';
  end if;
  begin
    insert into public.workout_sessions (user_id,workout_day_id) values (auth.uid(),training_day_id);
    raise exception 'Duplicate active session was accepted';
  exception when unique_violation then null;
  end;
  -- Roll back this probe's temporary plan deletion after proving that an
  -- empty plan leaves no half-created session behind.
  begin
    update public.workout_sessions set status = 'completed', completed_at = now() where id = first_session;
    delete from public.program_exercises where workout_day_id = empty_day_id;
    begin
      perform public.forge_start_workout(empty_day_id);
      raise exception 'Empty plan was accepted';
    exception when raise_exception then
      if sqlerrm <> 'This day has no exercises. Add them before starting' then raise; end if;
    end;
    if exists (select 1 from public.workout_sessions where status = 'active') then
      raise exception 'Failed start left an active session';
    end if;
    raise exception 'Empty-plan probe complete';
  exception when raise_exception then
    if sqlerrm <> 'Empty-plan probe complete' then raise; end if;
  end;
  if (select status from public.workout_sessions where id = first_session) <> 'active' then
    raise exception 'Probe did not restore the prior active session';
  end if;
end;
$$;
do $$
begin
  if (select count(*) from public.forge_previous_sets('55555555-5555-4555-8555-555555555555')) <> 0 then
    raise exception 'Previous-performance RPC leaked another user''s session';
  end if;
end;
$$;
set forge.test_user_id = '11111111-1111-4111-8111-111111111111';

-- Deliberately reference a food belonging to the other user. Composite FKs
-- must reject it even if a client tries to submit a forged foreign key.
reset role;

-- Populate every private table for both accounts, then exercise each RLS
-- policy as the first account. Seeded rows alone leave several tables empty.
insert into public.goals (user_id, name)
select id, 'RLS probe goal' from auth.users;
insert into public.workout_sessions (user_id, workout_day_id, status, completed_at, notes)
select day.user_id, day.id, 'completed', now(), 'RLS probe session'
from public.workout_days day where day.day_of_week = 1;
insert into public.session_exercises
  (user_id, session_id, exercise_id, sort_order, target_sets, min_reps, max_reps, rest_seconds)
select session.user_id, session.id, exercise.id, 1, 1, 1, 10, 60
from public.workout_sessions session
join public.exercises exercise on exercise.user_id = session.user_id and exercise.name = 'Weighted Pull-ups'
where session.notes = 'RLS probe session';
insert into public.workout_sets
  (user_id, session_exercise_id, set_number, weight_kg, reps, completed, completed_at)
select exercise.user_id, exercise.id, 1, 10, 5, true, now()
from public.session_exercises exercise
join public.workout_sessions session on session.id = exercise.session_id
where session.notes = 'RLS probe session';
insert into public.foods (user_id, name, serving_description, calories, protein_g, carbs_g, fat_g)
select id, 'RLS probe food', '1 serving', 100, 5, 10, 4 from auth.users;
insert into public.food_entries
  (user_id, food_id, logged_date, meal_type, calories, protein_g, carbs_g, fat_g)
select food.user_id, food.id, current_date, 'lunch', 100, 5, 10, 4
from public.foods food where food.name = 'RLS probe food';
insert into public.body_measurements (user_id, measured_at, weight_kg)
select id, current_date, 75 from auth.users;
insert into public.progress_photos (user_id, photo_date, view_type, storage_path)
select id, current_date, 'front', id::text || '/rls-probe.jpg' from auth.users;
insert into public.workout_reference_videos
  (user_id, workout_day_id, storage_path, original_name, mime_type, file_size_bytes)
select day.user_id, day.id, day.user_id::text || '/' || day.id::text || '/rls-probe.mp4',
  'RLS probe.mp4', 'video/mp4', 1024
from public.workout_days day where day.day_of_week = 1;
insert into public.exercise_reference_media
  (user_id, exercise_id, storage_path, original_name, mime_type, file_size_bytes)
select exercise.user_id, exercise.id, exercise.user_id::text || '/' || exercise.id::text || '/rls-probe.jpg',
  'RLS probe.jpg', 'image/jpeg', 1024
from public.exercises exercise where exercise.name = 'Weighted Pull-ups';
insert into public.journal_entries (user_id, entry_date, content)
select id, current_date, 'RLS probe entry' from auth.users;
insert into storage.objects (bucket_id, name)
select 'progress-photos', id::text || '/rls-probe.jpg' from auth.users;
insert into storage.objects (bucket_id, name)
select 'workout-reference-videos', storage_path from public.workout_reference_videos;
insert into storage.objects (bucket_id, name)
select 'exercise-reference-media', storage_path from public.exercise_reference_media;

set role authenticated;
set forge.test_user_id = '11111111-1111-4111-8111-111111111111';
do $$
declare table_name text; own_rows integer; foreign_rows integer; affected integer;
begin
  foreach table_name in array array[
    'profiles', 'goals', 'workout_programs', 'workout_days', 'exercises',
    'program_exercises', 'workout_sessions', 'session_exercises', 'workout_sets',
    'nutrition_targets', 'foods', 'food_entries', 'body_measurements',
    'progress_photos', 'workout_reference_videos', 'exercise_reference_media', 'journal_entries'
  ] loop
    if not exists (
      select 1 from pg_class relation
      join pg_namespace schema on schema.oid = relation.relnamespace
      where schema.nspname = 'public' and relation.relname = table_name
        and relation.relrowsecurity
    ) then raise exception 'RLS disabled on %', table_name; end if;

    execute format('select count(*) from public.%I where user_id = auth.uid()', table_name) into own_rows;
    execute format('select count(*) from public.%I where user_id <> auth.uid()', table_name) into foreign_rows;
    if own_rows = 0 or foreign_rows <> 0 then
      raise exception 'RLS read isolation failed on %: own %, foreign %', table_name, own_rows, foreign_rows;
    end if;

    execute format('update public.%I set user_id = user_id where user_id <> auth.uid()', table_name);
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'RLS update isolation failed on %', table_name; end if;
    execute format('delete from public.%I where user_id <> auth.uid()', table_name);
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'RLS delete isolation failed on %', table_name; end if;
  end loop;

  begin
    insert into public.goals (user_id, name)
    values ('22222222-2222-4222-8222-222222222222', 'Forged owner');
    raise exception 'RLS accepted a forged-owner insert';
  exception when insufficient_privilege then null;
  end;

  if (select count(*) from storage.objects where bucket_id = 'progress-photos') <> 1 then
    raise exception 'Private Storage read isolation failed';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'workout-reference-videos') <> 1 then
    raise exception 'Private workout video read isolation failed';
  end if;
  if (select count(*) from storage.objects where bucket_id = 'exercise-reference-media') <> 1 then
    raise exception 'Private exercise media read isolation failed';
  end if;
  delete from storage.objects where name = '22222222-2222-4222-8222-222222222222/rls-probe.jpg';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Private Storage delete isolation failed'; end if;
  delete from storage.objects where bucket_id = 'workout-reference-videos'
    and name like '22222222-2222-4222-8222-222222222222/%';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Private workout video delete isolation failed'; end if;
  delete from storage.objects where bucket_id = 'exercise-reference-media'
    and name like '22222222-2222-4222-8222-222222222222/%';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Private exercise media delete isolation failed'; end if;
  begin
    insert into storage.objects (bucket_id, name)
    values ('progress-photos', '22222222-2222-4222-8222-222222222222/forged.jpg');
    raise exception 'Private Storage accepted a forged-owner insert';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('workout-reference-videos', '22222222-2222-4222-8222-222222222222/forged/video.mp4');
    raise exception 'Private workout video bucket accepted a forged-owner insert';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('exercise-reference-media', '22222222-2222-4222-8222-222222222222/forged/image.jpg');
    raise exception 'Private exercise media bucket accepted a forged-owner insert';
  exception when insufficient_privilege then null;
  end;
end;
$$;
do $$
declare foreign_day_id uuid;
begin
  perform set_config('forge.test_user_id', '22222222-2222-4222-8222-222222222222', true);
  select id into foreign_day_id from public.workout_days where day_of_week = 1;
  delete from public.workout_reference_videos where workout_day_id = foreign_day_id;
  perform set_config('forge.test_user_id', '11111111-1111-4111-8111-111111111111', true);
  if foreign_day_id is null then raise exception 'Cross-owner video fixture is missing'; end if;
  begin
    insert into public.workout_reference_videos
      (user_id, workout_day_id, storage_path, original_name, mime_type, file_size_bytes)
    values (
      '11111111-1111-4111-8111-111111111111', foreign_day_id,
      '11111111-1111-4111-8111-111111111111/' || foreign_day_id::text || '/forged.mp4',
      'forged.mp4', 'video/mp4', 1024
    );
    raise exception 'Cross-owner workout video attachment was accepted';
  exception when foreign_key_violation then null;
  end;
end;
$$;
do $$
declare foreign_exercise_id uuid;
begin
  perform set_config('forge.test_user_id', '22222222-2222-4222-8222-222222222222', true);
  select id into foreign_exercise_id from public.exercises where name = 'Weighted Pull-ups';
  perform set_config('forge.test_user_id', '11111111-1111-4111-8111-111111111111', true);
  if foreign_exercise_id is null then raise exception 'Cross-owner exercise fixture is missing'; end if;
  begin
    insert into public.exercise_reference_media
      (user_id, exercise_id, storage_path, original_name, mime_type, file_size_bytes)
    values ('11111111-1111-4111-8111-111111111111', foreign_exercise_id,
      '11111111-1111-4111-8111-111111111111/' || foreign_exercise_id::text || '/forged.jpg',
      'forged.jpg', 'image/jpeg', 1024);
    raise exception 'Cross-owner exercise reference was accepted';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;
insert into public.foods (id,user_id,name,serving_description,calories,protein_g,carbs_g,fat_g)
values ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222','Other food','1 serving',100,10,10,2);
set role authenticated;
do $$
begin
  begin
    insert into public.food_entries (user_id,food_id,logged_date,meal_type,calories,protein_g,carbs_g,fat_g)
    values ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333',current_date,'lunch',100,10,10,2);
    raise exception 'Cross-owner food link was accepted';
  exception when foreign_key_violation then null;
  end;
end;
$$;
reset role;

-- Templates must copy a full week atomically, preserve historical day links,
-- and never expose one owner's saved plan to another owner.
set role authenticated;
set forge.test_user_id = '11111111-1111-4111-8111-111111111111';
do $$
declare saved_id uuid; mom_id uuid; old_program uuid; old_day uuid; new_program uuid;
begin
  if (select count(*) from public.routine_templates) <> 3 then
    raise exception 'Expected three built-in routine templates';
  end if;
  if (select sum(jsonb_array_length(day->'exercises'))
      from public.routine_templates t, jsonb_array_elements(t.days) day
      where t.name = 'Runo''s Workout Routine') <> 35
    or (select sum(jsonb_array_length(day->'exercises'))
      from public.routine_templates t, jsonb_array_elements(t.days) day
      where t.name = 'Build from scratch') <> 0 then
    raise exception 'Built-in routine content is incomplete';
  end if;
  select id into old_program from public.workout_programs where active;
  select id into old_day from public.workout_days where program_id = old_program and day_of_week = 1;
  saved_id := public.forge_save_routine_template('My copy', 'Owner-only snapshot');
  if (select jsonb_array_length(days) from public.routine_templates where id = saved_id) <> 7 then
    raise exception 'Saved routine snapshot lacks seven days';
  end if;
  update public.workout_sessions set status = 'cancelled'
    where user_id = auth.uid() and status = 'active';
  insert into public.workout_sessions (user_id, workout_day_id)
    values (auth.uid(), old_day);
  select id into mom_id from public.routine_templates where name = 'Mom''s Starter Routine';
  begin
    perform public.forge_apply_routine_template(mom_id);
    raise exception 'Switched routine during an active workout';
  exception when raise_exception then
    if sqlerrm <> 'Finish or cancel your active workout before changing routines' then raise; end if;
  end;
  update public.workout_sessions set status = 'cancelled' where workout_day_id = old_day and status = 'active';
  new_program := public.forge_apply_routine_template(mom_id);
  if (select count(*) from public.workout_days where program_id = new_program) <> 7
    or (select count(*) from public.program_exercises pe join public.workout_days d on d.id = pe.workout_day_id where d.program_id = new_program) <> 13
    or (select count(*) from public.workout_programs where active) <> 1 then
    raise exception 'Mom routine did not load as a complete active week';
  end if;
  if not exists (select 1 from public.workout_sessions where workout_day_id = old_day)
    or not exists (select 1 from public.workout_programs where id = old_program and not active) then
    raise exception 'Template switch damaged workout history';
  end if;
  if public.forge_apply_routine_template(mom_id, true) <> new_program then
    raise exception 'Onboarding retry did not reuse the selected program';
  end if;
  perform public.forge_apply_routine_template(saved_id);
  if (select count(*) from public.program_exercises pe join public.workout_days d
      on d.id = pe.workout_day_id join public.workout_programs p on p.id = d.program_id
      where p.active) <> 35 then
    raise exception 'Saved private routine did not reload its exercises';
  end if;
  perform set_config('forge.test_user_id', '22222222-2222-4222-8222-222222222222', true);
  if exists (select 1 from public.routine_templates where id = saved_id) then
    raise exception 'Another owner can read a private template';
  end if;
  begin
    perform public.forge_apply_routine_template(saved_id);
    raise exception 'Another owner applied a private template';
  exception when raise_exception then
    if sqlerrm <> 'Template not found' then raise; end if;
  end;
end;
$$;
reset role;
