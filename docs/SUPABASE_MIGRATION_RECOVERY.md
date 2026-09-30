# Supabase migration recovery

## What happened

On 2026-09-30, GitHub's Supabase Preview check for project `rwuylbfacfkpkgduftfv` failed at the first statement of `202609280001_initial.sql`: `relation "profiles" already exists`. The same project already served signed-in Forge pages. Earlier migrations were run through the SQL Editor, which may have created schema objects without recording the migration files in Supabase's migration ledger. That history mismatch is a hypothesis until the ledger is inspected. Do not rerun the initial migration or mark files applied based only on the existing `profiles` table.

Migration `202609290005_nutrition_target_choice.sql` also has no remote application proof. It removes the signup-time insertion of Runo's nutrition target and preserves existing target rows.

## Read-only checks in the project's SQL Editor

Run these in the project named above. They do not alter account data or migration history.

```sql
select to_regclass('public.profiles') as profiles,
       to_regclass('public.routine_templates') as routine_templates,
       to_regclass('public.exercise_reference_media') as exercise_reference_media,
       to_regclass('supabase_migrations.schema_migrations') as migration_ledger;

select version, name
from supabase_migrations.schema_migrations
order by version;

select position('public.nutrition_targets' in
       pg_get_functiondef('public.forge_seed_user(uuid)'::regprocedure)) > 0
       as still_inserts_nutrition_target;
```

If `migration_ledger` is null, skip the second query and record that fact. The final query should return `false` only after migration 005 has replaced the seed function. It checks the function body, not a new-user signup round trip.

## Recovery order

1. Compare ledger entries with all six files in `supabase/migrations/` and inspect the corresponding schema, functions, Storage buckets, and policies. A table existing is not enough to prove a whole migration ran.
2. Apply migration 005 if its function still inserts a nutrition target and the preceding migrations are present. Keep existing target rows intact.
3. Reconcile migration history only for migrations proven fully applied. Supabase documents `supabase migration repair --status applied <version>` for a migration whose changes are already present but whose ledger entry is missing. Repair changes tracking; it does not apply SQL.
4. Recheck the Supabase GitHub check on a later commit and create a test account. Confirm no nutrition target row exists before onboarding, then save account-specific targets and verify Today and Nutrition.

Do not reset this production project or drop `profiles` to make the check green; both would put existing account data at risk. Supabase's [database migration guidance](https://supabase.com/docs/guides/deployment/database-migrations) and [branching migration behavior](https://supabase.com/docs/guides/deployment/branching/github-integration) explain the ledger and GitHub integration.
