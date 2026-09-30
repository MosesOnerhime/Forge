# Supabase migration recovery

## What happened

On 2026-09-30, GitHub's Supabase Preview check for project `rwuylbfacfkpkgduftfv` failed at the first statement of `202609280001_initial.sql`: `relation "profiles" already exists`. The same project already served signed-in Forge pages. Read-only SQL confirmed that `supabase_migrations.schema_migrations` existed but had **zero rows**. The earlier migrations had created schema objects without recording the migration files in the ledger.

Migration `202609290005_nutrition_target_choice.sql` removes the signup-time insertion of Runo's nutrition target and preserves existing target rows.

Before repairing history, read-only checks found all 18 expected public tables with RLS and an owner/read policy; 17 owner policies referenced `auth.uid()` in both conditions. All 12 named indexes, five named triggers, three private media buckets, nine owner-scoped media policies, the routine RPCs, and the three seven-day templates were present. The built-ins contained 35, 13, and 0 exercises as specified. The current `forge_seed_user(uuid)` still inserted into `public.nutrition_targets`, proving migration 005 had not replaced it.

An atomic SQL Editor block then recorded **only** migrations `202609280001` through `202609290004` as applied, guarded by checks that the ledger was empty and the core schema, policies, buckets, templates, RPCs, and old seed state matched. A follow-up read returned exactly those five version/name rows. No application data, table schema, or Storage object was changed by this repair. The next push (`d61b7cc`) triggered Supabase Preview, which completed successfully alongside the app and database checks. A fresh production SQL Editor query returned all six versions, including `202609290005 nutrition_target_choice`; inspecting `forge_seed_user(uuid)` returned `still_inserts_nutrition_target = false`. This verifies the remote migration and seed function, but a new-account signup round trip remains untested.

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

The ledger query now returns six rows and the final query returns `false`. It checks the function body, not a new-user signup round trip.

## Recovery outcome and remaining check

1. Completed: the connected Supabase GitHub integration succeeded after the five earlier versions were recorded. It applied migration 005 without replaying migrations 001–004.
2. Completed: the production ledger has six rows, and `forge_seed_user(uuid)` no longer inserts into `nutrition_targets`.
3. Pending: create a test account. Confirm no nutrition target row exists before onboarding, then save account-specific targets and verify Today and Nutrition.

Do not reset this production project or drop `profiles` to make the check green; both would put existing account data at risk. Supabase's [database migration guidance](https://supabase.com/docs/guides/deployment/database-migrations) and [branching migration behavior](https://supabase.com/docs/guides/deployment/branching/github-integration) explain the ledger and GitHub integration.
