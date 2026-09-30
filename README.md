# Forge

Forge is a private training, nutrition, and physique tracker built with Next.js, TypeScript, Tailwind, shadcn/ui, and Supabase. It is mobile first and designed for fast set logging in the gym.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Create a Supabase project. Run every SQL file in `supabase/migrations/` in filename order using its SQL editor.
3. Copy `.env.example` to `.env.local`. Enter the Supabase project URL and publishable key. Never put a service role key in this file.
4. In Supabase Authentication URL configuration, set the site URL to `http://localhost:3000` for local work and allow redirects to `http://localhost:3000/**`. Add the deployment URL when available.
5. Run `npm run dev` and open `http://localhost:3000`.

On this Windows machine, npm registry access may need `$env:NODE_OPTIONS='--use-system-ca'` before npm commands.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The app can build without Supabase variables, but account flows need a configured database. On this Windows machine, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test_local_db.ps1` to create a disposable PostgreSQL 16 cluster, apply all migrations in filename order, run the checks, and remove the cluster. The underlying SQL files are `scripts/local_db_bootstrap.sql`, `supabase/migrations/*.sql`, and `scripts/local_db_checks.sql`.

GitHub Actions runs the same four app checks on pull requests and pushes to `main` using Node.js 24. A separate PostgreSQL 16 service job applies every migration and runs the owner-isolation harness. Neither job uses production Supabase credentials or replaces the signed-in release test. See `.github/workflows/verify.yml`.

The development-only `/design-preview` route shows representative dashboard and set-entry layouts for responsive QA. It returns 404 in a production build.
The preview uses labeled sample data. Run `node scripts/capture_preview.mjs` while the development server is running to refresh the 1440px desktop and 390px mobile captures under `.impeccable/review/`. The current reviewed captures are saved in `docs/screenshots/`; they do not prove the authenticated routes work.

## Scope and source

- The original supplied specification is preserved in [docs/SOURCE_SPEC.md](docs/SOURCE_SPEC.md). Six working documents split from it live in `docs/`.
- [docs/DECISIONS.md](docs/DECISIONS.md) records assumptions, especially provisional exercise sets, reps, and rest durations.
- [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) tracks implementation and verification.
- [docs/SUPABASE_MIGRATION_RECOVERY.md](docs/SUPABASE_MIGRATION_RECOVERY.md) records the repaired Supabase migration history, production verification, and remaining signup check.
- [DESIGN.md](DESIGN.md) and `.impeccable/design.json` record the implemented visual system and current review limits.
- [AGENTS.md](AGENTS.md) records agent workflow and the Claude/Codex design setup.

## Deployment

The GitHub `main` branch deploys automatically to [forge-runo.vercel.app](https://forge-runo.vercel.app/). Vercel has the three public environment variables, with `NEXT_PUBLIC_APP_URL` set to that domain. The configured Supabase project has the video table and private bucket. Its Auth allowlist includes the two production `/auth/callback` URLs used for confirmation and password reset. The supplied exercise reference MP4 was uploaded and played in production; scheduled-day video, image upload, and a separate preview/development environment still need live checks. For future environments, apply all migrations in filename order and configure their Auth redirect URLs before testing.

Progress photos are private Supabase Storage objects served through short-lived signed URLs. The PWA service worker caches only the offline page and icon. The session screen saves a small copy of the last loaded workout in browser storage for read-only offline viewing. Logged sets enter a browser-local queue before upload, show “Waiting to sync” until acknowledged, and retry when the app reconnects or becomes visible. Return using the same browser and do not clear its site data before they sync; signing out discards queued sets after a warning. Other edits, including notes, food, and progress, still require a connection.

New accounts are routed through `/onboarding` to set units, a goal, nutrition targets, and optional starting progress. The initial database migration stores completion in `profiles.onboarding_completed_at`; applying it to a new Supabase project is required before testing sign-in and setup.

Settings includes a default rest duration for newly added exercises and an opt-in rest-complete browser notification. Browsers may require notification permission from the user; the timer remains usable without it.

Edit routine and the workout session let an account owner upload, replace, or remove one private MP4/WebM reference video for each scheduled training day (50 MiB maximum). A saved video appears as a visible preview tile; select it to open the player. Uploads use resumable chunks; preview and playback links are signed and last two hours. The configured project has `202609290002_workout_reference_videos.sql` applied; other environments must apply it after the earlier migrations. A signed-in Storage upload/playback check is still required. The Settings JSON export includes video metadata, while the file remains in private Storage.

## Exercise reference media

Exercise references appear in a horizontal row of image and video preview tiles on **Workouts**, **Edit routine**, and the workout session. Select a tile to enlarge an image or play a video. **Edit routine** and the session both offer **Add image or video** and removal controls. JPG, PNG, and WebP images are limited to 10 MiB; MP4 and WebM videos to 50 MiB. References belong to the exercise, so they follow it if it moves to another training day. Videos use resumable upload; images use direct private Storage upload. Preview and viewing links expire after two hours. The Settings JSON export includes media metadata but not file bytes. The configured production project has `202609290003_exercise_reference_media.sql` applied; apply it after the earlier migrations in other environments. The scheduled-day reference video remains available separately.

New workout sets suggest the weight and reps from the latest completed set for that exercise, or the most recent earlier workout when the current session has none. You can change either value before saving. For **Dips** and **Upright Dips**, `0 kg` records body weight; a positive value records added weight and is labeled **Weighted dips**.

The supplied `C:\Users\moses\Videos\cable lateral raises.mp4` was uploaded to **Cable Lateral Raise** in the signed-in production routine editor after the user enabled Edge extension file access. The app confirmed the saved 2.9 MB reference; its signed video player loaded and advanced through the 17.47-second clip without an error. The reference remained visible after a page reload. This verifies one exercise-video path; image upload, another account's isolation, and session playback still need live checks.

## Routine templates

Apply `202609290004_routine_templates.sql` after migration 003. New users choose a complete week in onboarding: Runo's provisional five-day routine, a gentler three-day starter routine, or a blank week. Existing users can open **Workouts > Edit routine > Choose or save a template**, edit individual day details and exercises, save the active week as a private template, or load another template. Switching keeps previous workout logs and is blocked while a workout is active. Exercise reference media is not shared across accounts; day videos remain with their original schedule. The mother's starter routine is editable and assumes gym access pending her equipment and health details.

**Build from scratch:** Select the blank template in onboarding. After setup, Forge opens **Edit routine** with a short guide. Pick a weekday, open **Edit [day] details**, turn off **Recovery day**, name the workout and set its duration, then save. Use **Add exercise** to choose or create movements and enter sets, rep range, and rest. Repeat for other training days. Open **Choose or save a template** and save the finished week so it can be loaded again. The same guide appears when loading the blank template later.

The configured Supabase project has migration 004 applied, and the production UI is deployed. A signed-in save/reload of a private template passed. New-account selection and a live routine switch still need end-to-end checking. For responsive layout review only, development mode exposes `/design-preview/templates`; production returns 404.

Migration `202609290005_nutrition_target_choice.sql` removes Runo's nutrition defaults from new account creation. Onboarding offers his figures only when his plan is selected; everyone else enters their own targets. Today and Nutrition show logged amounts without a goal until a target is saved. Existing targets are preserved. The configured project's ledger records all six migrations, Supabase Preview passed on `d61b7cc`, and the live seed function no longer inserts a nutrition target. A real new-account onboarding check remains.
