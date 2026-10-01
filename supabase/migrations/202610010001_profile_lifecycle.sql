-- Self-service lifecycle operations never accept a caller-supplied owner ID.
-- Files must be removed through Storage's API before deleting database records.
create function public.forge_profile_media()
returns table(bucket_id text, name text)
language sql security definer set search_path = '' stable as $$
  select o.bucket_id, o.name from storage.objects o
  where auth.uid() is not null
    and o.bucket_id in ('progress-photos', 'workout-reference-videos', 'exercise-reference-media')
    and (storage.foldername(o.name))[1] = auth.uid()::text
  order by o.bucket_id, o.name limit 1000;
$$;
revoke all on function public.forge_profile_media() from public, anon;
grant execute on function public.forge_profile_media() to authenticated;

create function public.forge_reset_profile(p_expected_user uuid, p_confirmation text, p_delete_account boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in before changing your profile'; end if;
  if p_expected_user is distinct from v_user then raise exception 'Your signed-in account changed. Refresh Settings'; end if;
  if p_confirmation is distinct from (case when p_delete_account then 'DELETE' else 'RESET' end) then
    raise exception 'Confirmation does not match';
  end if;
  perform 1 from auth.users where id = v_user for update;
  if not found then raise exception 'This account no longer exists'; end if;
  if exists (select 1 from public.forge_profile_media()) then
    raise exception 'Remove all profile uploads before continuing';
  end if;

  -- Explicit dependency order also makes reset independent of Auth cascades.
  delete from public.workout_sessions where user_id = v_user;
  delete from public.workout_programs where user_id = v_user;
  delete from public.exercise_reference_media where user_id = v_user;
  delete from public.exercises where user_id = v_user;
  delete from public.routine_templates where user_id = v_user;
  delete from public.food_entries where user_id = v_user;
  delete from public.foods where user_id = v_user;
  delete from public.nutrition_targets where user_id = v_user;
  delete from public.body_measurements where user_id = v_user;
  delete from public.progress_photos where user_id = v_user;
  delete from public.journal_entries where user_id = v_user;
  delete from public.goals where user_id = v_user;
  delete from public.profiles where user_id = v_user;

  if p_delete_account then
    delete from auth.users where id = v_user;
  else
    insert into public.profiles(user_id) values (v_user);
  end if;
end;
$$;
revoke all on function public.forge_reset_profile(uuid, text, boolean) from public, anon;
grant execute on function public.forge_reset_profile(uuid, text, boolean) to authenticated;

-- An already issued JWT must not recreate uploads after account deletion.
create function public.forge_account_exists()
returns boolean language sql security definer set search_path = '' stable as $$
  select exists (select 1 from auth.users where id = auth.uid());
$$;
revoke all on function public.forge_account_exists() from public, anon;
grant execute on function public.forge_account_exists() to authenticated;
create policy forge_storage_live_account on storage.objects as restrictive
for all to authenticated
using (bucket_id not in ('progress-photos', 'workout-reference-videos', 'exercise-reference-media') or public.forge_account_exists())
with check (bucket_id not in ('progress-photos', 'workout-reference-videos', 'exercise-reference-media') or public.forge_account_exists());
