-- Templates share only explicitly attached references; all media buckets remain private.
alter table public.routine_templates add column is_shared boolean not null default false;
alter table public.routine_templates add column publisher_id uuid references auth.users(id) on delete set null;
alter table public.routine_templates add column source_program_id uuid references public.workout_programs(id) on delete set null;
create index routine_templates_creator_program on public.routine_templates((coalesce(user_id,publisher_id)),source_program_id);
drop policy routine_templates_read on public.routine_templates;
create policy routine_templates_read on public.routine_templates for select to authenticated
using (user_id is null or user_id=auth.uid() or is_shared);

create table public.template_reference_media (
 template_id uuid not null references public.routine_templates(id) on delete cascade,
 source_id uuid not null,
 exercise_media_id uuid references public.exercise_reference_media(id) on delete cascade,
 workout_video_id uuid references public.workout_reference_videos(id) on delete cascade,
 exercise_name text,
 day_of_week integer check (day_of_week between 1 and 7),
 source_bucket text not null check(source_bucket in ('exercise-reference-media','workout-reference-videos')),
 storage_path text not null,
 original_name text not null,
 mime_type text not null,
 file_size_bytes integer not null,
 primary key(template_id,source_id),
 check ((exercise_media_id is not null and workout_video_id is null and exercise_name is not null and day_of_week is null)
     or (exercise_media_id is null and workout_video_id is not null and exercise_name is null and day_of_week is not null))
);
create index template_reference_media_path on public.template_reference_media(source_bucket,storage_path);
alter table public.template_reference_media enable row level security;
create policy template_media_read on public.template_reference_media for select to authenticated
using (exists(select 1 from public.routine_templates t where t.id=template_id and (t.is_shared or coalesce(t.user_id,t.publisher_id)=auth.uid())));
grant select on public.template_reference_media to authenticated;
revoke insert,update,delete on public.template_reference_media from public,anon,authenticated;

-- Called only by trusted trigger/RPC code. Never trusts source paths from the client.
create function public.forge_sync_template_media(p_template uuid)
returns void language plpgsql security definer set search_path='' as $$
declare t public.routine_templates%rowtype; v_owner uuid;
begin
 select * into t from public.routine_templates where id=p_template for update;
 if not found then return; end if;
 v_owner:=coalesce(t.user_id,t.publisher_id);
 delete from public.template_reference_media where template_id=t.id;
 if v_owner is null or t.source_program_id is null then return; end if;
 insert into public.template_reference_media(template_id,source_id,exercise_media_id,exercise_name,source_bucket,storage_path,original_name,mime_type,file_size_bytes)
 select distinct t.id,m.id,m.id,e.name,'exercise-reference-media',m.storage_path,m.original_name,m.mime_type,m.file_size_bytes
 from public.exercise_reference_media m join public.exercises e on e.id=m.exercise_id
 where m.user_id=v_owner and exists(select 1 from jsonb_array_elements(t.days) d cross join lateral jsonb_array_elements(d->'exercises') x where x->>'name'=e.name);
 insert into public.template_reference_media(template_id,source_id,workout_video_id,day_of_week,source_bucket,storage_path,original_name,mime_type,file_size_bytes)
 select t.id,m.id,m.id,d.day_of_week,'workout-reference-videos',m.storage_path,m.original_name,m.mime_type,m.file_size_bytes
 from public.workout_reference_videos m join public.workout_days d on d.id=m.workout_day_id
 where m.user_id=v_owner and d.program_id=t.source_program_id;
end $$;
revoke all on function public.forge_sync_template_media(uuid) from public,anon,authenticated;

create function public.forge_template_media_changed()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_owner uuid; t record;
begin
 if tg_op='DELETE' then v_owner:=old.user_id; else v_owner:=new.user_id; end if;
 for t in select id from public.routine_templates where coalesce(user_id,publisher_id)=v_owner and source_program_id is not null order by id loop
  perform public.forge_sync_template_media(t.id);
 end loop;
 return null;
end $$;
revoke all on function public.forge_template_media_changed() from public,anon,authenticated;
create trigger forge_exercise_template_media after insert or update or delete on public.exercise_reference_media for each row execute function public.forge_template_media_changed();
create trigger forge_day_template_media after insert or update or delete on public.workout_reference_videos for each row execute function public.forge_template_media_changed();

-- RLS permits signed-in readers to sign/copy only files attached to visible templates.
create function public.forge_template_file_visible(p_bucket text,p_path text)
returns boolean language sql security definer set search_path='' stable as $$
 select auth.uid() is not null and exists(select 1 from public.template_reference_media m join public.routine_templates t on t.id=m.template_id
 where m.source_bucket=p_bucket and m.storage_path=p_path and (coalesce(t.user_id,t.publisher_id)=auth.uid() or t.is_shared));
$$;
revoke all on function public.forge_template_file_visible(text,text) from public,anon;
grant execute on function public.forge_template_file_visible(text,text) to authenticated;
create policy forge_shared_template_file_read on storage.objects for select to authenticated
using (public.forge_template_file_visible(bucket_id,name));

