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
- Interpret the user's “reference video for each workout” request as one optional video per scheduled training day while awaiting clarification about per-exercise videos. Keep files in a separate owner-scoped private bucket, allow MP4/WebM through 50 MiB, use resumable uploads, and sign playback URLs on demand. Replacement creates a new object path before changing the metadata row; failed old-file cleanup is visible for retry.

## External inputs needed for release

- Original workout prescription with exact sets, rep ranges, rest periods, and any warm-up rules.
- A separate development Supabase project and preview environment; the existing configured project is production.
- Any desired custom domain for the live Vercel project.
- Production backup, monitoring, and analytics choices.
- A signed-in test account for live video upload/playback checks. The configured Supabase project now has the video table and private bucket.

Do not mark release complete from a local build alone. The [implementation plan](IMPLEMENTATION_PLAN.md) requires a real account and end-to-end persistence checks.

## Verification boundary

The migrations were executed in filename order against a disposable PostgreSQL 16 instance with small Auth and Storage stubs. Tests checked seed counts, RLS visibility, idempotent setup, atomic/idempotent workout start with empty-plan rollback, adjacent routine swaps with injected-failure rollback, previous-performance selection and all-time volume best, and cross-owner isolation and foreign-key rejection. Actual Supabase Auth, Storage uploads and deletion, email redirects, and deployment still require live projects.
