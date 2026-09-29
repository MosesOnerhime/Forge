-- Swap adjacent routine exercises in one transaction. Lock the day so two
-- reorder requests for the same plan cannot choose the same temporary slot.
create function public.forge_reorder_program_exercise(p_item_id uuid, p_direction integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := (select auth.uid());
  v_day_id uuid;
  v_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
  v_temporary_order integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_direction is null or p_direction not in (-1, 1) then raise exception 'Direction must be -1 or 1'; end if;

  select workout_day_id into v_day_id
  from public.program_exercises
  where id = p_item_id and user_id = v_user_id;
  if v_day_id is null then raise exception 'Exercise is not in your routine'; end if;

  perform 1 from public.workout_days
  where id = v_day_id and user_id = v_user_id for update;

  select sort_order into v_order
  from public.program_exercises
  where id = p_item_id and user_id = v_user_id and workout_day_id = v_day_id;
  if v_order is null then raise exception 'Exercise is not in your routine'; end if;

  if p_direction = -1 then
    select id, sort_order into v_neighbor_id, v_neighbor_order
    from public.program_exercises
    where user_id = v_user_id and workout_day_id = v_day_id and sort_order < v_order
    order by sort_order desc limit 1;
  else
    select id, sort_order into v_neighbor_id, v_neighbor_order
    from public.program_exercises
    where user_id = v_user_id and workout_day_id = v_day_id and sort_order > v_order
    order by sort_order limit 1;
  end if;
  if v_neighbor_id is null then return false; end if;

  select max(sort_order) + 1 into v_temporary_order
  from public.program_exercises
  where user_id = v_user_id and workout_day_id = v_day_id;

  update public.program_exercises set sort_order = v_temporary_order
  where id = p_item_id and user_id = v_user_id;
  update public.program_exercises set sort_order = v_order
  where id = v_neighbor_id and user_id = v_user_id;
  update public.program_exercises set sort_order = v_neighbor_order
  where id = p_item_id and user_id = v_user_id;
  return true;
end;
$$;
revoke all on function public.forge_reorder_program_exercise(uuid, integer) from public, anon;
grant execute on function public.forge_reorder_program_exercise(uuid, integer) to authenticated;
