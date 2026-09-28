-- Forge V1. Every application row carries user_id; composite foreign keys keep
-- child rows attached to a parent owned by the same authenticated user.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name varchar(100),
  units varchar(10) not null default 'metric' check (units in ('metric', 'imperial')),
  timezone varchar(50) not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(100) not null check (length(trim(name)) > 0),
  description text,
  start_date date,
  target_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(150) not null check (length(trim(name)) > 0),
  description text,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index one_active_program_per_user on public.workout_programs(user_id) where active;

create table public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null,
  day_of_week smallint not null check (day_of_week between 1 and 7),
  name varchar(150) not null,
  estimated_minutes_min integer check (estimated_minutes_min >= 0),
  estimated_minutes_max integer check (estimated_minutes_max >= estimated_minutes_min),
  is_rest_day boolean not null default false,
  sort_order integer not null check (sort_order >= 0),
  unique (id, user_id),
  unique (program_id, day_of_week),
  foreign key (program_id, user_id) references public.workout_programs(id, user_id) on delete cascade
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(150) not null check (length(trim(name)) > 0),
  primary_muscles text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment varchar(100),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

create table public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid not null,
  exercise_id uuid not null,
  sort_order integer not null check (sort_order >= 0),
  target_sets integer not null check (target_sets between 1 and 20),
  min_reps integer not null check (min_reps >= 0),
  max_reps integer not null check (max_reps >= min_reps),
  rest_seconds_min integer not null check (rest_seconds_min >= 0),
  rest_seconds_max integer not null check (rest_seconds_max >= rest_seconds_min),
  notes text,
  unique (id, user_id),
  unique (workout_day_id, sort_order),
  foreign key (workout_day_id, user_id) references public.workout_days(id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises(id, user_id)
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_day_id uuid,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status varchar(20) not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (workout_day_id, user_id) references public.workout_days(id, user_id)
);
create index workout_sessions_user_started on public.workout_sessions(user_id, started_at desc);
create unique index one_active_session_per_user on public.workout_sessions(user_id) where status = 'active';

create table public.session_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  exercise_id uuid not null,
  program_exercise_id uuid,
  sort_order integer not null check (sort_order >= 0),
  target_sets integer not null check (target_sets between 1 and 20),
  min_reps integer not null check (min_reps >= 0),
  max_reps integer not null check (max_reps >= min_reps),
  rest_seconds integer not null check (rest_seconds >= 0),
  notes text,
  skipped boolean not null default false,
  unique (id, user_id),
  unique (session_id, sort_order),
  foreign key (session_id, user_id) references public.workout_sessions(id, user_id) on delete cascade,
  foreign key (exercise_id, user_id) references public.exercises(id, user_id),
  foreign key (program_exercise_id, user_id) references public.program_exercises(id, user_id)
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_exercise_id uuid not null,
  set_number integer not null check (set_number between 1 and 50),
  weight_kg numeric(7,2) check (weight_kg >= 0),
  reps integer check (reps >= 0),
  rir numeric(3,1) check (rir between 0 and 10),
  completed boolean not null default false,
  completed_at timestamptz,
  notes text,
  unique (session_exercise_id, set_number),
  foreign key (session_exercise_id, user_id) references public.session_exercises(id, user_id) on delete cascade,
  check (not completed or (weight_kg is not null and reps is not null and completed_at is not null))
);
create index workout_sets_exercise_number on public.workout_sets(session_exercise_id, set_number);

