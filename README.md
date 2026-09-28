# Forge

Forge is a private training, nutrition, and physique tracker built with Next.js, TypeScript, Tailwind, shadcn/ui, and Supabase. It is mobile first and designed for fast set logging in the gym.

## Local setup

1. Install Node.js 20.9 or newer and run `npm install`.
2. Create a Supabase project. Run the SQL in `supabase/migrations/202609280001_initial.sql` using its SQL editor.
3. Copy `.env.example` to `.env.local`. Enter the Supabase project URL and publishable key. Never put a service role key in this file.
4. In Supabase Authentication URL configuration, set the site URL to `http://localhost:3000` for local work and allow redirects to `http://localhost:3000/**`. Add the deployment URL when available.
5. Run `npm run dev` and open `http://localhost:3000`.

On this Windows machine, npm registry access may need `$env:NODE_OPTIONS='--use-system-ca'` before npm commands.

## Checks

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. The app can build without Supabase variables, but account flows need a configured database. On this Windows machine, run `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/test_local_db.ps1` to create a disposable PostgreSQL 16 cluster, apply the migration, run the checks, and remove the cluster. The underlying SQL files are `scripts/local_db_bootstrap.sql`, the migration, and `scripts/local_db_checks.sql`.

The development-only `/design-preview` route shows representative dashboard and set-entry layouts for responsive QA. It returns 404 in a production build.
The preview uses labeled sample data. Run `node scripts/capture_preview.mjs` while the development server is running to refresh the 1440px desktop and 390px mobile captures under `.impeccable/review/`. The current reviewed captures are saved in `docs/screenshots/`; they do not prove the authenticated routes work.

## Scope and source

- The original supplied specification is preserved in [docs/SOURCE_SPEC.md](docs/SOURCE_SPEC.md). Six working documents split from it live in `docs/`.
- [docs/DECISIONS.md](docs/DECISIONS.md) records assumptions, especially provisional exercise sets, reps, and rest durations.
- [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md) tracks implementation and verification.
- [DESIGN.md](DESIGN.md) and `.impeccable/design.json` record the implemented visual system and current review limits.
- [AGENTS.md](AGENTS.md) records agent workflow and the Claude/Codex design setup.

## Deployment

Create separate development and production Supabase projects, apply the migration to both, set the three public environment variables in Vercel, and configure Supabase Auth redirect URLs for each deployed domain. Deploy previews first, verify authentication and private data isolation, then promote to production. Account destinations and credentials are pending, so no remote environment is connected yet.

Progress photos are private Supabase Storage objects served through short-lived signed URLs. The PWA service worker caches only the offline page and icon. The session screen saves a small copy of the last loaded workout in browser storage for read-only offline viewing; sign-out or account change clears it. Pending edits do not sync offline yet.

New accounts are routed through `/onboarding` to set units, a goal, nutrition targets, and optional starting progress. The database migration stores completion in `profiles.onboarding_completed_at`; applying this initial migration to a new Supabase project is required before testing sign-in and setup.

Settings includes a default rest duration for newly added exercises and an opt-in rest-complete browser notification. Browsers may require notification permission from the user; the timer remains usable without it.
