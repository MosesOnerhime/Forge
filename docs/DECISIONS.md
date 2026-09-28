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
- The service worker caches a static offline page and icon. The last loaded workout is saved as a small browser-local snapshot and shown read-only on that page; it is cleared on explicit sign-out and account change. This meets the previously loaded workout part of the App Flow where possible, but unsaved changes still need a durable “Waiting to sync” queue. Photos, food logs, and other private records are not cached there.
- Keep a development-only design preview for visual QA. Production returns 404 for that route.
- Track completion of the first-use journey with nullable `profiles.onboarding_completed_at`; new seeded accounts enter the guided setup, while completed accounts open Today. Optional starting measurements and photos can be skipped.
- Store a per-user default rest duration for newly added exercises and a browser-notification preference on `profiles`. Existing exercises retain their own configured rest. The timer uses the wall-clock deadline so background-tab throttling cannot lengthen the countdown.

## External inputs needed for release

- Original workout prescription with exact sets, rep ranges, rest periods, and any warm-up rules.
- Development and production Supabase projects and environment values.
- Vercel account and project for preview and production deployment.
- GitHub repository and any desired custom domain.
- Production backup, monitoring, and analytics choices.

Do not mark release complete from a local build alone. The [implementation plan](IMPLEMENTATION_PLAN.md) requires a real account and end-to-end persistence checks.

## Verification boundary

The current migration was executed against a disposable PostgreSQL 16 instance with small Auth and Storage stubs. Tests checked seed counts, RLS visibility, idempotent setup, the previous-performance RPC's latest-session selection, all-time set-volume best, and cross-owner isolation, and cross-owner foreign-key rejection. Actual Supabase Auth, Storage uploads, email redirects, and deployment still require live projects.
