-- Built-in and owner-private snapshots of a seven-day routine. Media and logs
-- remain attached to the owner's exercise and historical session records.
create table public.routine_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name varchar(150) not null check (length(trim(name)) > 0),
  description text,
  days jsonb not null check (jsonb_typeof(days) = 'array' and jsonb_array_length(days) = 7),
  created_at timestamptz not null default now()
);
create index routine_templates_owner_created on public.routine_templates(user_id, created_at desc);
alter table public.workout_programs add column source_template_id uuid
  references public.routine_templates(id) on delete set null;
alter table public.routine_templates enable row level security;
create policy routine_templates_read on public.routine_templates for select to authenticated
using (user_id is null or user_id = (select auth.uid()));
create policy routine_templates_delete on public.routine_templates for delete to authenticated
using (user_id = (select auth.uid()));
revoke insert, update on public.routine_templates from public, anon, authenticated;
grant select, delete on public.routine_templates to authenticated;

-- A built-in copy of the existing provisional five-day source plan.
with days(day_of_week, name, min_minutes, max_minutes, is_rest_day) as (values
  (1, 'Back + Biceps + Forearms', 85, 110, false),
  (2, 'Recovery', null::integer, null::integer, true),
  (3, 'Chest + Shoulders + Triceps', 85, 110, false),
  (4, 'Recovery', null::integer, null::integer, true),
  (5, 'Legs + Abs', 85, 110, false),
  (6, 'Back + Biceps + Forearms', 85, 110, false),
  (7, 'Chest + Shoulders + Triceps', 85, 110, false)
), plan(day_of_week, position, exercise_name, sets, min_reps, max_reps, rest_seconds) as (values
  (1,1,'Weighted Pull-ups',3,6,10,180), (1,2,'Chest-Supported Row',3,8,12,150),
  (1,3,'Lat Pulldown',3,8,12,120), (1,4,'Incline Dumbbell Curl',3,8,12,90),
  (1,5,'Preacher Curl / Cable Curl',3,8,12,90), (1,6,'Reverse Curl',3,10,15,75),
  (1,7,'Wrist Curl / Reverse Wrist Curl',3,12,20,60),
  (3,1,'Incline Barbell / Dumbbell Press',3,6,10,180), (3,2,'Flat Dumbbell Press',3,8,12,150),
  (3,3,'Cable Lateral Raise',3,12,20,75), (3,4,'Rear Delt Fly',3,12,20,75),
  (3,5,'Overhead Triceps Extension',3,8,12,90), (3,6,'Cable Pushdown',3,10,15,75),
  (3,7,'Dips',3,6,12,120),
  (5,1,'Back Squat',3,6,10,180), (5,2,'Romanian Deadlift',3,6,10,180),
  (5,3,'Bulgarian Split Squat',3,8,12,150), (5,4,'Leg Curl',3,10,15,90),
  (5,5,'Standing Calf Raise',3,12,20,75), (5,6,'Hanging Leg Raise',3,10,15,75),
  (5,7,'Cable Crunch',3,10,15,75),
  (6,1,'Chin-up / Neutral-Grip Pull-up',3,6,10,180), (6,2,'Barbell Row',3,6,10,180),
  (6,3,'Single-Arm Cable Row',3,8,12,120), (6,4,'EZ-Bar Curl',3,8,12,90),
  (6,5,'Hammer Curl',3,8,12,90), (6,6,'Reverse Curl',3,10,15,75),
  (6,7,'Farmer''s Carry / Wrist Roller',3,10,20,90),
  (7,1,'Incline Dumbbell Press',3,8,12,150), (7,2,'Upright Dips',3,6,12,120),
  (7,3,'Cable / Machine Fly',3,10,15,90), (7,4,'Cable Lateral Raise',3,12,20,75),
  (7,5,'Reverse Pec Deck',3,12,20,75), (7,6,'Skull Crusher / Overhead Cable Extension',3,8,12,90),
  (7,7,'Rope Pushdown',3,10,15,75)
)
insert into public.routine_templates (name, description, days)
select 'Runo''s Workout Routine',
  'Five training days and two recovery days. Sets, reps, and rests are provisional until the original workout prescription is supplied.',
  jsonb_agg(jsonb_build_object(
    'day_of_week', d.day_of_week, 'name', d.name, 'estimated_minutes_min', d.min_minutes,
    'estimated_minutes_max', d.max_minutes, 'is_rest_day', d.is_rest_day,
    'exercises', coalesce((select jsonb_agg(jsonb_build_object(
      'name', p.exercise_name, 'sort_order', p.position, 'target_sets', p.sets,
      'min_reps', p.min_reps, 'max_reps', p.max_reps,
      'rest_seconds_min', p.rest_seconds, 'rest_seconds_max', p.rest_seconds,
      'notes', 'Provisional prescription; replace from original workout specification.'
    ) order by p.position) from plan p where p.day_of_week = d.day_of_week), '[]'::jsonb)
  ) order by d.day_of_week)
from days d;

