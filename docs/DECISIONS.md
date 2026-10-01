# Decisions and open inputs

## Confirmed from the source specification

- Next.js App Router, TypeScript, React, Tailwind CSS, and shadcn/ui.
- Supabase for Auth, PostgreSQL, Storage, and RLS; Vercel for deployment.
- Monday, Wednesday, Friday, Saturday, and Sunday are training days. Tuesday and Thursday are rest days.
- Nutrition baseline is roughly 2,800–3,000 kcal and 160–180 g protein per day.
- The initial experience is mobile-first, dark, and focused on fast logging.

## Temporary implementation choices

- Seed a 2,900 kcal, 170 g protein, 375 g carbohydrate, 80 g fat starting target. This is inside the stated ranges and remains editable.
- The source specification lists routine exercises but says to get exact sets, rep ranges, and rests from an existing workout specification that was not attached. Until that source is supplied, use clearly marked provisional prescriptions. Replace them before claiming the exact current routine is loaded.
- Use all four weekly lifting days plus Friday's leg day from the source list. A `/` in an exercise name means an acceptable substitution, not two exercises to complete.
- A user can sign up with email and password. Whether email confirmation is required follows the Supabase development project's setting.
- Store workout weights and body measurements in metric units, and convert for imperial display and input when selected in Settings.
- The service worker caches a static offline page and icon. The last loaded workout is saved as a small browser-local snapshot and shown read-only on that page. Sets are queued in browser storage before upload, keyed to their owner and session exercise; pending edits replace the same set number and retain their original completion time through retries. Acknowledged sets are removed from the queue, and pending sets are labeled “Waiting to sync” in the session and offline snapshot. Signing out warns before discarding queued sets; account changes clear the queue and snapshot. Offline notes, food, photos, and other edits are not supported yet.
- Keep a development-only design preview for visual QA. Production returns 404 for that route.
- Track completion of the first-use journey with nullable `profiles.onboarding_completed_at`; new seeded accounts enter the guided setup, while completed accounts open Today. Optional starting measurements and photos can be skipped.
- Store a per-user default rest duration for newly added exercises and a browser-notification preference on `profiles`. Existing exercises retain their own configured rest. The timer uses the wall-clock deadline so background-tab throttling cannot lengthen the countdown.
- Start a workout through an invoker-rights database function so creating the session and copying its planned exercises commit together. The existing unique active-session index makes duplicate starts converge on one resumable session.
- Reorder routine exercises through the invoker-rights `forge_reorder_program_exercise` function. It locks the owner’s training day and swaps adjacent positions in one database transaction, so a failed request cannot leave the three-step reorder half applied.
- Interpret the user's “reference video for each workout” request first as one optional video per scheduled training day; the later Cable Lateral Raise clarification adds exercise-level media. Keep files in a separate owner-scoped private bucket, allow MP4/WebM through 50 MiB, use resumable uploads, and sign playback URLs on demand. Replacement creates a new object path before changing the metadata row; failed old-file cleanup is visible for retry.

## External inputs needed for release

- Original workout prescription with exact sets, rep ranges, rest periods, and any warm-up rules.
- A separate development Supabase project and preview environment; the existing configured project is production.
- Any desired custom domain for the live Vercel project.
- Production backup, monitoring, and analytics choices.
- A signed-in test account for live video upload/playback checks. The configured Supabase project now has the video table and private bucket.

Do not mark release complete from a local build alone. The [implementation plan](IMPLEMENTATION_PLAN.md) requires a real account and end-to-end persistence checks.

## Verification boundary

The migrations were executed in filename order against a disposable PostgreSQL 16 instance with small Auth and Storage stubs. Tests checked seed counts, RLS visibility, idempotent setup, atomic/idempotent workout start with empty-plan rollback, adjacent routine swaps with injected-failure rollback, previous-performance selection and all-time volume best, and cross-owner isolation and foreign-key rejection. Actual Supabase Auth, Storage uploads and deletion, email redirects, and deployment still require live projects.

- 2026-09-29: The user's Cable Lateral Raise example resolves the earlier scope ambiguity: add media to individual exercises while retaining the scheduled-day video. Allow multiple images and videos per exercise so a user can keep several angles. Keep them in a separate private bucket and owner-scoped table, cap images at 10 MiB and videos at 50 MiB, and use signed viewing on demand.