create function public.forge_set_template_sharing(p_template_id uuid,p_shared boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.routine_templates set is_shared=p_shared
 where id=p_template_id and coalesce(user_id,publisher_id)=auth.uid();
 if not found then raise exception 'Only the template creator can change sharing'; end if;
 perform public.forge_sync_template_media(p_template_id);
end $$;
revoke all on function public.forge_set_template_sharing(uuid,boolean) from public,anon;
grant execute on function public.forge_set_template_sharing(uuid,boolean) to authenticated;

-- Map references only to the caller's selected routine. Media bytes are copied via Storage API.
create function public.forge_template_import_targets(p_template_id uuid,p_program_id uuid)
returns table(source_id uuid,source_bucket text,storage_path text,original_name text,mime_type text,file_size_bytes integer,exercise_id uuid,workout_day_id uuid,already_owned boolean)
language plpgsql security definer set search_path='' stable as $$
begin
 if not exists(select 1 from public.workout_programs where id=p_program_id and user_id=auth.uid() and source_template_id=p_template_id)
 or not exists(select 1 from public.routine_templates where id=p_template_id and (user_id is null or user_id=auth.uid() or is_shared)) then
  raise exception 'Template or routine is not available to this account';
 end if;
 return query select m.source_id,m.source_bucket,m.storage_path,m.original_name,m.mime_type,m.file_size_bytes,e.id,d.id,
  m.exercise_media_id is not null and split_part(m.storage_path,'/',1)=auth.uid()::text
 from public.template_reference_media m
 left join public.exercises e on m.exercise_name=e.name and e.user_id=auth.uid()
 left join public.workout_days d on d.program_id=p_program_id and d.day_of_week=m.day_of_week
 where m.template_id=p_template_id and exists(select 1 from public.routine_templates t where t.id=m.template_id and (t.is_shared or coalesce(t.user_id,t.publisher_id)=auth.uid())) order by m.source_id;
end $$;
revoke all on function public.forge_template_import_targets(uuid,uuid) from public,anon;
grant execute on function public.forge_template_import_targets(uuid,uuid) to authenticated;

-- Bind historical private snapshots to their creator's current source routine.
update public.routine_templates t set source_program_id=p.id from public.workout_programs p
where t.user_id=p.user_id and p.active and not exists(
 select 1 from jsonb_array_elements(t.days) d where not exists(select 1 from public.workout_days w where w.program_id=p.id and w.day_of_week=(d->>'day_of_week')::integer and w.name=d->>'name'));
-- The original creator previously saved this unique named snapshot in production.
-- Only bind the supplied Runo starter when that historical owner is unambiguous.
do $$ declare v_owner uuid; t record; begin
 if (select count(distinct user_id) from public.routine_templates where name='Runo''s Current Routine' and user_id is not null)=1 then
  select user_id into v_owner from public.routine_templates where name='Runo''s Current Routine' and user_id is not null limit 1;
  update public.routine_templates set publisher_id=v_owner,is_shared=true,source_program_id=(select id from public.workout_programs where user_id=v_owner and active)
  where user_id is null and name='Runo''s Workout Routine';
 end if;
 for t in select id from public.routine_templates where source_program_id is not null loop perform public.forge_sync_template_media(t.id); end loop;
end $$;
create or replace function public.forge_save_routine_template(p_name text, p_description text default null)
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
  update public.routine_templates set source_program_id=v_program where id=v_id;
  perform public.forge_sync_template_media(v_id);
  return v_id;
end;
$$;
revoke all on function public.forge_save_routine_template(text,text) from public, anon;
grant execute on function public.forge_save_routine_template(text,text) to authenticated;

create or replace function public.forge_apply_routine_template(p_template_id uuid, p_reuse_if_active boolean default false)
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
    where id = p_template_id and (user_id is null or user_id = v_user or is_shared);
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
  update public.routine_templates set source_program_id=v_program
    where id=p_template_id and coalesce(user_id,publisher_id)=v_user;
  return v_program;
end;
$$;
revoke all on function public.forge_apply_routine_template(uuid,boolean) from public, anon;
grant execute on function public.forge_apply_routine_template(uuid,boolean) to authenticated;


create function public.forge_update_routine_template(p_template_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_snapshot uuid;
begin
 perform 1 from public.routine_templates where id=p_template_id and coalesce(user_id,publisher_id)=auth.uid() for update;
 if not found then raise exception 'Only the template creator can update it'; end if;
 v_snapshot:=public.forge_save_routine_template('Temporary routine snapshot');
 update public.routine_templates t set days=s.days,source_program_id=s.source_program_id
 from public.routine_templates s where t.id=p_template_id and s.id=v_snapshot;
 perform public.forge_sync_template_media(p_template_id);
 delete from public.routine_templates where id=v_snapshot;
end $$;
revoke all on function public.forge_update_routine_template(uuid) from public,anon;
grant execute on function public.forge_update_routine_template(uuid) to authenticated;
