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