## Routine template decisions (2026-09-29)

- Keep the old program and its days when a template is loaded because historical sessions retain foreign keys to those days. Only one program is active at a time.
- Store built-ins and private snapshots in one RLS-protected table. Save the current week through an owner-scoped RPC, and apply a whole template in one transaction.
- Keep the existing seed as a fallback for account creation; onboarding applies the explicit choice and can reuse that choice on a retry.
- The mother's starter is a conservative, editable gym-based three-strength-day plan with optional easy walking on recovery days. Her stated 98 kg/5 ft 9 in stay out of the shared template and nutrition defaults. No plan promises reduction in a specific body area. Equipment and any health restrictions remain open inputs.
- Runo's template copies the existing five-day routine; its sets, reps, and rests remain provisional pending the original workout prescription.
- The starter's three moderate full-body days and optional gradual walking are an implementation choice informed by the [WHO adult activity guidance](https://www.who.int/europe/news-room/fact-sheets/item/physical-activity) and [CDC adult guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), which recommend aerobic activity plus muscle strengthening at least twice weekly. The template does not by itself guarantee the weekly aerobic target. Exercise choices and loads require adjustment for the person's ability, equipment, and any medical restrictions.
- New accounts no longer receive Runo's nutrition target from the database trigger. The onboarding choice controls whether his supplied values prefill; other plans require account-specific entries. Migration 005 preserves existing target history because those rows may represent deliberate choices. A targetless account shows only logged nutrition and a Settings link.

## Reference and set-entry decisions (2026-09-30)

- Use a horizontal preview row under each exercise so references are visible while scrolling, with a full-size dialog on selection. Keep files private and sign a fresh viewer URL when selected; no new public thumbnail bucket.
- Permit reference upload and removal in sessions because the media belongs to the exercise or scheduled day, not to an immutable workout log. Existing owner-scoped RLS and Storage policies apply.
- Treat a completed current-session set as the next set's suggestion; use the first set from the previous workout only when the current session has none. These are editable defaults, not automatic progression advice.
- Treat zero added load for the named Dips and Upright Dips exercises as body weight. A positive load means external weight added and is labelled weighted dips. No database migration is needed.
- Let video tiles play inline with native controls; use a separate Expand button for the full viewer. Pause the inline player before expansion to avoid two audio tracks. Keep signed private media URLs.
- Move the rest timer to the authenticated app shell and persist its deadline under an owner-specific browser key. Preserve it across app navigation, background tabs, and reloads without adding a server table. Finish/cancel and Dismiss clear it.

## Profile lifecycle decisions (2026-10-01)

Reset means a fresh Forge profile using the existing login; deletion includes the Auth account, rather than only hiding the profile row. Both erase all owned app records/uploads and private routine templates. Retain shared starter templates. Use typed confirmation and an export reminder.

Use a tightly scoped security-definer RPC to remove only `auth.uid()` records, with an expected-user assertion, a locked live Auth row, and no remaining app uploads. This avoids adding a server admin key. Supabase permits direct Auth-row deletion and cautions that owned Storage objects must be removed first ([user management](https://supabase.com/docs/guides/auth/managing-user-data)). Use the Storage API for deletion, because deleting Storage metadata in SQL does not remove the underlying file ([delete objects](https://supabase.com/docs/guides/storage/management/delete-objects)). Cleanup can partially complete before a failure; explain retry and irreversible file loss. A restrictive live-account Storage policy limits stale-token access after deletion.

## Shared template media decisions (2026-10-01)

A shared template publishes only the files linked to its saved exercises/days; unrelated uploads remain private. Source buckets stay private and accept owner writes only. Readers receive independent private file copies when loading, so they can save/edit their own template and retain references after unpublication or creator deletion. Storage copy requires SELECT on the source and INSERT on the destination ([Supabase copy guidance](https://supabase.com/docs/guides/storage/management/copy-move-objects)).

Uploads refresh template media automatically; saved schedules change only through the creator's Update action. Built-in Runo remains a starter row with a publisher assigned from the unique previously saved Runo snapshot, avoiding a public claim RPC. A failed file transfer leaves the loaded plan and a clear retry path; reused programs, deterministic versioned destinations, and metadata checks avoid duplicate transfers. Source changes apply to future loads, while completed account-owned copies stay independent.