-- Beginner gym routine. Walking is suggested in recovery-day names because
-- Forge's set logger does not yet record aerobic duration.
with days(day_of_week, name, min_minutes, max_minutes, is_rest_day) as (values
  (1, 'Full body A', 30, 45, false),
  (2, 'Easy walk or recovery', null::integer, null::integer, true),
  (3, 'Full body B', 30, 45, false),
  (4, 'Easy walk or recovery', null::integer, null::integer, true),
  (5, 'Full body A', 30, 45, false),
  (6, 'Easy walk or recovery', null::integer, null::integer, true),
  (7, 'Recovery', null::integer, null::integer, true)
), plan(day_of_week, position, exercise_name, sets, min_reps, max_reps, rest_seconds) as (values
  (1,1,'Sit-to-Stand / Box Squat',2,8,12,90),
  (1,2,'Seated Cable Row',2,8,12,90),
  (1,3,'Machine Chest Press',2,8,12,90),
  (1,4,'Dead Bug',2,6,10,60),
  (3,1,'Leg Press',2,8,12,90),
  (3,2,'Lat Pulldown',2,8,12,90),
  (3,3,'Dumbbell Shoulder Press',2,8,12,90),
  (3,4,'Pallof Press',2,8,12,60),
  (5,1,'Sit-to-Stand / Box Squat',2,8,12,90),
  (5,2,'Seated Cable Row',2,8,12,90),
  (5,3,'Machine Chest Press',2,8,12,90),
  (5,4,'Cable Triceps Pushdown',2,10,12,75),
  (5,5,'Dead Bug',2,6,10,60)
)
insert into public.routine_templates (name, description, days)
select 'Mom''s Starter Routine',
  'An editable beginner gym plan: three moderate full-body strength days, with optional easy walking on recovery days. Build activity gradually; this cannot promise fat loss in a particular body area.',
  jsonb_agg(jsonb_build_object(
    'day_of_week', d.day_of_week, 'name', d.name, 'estimated_minutes_min', d.min_minutes,
    'estimated_minutes_max', d.max_minutes, 'is_rest_day', d.is_rest_day,
    'exercises', coalesce((select jsonb_agg(jsonb_build_object(
      'name', p.exercise_name, 'sort_order', p.position, 'target_sets', p.sets,
      'min_reps', p.min_reps, 'max_reps', p.max_reps,
      'rest_seconds_min', p.rest_seconds, 'rest_seconds_max', p.rest_seconds,
      'notes', 'Choose a comfortable load and adjust the movement to ability.'
    ) order by p.position) from plan p where p.day_of_week = d.day_of_week), '[]'::jsonb)
  ) order by d.day_of_week)
from days d;

insert into public.routine_templates (name, description, days)
select 'Build from scratch', 'Start with seven recovery days, then name training days and add your exercises.',
  jsonb_agg(jsonb_build_object('day_of_week', n, 'name', 'Recovery',
    'estimated_minutes_min', null, 'estimated_minutes_max', null,
    'is_rest_day', true, 'exercises', '[]'::jsonb) order by n)
from generate_series(1, 7) as n;

