-- New accounts choose nutrition targets in onboarding. The seeded workout
-- remains available as a fallback, but Runo's targets are not universal.
-- Existing targets are preserved because they may have been intentionally edited.
create or replace function public.forge_seed_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_program_id uuid;
begin
  insert into public.profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if exists (select 1 from public.workout_programs where user_id = p_user_id) then
    return;
  end if;

  insert into public.workout_programs (user_id, name, description, active)
  values (p_user_id, 'Forge training plan', 'Five training days and two recovery days.', true)
  returning id into v_program_id;

  insert into public.workout_days
    (user_id, program_id, day_of_week, name, estimated_minutes_min, estimated_minutes_max, is_rest_day, sort_order)
  values
    (p_user_id, v_program_id, 1, 'Back + Biceps + Forearms', 85, 110, false, 1),
    (p_user_id, v_program_id, 2, 'Recovery', null, null, true, 2),
    (p_user_id, v_program_id, 3, 'Chest + Shoulders + Triceps', 85, 110, false, 3),
    (p_user_id, v_program_id, 4, 'Recovery', null, null, true, 4),
    (p_user_id, v_program_id, 5, 'Legs + Abs', 85, 110, false, 5),
    (p_user_id, v_program_id, 6, 'Back + Biceps + Forearms', 85, 110, false, 6),
    (p_user_id, v_program_id, 7, 'Chest + Shoulders + Triceps', 85, 110, false, 7);

  insert into public.exercises (user_id, name)
  select p_user_id, seed.name from (values
    ('Weighted Pull-ups'), ('Chest-Supported Row'), ('Lat Pulldown'),
    ('Incline Dumbbell Curl'), ('Preacher Curl / Cable Curl'), ('Reverse Curl'),
    ('Wrist Curl / Reverse Wrist Curl'), ('Incline Barbell / Dumbbell Press'),
    ('Flat Dumbbell Press'), ('Cable Lateral Raise'), ('Rear Delt Fly'),
    ('Overhead Triceps Extension'), ('Cable Pushdown'), ('Dips'),
    ('Back Squat'), ('Romanian Deadlift'), ('Bulgarian Split Squat'),
    ('Leg Curl'), ('Standing Calf Raise'), ('Hanging Leg Raise'),
    ('Cable Crunch'), ('Chin-up / Neutral-Grip Pull-up'), ('Barbell Row'),
    ('Single-Arm Cable Row'), ('EZ-Bar Curl'), ('Hammer Curl'),
    ('Farmer''s Carry / Wrist Roller'), ('Incline Dumbbell Press'),
    ('Upright Dips'), ('Cable / Machine Fly'), ('Reverse Pec Deck'),
    ('Skull Crusher / Overhead Cable Extension'), ('Rope Pushdown')
  ) as seed(name)
  on conflict (user_id, name) do nothing;

  insert into public.program_exercises
    (user_id, workout_day_id, exercise_id, sort_order, target_sets, min_reps, max_reps,
     rest_seconds_min, rest_seconds_max, notes)
  select p_user_id, day.id, exercise.id, plan.position, plan.sets, plan.min_reps,
    plan.max_reps, plan.rest_seconds, plan.rest_seconds, 'Provisional prescription; replace from original workout specification.'
  from (values
    (1, 1, 'Weighted Pull-ups', 3, 6, 10, 180),
    (1, 2, 'Chest-Supported Row', 3, 8, 12, 150),
    (1, 3, 'Lat Pulldown', 3, 8, 12, 120),
    (1, 4, 'Incline Dumbbell Curl', 3, 8, 12, 90),
    (1, 5, 'Preacher Curl / Cable Curl', 3, 8, 12, 90),
    (1, 6, 'Reverse Curl', 3, 10, 15, 75),
    (1, 7, 'Wrist Curl / Reverse Wrist Curl', 3, 12, 20, 60),
    (3, 1, 'Incline Barbell / Dumbbell Press', 3, 6, 10, 180),
    (3, 2, 'Flat Dumbbell Press', 3, 8, 12, 150),
    (3, 3, 'Cable Lateral Raise', 3, 12, 20, 75),
    (3, 4, 'Rear Delt Fly', 3, 12, 20, 75),
    (3, 5, 'Overhead Triceps Extension', 3, 8, 12, 90),
    (3, 6, 'Cable Pushdown', 3, 10, 15, 75),
    (3, 7, 'Dips', 3, 6, 12, 120),
    (5, 1, 'Back Squat', 3, 6, 10, 180),
    (5, 2, 'Romanian Deadlift', 3, 6, 10, 180),
    (5, 3, 'Bulgarian Split Squat', 3, 8, 12, 150),
    (5, 4, 'Leg Curl', 3, 10, 15, 90),
    (5, 5, 'Standing Calf Raise', 3, 12, 20, 75),
    (5, 6, 'Hanging Leg Raise', 3, 10, 15, 75),
    (5, 7, 'Cable Crunch', 3, 10, 15, 75),
    (6, 1, 'Chin-up / Neutral-Grip Pull-up', 3, 6, 10, 180),
    (6, 2, 'Barbell Row', 3, 6, 10, 180),
    (6, 3, 'Single-Arm Cable Row', 3, 8, 12, 120),
    (6, 4, 'EZ-Bar Curl', 3, 8, 12, 90),
    (6, 5, 'Hammer Curl', 3, 8, 12, 90),
    (6, 6, 'Reverse Curl', 3, 10, 15, 75),
    (6, 7, 'Farmer''s Carry / Wrist Roller', 3, 10, 20, 90),
    (7, 1, 'Incline Dumbbell Press', 3, 8, 12, 150),
    (7, 2, 'Upright Dips', 3, 6, 12, 120),
    (7, 3, 'Cable / Machine Fly', 3, 10, 15, 90),
    (7, 4, 'Cable Lateral Raise', 3, 12, 20, 75),
    (7, 5, 'Reverse Pec Deck', 3, 12, 20, 75),
    (7, 6, 'Skull Crusher / Overhead Cable Extension', 3, 8, 12, 90),
    (7, 7, 'Rope Pushdown', 3, 10, 15, 75)
  ) as plan(day_of_week, position, exercise_name, sets, min_reps, max_reps, rest_seconds)
  join public.workout_days day on day.program_id = v_program_id and day.day_of_week = plan.day_of_week
  join public.exercises exercise on exercise.user_id = p_user_id and exercise.name = plan.exercise_name;
end;
$$;
revoke all on function public.forge_seed_user(uuid) from public, anon, authenticated;