create table public.nutrition_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null,
  calories integer not null check (calories >= 0),
  protein_g integer not null check (protein_g >= 0),
  carbs_g integer not null check (carbs_g >= 0),
  fat_g integer not null check (fat_g >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, effective_from)
);

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name varchar(150) not null check (length(trim(name)) > 0),
  serving_description varchar(100) not null,
  serving_grams numeric(8,2) check (serving_grams > 0),
  calories numeric(9,2) not null check (calories >= 0),
  protein_g numeric(9,2) not null check (protein_g >= 0),
  carbs_g numeric(9,2) not null check (carbs_g >= 0),
  fat_g numeric(9,2) not null check (fat_g >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null,
  logged_date date not null,
  meal_type varchar(30) not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snacks')),
  quantity numeric(8,2) not null default 1 check (quantity > 0),
  calories numeric(9,2) not null check (calories >= 0),
  protein_g numeric(9,2) not null check (protein_g >= 0),
  carbs_g numeric(9,2) not null check (carbs_g >= 0),
  fat_g numeric(9,2) not null check (fat_g >= 0),
  notes text,
  created_at timestamptz not null default now(),
  foreign key (food_id, user_id) references public.foods(id, user_id)
);
create index food_entries_user_date on public.food_entries(user_id, logged_date);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null,
  weight_kg numeric(6,2) check (weight_kg > 0),
  waist_cm numeric(6,2) check (waist_cm > 0),
  chest_cm numeric(6,2) check (chest_cm > 0),
  shoulders_cm numeric(6,2) check (shoulders_cm > 0),
  bicep_left_cm numeric(6,2) check (bicep_left_cm > 0),
  bicep_right_cm numeric(6,2) check (bicep_right_cm > 0),
  forearm_left_cm numeric(6,2) check (forearm_left_cm > 0),
  forearm_right_cm numeric(6,2) check (forearm_right_cm > 0),
  thigh_left_cm numeric(6,2) check (thigh_left_cm > 0),
  thigh_right_cm numeric(6,2) check (thigh_right_cm > 0),
  neck_cm numeric(6,2) check (neck_cm > 0),
  calf_left_cm numeric(6,2) check (calf_left_cm > 0),
  calf_right_cm numeric(6,2) check (calf_right_cm > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, measured_at)
);
create index body_measurements_user_date on public.body_measurements(user_id, measured_at desc);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_date date not null,
  view_type varchar(20) not null check (view_type in ('front', 'side', 'back', 'custom')),
  storage_path text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (storage_path),
  check (split_part(storage_path, '/', 1) = user_id::text)
);
create index progress_photos_user_date on public.progress_photos(user_id, photo_date desc);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  title varchar(200),
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.forge_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function public.forge_touch_updated_at();
create trigger programs_updated before update on public.workout_programs for each row execute function public.forge_touch_updated_at();
create trigger journal_updated before update on public.journal_entries for each row execute function public.forge_touch_updated_at();

-- The same owner policy applies to each table. Same-owner composite foreign
-- keys above prevent a user from attaching a visible child to another account.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles', 'goals', 'workout_programs', 'workout_days', 'exercises',
    'program_exercises', 'workout_sessions', 'session_exercises', 'workout_sets',
    'nutrition_targets', 'foods', 'food_entries', 'body_measurements',
    'progress_photos', 'journal_entries'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy owner_all on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      table_name
    );
  end loop;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('progress-photos', 'progress-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy forge_photo_read on storage.objects for select to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_photo_insert on storage.objects for insert to authenticated
with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy forge_photo_delete on storage.objects for delete to authenticated
using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Seeded prescriptions are provisional until the user's detailed workout
-- document supplies the exact sets, rep ranges, and rests (see DECISIONS.md).
create function public.forge_seed_user(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_program_id uuid;
begin
  insert into public.profiles (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.nutrition_targets (user_id, effective_from, calories, protein_g, carbs_g, fat_g)
  -- Start a day early so a signup west of UTC never has a future-only target.
  values (p_user_id, current_date - 1, 2900, 170, 375, 80)
  on conflict (user_id, effective_from) do nothing;

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

create function public.forge_on_auth_user_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.forge_seed_user(new.id);
  return new;
end;
$$;
create trigger forge_auth_user_created after insert on auth.users
for each row execute function public.forge_on_auth_user_created();

create function public.forge_ensure_user_setup()
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  perform public.forge_seed_user((select auth.uid()));
end;
$$;
revoke all on function public.forge_ensure_user_setup() from public, anon;
grant execute on function public.forge_ensure_user_setup() to authenticated;

-- Return the most recent completed occurrence of each exercise in a session.
-- The invoker's RLS and explicit auth.uid() scope keep this account-private.
create function public.forge_previous_sets(p_session_id uuid)
returns table (exercise_id uuid, set_number integer, weight_kg numeric, reps integer, rir numeric)
language sql stable security invoker set search_path = '' as $$
  with current_exercises as (
    select distinct se.exercise_id, ws.started_at
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id and ws.user_id = se.user_id
    where se.session_id = p_session_id and se.user_id = (select auth.uid())
  ), previous_exercises as (
    select distinct on (se.exercise_id) se.exercise_id, se.id
    from public.session_exercises se
    join public.workout_sessions ws on ws.id = se.session_id and ws.user_id = se.user_id
    join current_exercises current on current.exercise_id = se.exercise_id
    where se.user_id = (select auth.uid())
      and ws.status = 'completed'
      and ws.id <> p_session_id
      and ws.started_at <= current.started_at
    order by se.exercise_id, ws.started_at desc
  )
  select previous.exercise_id, logged_set.set_number, logged_set.weight_kg, logged_set.reps, logged_set.rir
  from previous_exercises previous
  join public.workout_sets logged_set on logged_set.session_exercise_id = previous.id and logged_set.user_id = (select auth.uid())
  where logged_set.completed
  order by previous.exercise_id, logged_set.set_number;
$$;
revoke all on function public.forge_previous_sets(uuid) from public, anon;
grant execute on function public.forge_previous_sets(uuid) to authenticated;