create function public.forge_save_routine_template(p_name text, p_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := (select auth.uid()); v_program uuid; v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_name is null or length(trim(p_name)) = 0 or length(trim(p_name)) > 150 then
    raise exception 'Template name must be 1 to 150 characters';
  end if;
  select id into v_program from public.workout_programs
    where user_id = v_user and active for share;
  if v_program is null then raise exception 'No active routine to save'; end if;
  insert into public.routine_templates (user_id, name, description, days)
  select v_user, trim(p_name), nullif(trim(p_description), ''),
    jsonb_agg(jsonb_build_object(
      'day_of_week', d.day_of_week, 'name', d.name,
      'estimated_minutes_min', d.estimated_minutes_min,
      'estimated_minutes_max', d.estimated_minutes_max,
      'is_rest_day', d.is_rest_day,
      'exercises', coalesce((select jsonb_agg(jsonb_build_object(
        'name', e.name, 'sort_order', pe.sort_order, 'target_sets', pe.target_sets,
        'min_reps', pe.min_reps, 'max_reps', pe.max_reps,
        'rest_seconds_min', pe.rest_seconds_min, 'rest_seconds_max', pe.rest_seconds_max,
        'notes', pe.notes
      ) order by pe.sort_order)
      from public.program_exercises pe join public.exercises e
        on e.id = pe.exercise_id and e.user_id = v_user
      where pe.workout_day_id = d.id and pe.user_id = v_user), '[]'::jsonb)
    ) order by d.day_of_week)
  from public.workout_days d where d.program_id = v_program and d.user_id = v_user
  having count(*) = 7
  returning id into v_id;
  if v_id is null then raise exception 'Routine must contain seven days'; end if;
  return v_id;
end;
$$;
revoke all on function public.forge_save_routine_template(text,text) from public, anon;
grant execute on function public.forge_save_routine_template(text,text) to authenticated;

create function public.forge_apply_routine_template(p_template_id uuid, p_reuse_if_active boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := (select auth.uid()); v_template public.routine_templates%rowtype;
  v_program uuid; v_day uuid; v_exercise uuid; v_entry jsonb; v_item jsonb;
  v_day_number integer; v_position integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  -- Serialize concurrent switches for one owner and reject an in-progress session.
  perform 1 from public.profiles where user_id = v_user for update;
  select * into v_template from public.routine_templates
    where id = p_template_id and (user_id is null or user_id = v_user);
  if not found then raise exception 'Template not found'; end if;
  if exists (select 1 from public.workout_sessions where user_id = v_user and status = 'active') then
    raise exception 'Finish or cancel your active workout before changing routines';
  end if;
  if p_reuse_if_active then
    select id into v_program from public.workout_programs
      where user_id = v_user and active and source_template_id = p_template_id;
    if v_program is not null then return v_program; end if;
  end if;
  if jsonb_array_length(v_template.days) <> 7 then raise exception 'Template must have seven days'; end if;
  update public.workout_programs set active = false where user_id = v_user and active;
  insert into public.workout_programs (user_id, name, description, active, source_template_id)
  values (v_user, v_template.name, v_template.description, true, p_template_id) returning id into v_program;
  for v_entry in select value from jsonb_array_elements(v_template.days) loop
    v_day_number := (v_entry->>'day_of_week')::integer;
    if v_day_number not between 1 and 7 or length(trim(v_entry->>'name')) not between 1 and 150
      or jsonb_typeof(v_entry->'exercises') <> 'array'
      or jsonb_array_length(v_entry->'exercises') > 50 then
      raise exception 'Invalid template day';
    end if;
    insert into public.workout_days (user_id, program_id, day_of_week, name,
      estimated_minutes_min, estimated_minutes_max, is_rest_day, sort_order)
    values (v_user, v_program, v_day_number, v_entry->>'name',
      (v_entry->>'estimated_minutes_min')::integer,
      (v_entry->>'estimated_minutes_max')::integer,
      (v_entry->>'is_rest_day')::boolean, v_day_number) returning id into v_day;
    for v_item in select value from jsonb_array_elements(v_entry->'exercises') loop
      if length(trim(v_item->>'name')) not between 1 and 150 then
        raise exception 'Invalid exercise name';
      end if;
      insert into public.exercises (user_id, name) values (v_user, v_item->>'name')
        on conflict (user_id, name) do update set name = excluded.name
        returning id into v_exercise;
      v_position := (v_item->>'sort_order')::integer;
      insert into public.program_exercises (user_id, workout_day_id, exercise_id,
        sort_order, target_sets, min_reps, max_reps, rest_seconds_min, rest_seconds_max, notes)
      values (v_user, v_day, v_exercise, v_position,
        (v_item->>'target_sets')::integer, (v_item->>'min_reps')::integer,
        (v_item->>'max_reps')::integer, (v_item->>'rest_seconds_min')::integer,
        (v_item->>'rest_seconds_max')::integer, v_item->>'notes');
    end loop;
  end loop;
  return v_program;
end;
$$;
revoke all on function public.forge_apply_routine_template(uuid,boolean) from public, anon;
grant execute on function public.forge_apply_routine_template(uuid,boolean) to authenticated;

-- Starts and switches share the same per-owner profile lock.
create or replace function public.forge_start_workout(p_day_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_session_id uuid;
  v_copied integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  -- Serialize starts with routine switches for this owner.
  perform 1 from public.profiles where user_id = v_user_id for update;

  select id into v_session_id
  from public.workout_sessions
  where user_id = v_user_id and status = 'active';
  if v_session_id is not null then return v_session_id; end if;

  if not exists (
    select 1 from public.workout_days day
    join public.workout_programs program on program.id = day.program_id and program.user_id = day.user_id
    where day.id = p_day_id and day.user_id = v_user_id
      and not day.is_rest_day and program.active
  ) then
    raise exception 'Choose a training day in your active program';
  end if;

  begin
    insert into public.workout_sessions (user_id, workout_day_id)
    values (v_user_id, p_day_id)
    returning id into v_session_id;
  exception when unique_violation then
    select id into v_session_id
    from public.workout_sessions
    where user_id = v_user_id and status = 'active';
    if v_session_id is null then raise; end if;
    return v_session_id;
  end;

  insert into public.session_exercises (
    user_id, session_id, exercise_id, program_exercise_id, sort_order,
    target_sets, min_reps, max_reps, rest_seconds, notes
  )
  select v_user_id, v_session_id, plan.exercise_id, plan.id, plan.sort_order,
    plan.target_sets, plan.min_reps, plan.max_reps, plan.rest_seconds_min, plan.notes
  from public.program_exercises plan
  where plan.user_id = v_user_id and plan.workout_day_id = p_day_id
  order by plan.sort_order;
  get diagnostics v_copied = row_count;
  if v_copied = 0 then raise exception 'This day has no exercises. Add them before starting'; end if;
  return v_session_id;
end;
$$;
revoke all on function public.forge_start_workout(uuid) from public, anon;
grant execute on function public.forge_start_workout(uuid) to authenticated;

