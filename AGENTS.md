# Forge agent notes

This directory contains the Forge fitness tracker application and its project-local web design setup. See `README.md` for local setup, `docs/SOURCE_SPEC.md` for the supplied brief, and `docs/BUILD_STATUS.md` for current progress.

## App workflow

- Build from the six documents in `docs/`, keeping `docs/DECISIONS.md` current when the source leaves gaps.
- Keep Supabase access owner-scoped through RLS. Do not introduce service role keys into client code.
- Run type checking, linting, build, and browser QA before calling a milestone complete. Document results in `docs/BUILD_STATUS.md`.
- Update these project documents when implementation or setup changes. The user's AGENTS instruction explicitly requires a record of work.

## Design workflow

- Use `docs/DESIGN_BRIEF.md` and `PRODUCT.md` for this app. `SITE_BRIEF.md` belongs to the earlier generic setup and does not define Forge's product.
- For Claude Code, use the installed skills in `.claude/skills/`: `emil-design-eng`, `impeccable`, and `taste-skill` (whose invocable name is `design-taste-frontend`). Read their `SKILL.md` files before applying them.
- For Codex, use the corresponding skills in `.agents/skills/`: `emil-design-eng`, `impeccable`, and `taste-skill` (invocable name `design-taste-frontend`). Read their `SKILL.md` files before applying them.
- Use Figma only when the brief supplies a design file or a Figma task. The official Figma Claude plugin is installed at user scope, but its MCP connection currently fails before authentication.
- Codex also has a project-scoped Figma MCP entry in `.codex/config.toml`. Its login currently fails before authentication during OAuth metadata discovery.
- Build the site, run it locally, then use Playwright MCP to inspect desktop and mobile layouts. Fix observed spacing, overflow, alignment, font loading, and interaction issues. Save final screenshots with the work.
- Do not invent testimonials, metrics, clients, or business details to fill an incomplete brief.

## Setup record (2026-09-28)

- Installed the three skills from their original public repositories into `.claude/skills/`.
- Added a project-scoped Playwright MCP server to `.mcp.json`. It uses installed Microsoft Edge and `NODE_OPTIONS=--use-system-ca` because Node's bundled CA set did not trust this machine's npm registry certificate chain.
- Installed the official `figma@claude-plugins-official` Claude plugin at user scope (version 2.2.120). Removed the duplicate project-scoped Figma MCP entry.
- Verified `@playwright/mcp` version `0.0.82` runs with that Node setting.
- Approved the project MCP config in Claude. `claude mcp list` and Claude's `/mcp` screen show Playwright connected with 25 tools.
- Figma's plugin server fails with `InvalidHTTPResponse` while fetching its OAuth resource metadata, before account authentication. Direct configuration failed the same way. The metadata URL returned HTTP 200 in PowerShell, curl, and Node with system CAs, so the problem appears specific to Claude's MCP connection path. Do not claim Figma access works until `/mcp` shows it connected after authentication.
- The Forge app brief arrived as a separate specification and supersedes the generic `SITE_BRIEF.md` for product decisions.

## Codex setup record (2026-09-28)

- Installed the same three skills in `.agents/skills/`, using the Codex-specific Impeccable package.
- Added project-scoped Playwright and Figma servers to `.codex/config.toml`. Playwright uses Microsoft Edge and Node system CAs, matching the tested Claude setup.
- Set project model `gpt-5.6-sol` because this installed Codex CLI (0.153.4) rejects the user-level `gpt-6-sol` setting for this ChatGPT account. A one-off Codex run succeeded with the project model. This overrides the model only inside Forge.
- `codex mcp list` shows both project servers. A Codex run used Playwright to open `https://example.com` and read the title `Example Domain`. This test used one-off automatic approval; a noninteractive run with approval policy `never` exposed the tool but refused its call.
- `codex mcp login figma` failed with `OAuth metadata discovery failed` / `error decoding response body`, before opening an authorization page. Figma is configured but not connected.

Keep this record current when setup or project state changes.

## Verification update (2026-09-28)

- Re-ran the updated migration in an isolated PostgreSQL 16 cluster after adding `forge_previous_sets`. The local checks passed, including latest-session selection and cross-owner isolation for the RPC, seed counts, owner-scoped RLS visibility, setup idempotence, and cross-owner food-link rejection. The temporary cluster was removed.
- On the current worktree, `npm run typecheck`, `npm run lint`, `npm test` (3 tests), and `npm run build` passed.
- Refreshed the 1440px and 390px development-preview screenshots, saved in `docs/screenshots/`. The preview explicitly labels its sample data. The design reviewer still found a repeated card-label pattern and a food action partly behind the fixed mobile navigation in the initial viewport. Authenticated workout usability at 390px remains unverified without a live Supabase project.
- Recorded the current visual system in `DESIGN.md` and `.impeccable/design.json`. These documents describe implemented tokens and preserve the unresolved review findings; they do not signal a design sign-off.
- A later feature audit found missing workout summary duration/exercise count, all-time PR calculation, routine day reassignment, and progress-photo date filtering. `docs/BUILD_STATUS.md` now marks the affected milestones partial.
- Workout completion now derives duration, completed-exercise count, and all-time set-volume PRs. The updated RPC and its owner isolation passed the disposable PostgreSQL 16 harness; typecheck, lint, tests, and build passed. Authenticated browser QA is still pending.
- Added routine exercise day reassignment and a progress-photo date filter. Typecheck, lint, build, and an owner-scoped routine reassignment in the disposable PostgreSQL 16 harness passed. Browser QA for those authenticated screens remains pending.
- `docs/REQUIREMENT_AUDIT.md` maps the source plan to current evidence. Its first pass found missing first-use flow, exercise-specific history, measurement charts, timer preferences, and meaningful offline behavior. Do not treat passing local checks as release proof.
- Added exercise-specific logged history and selectable measurement charts. Typecheck, lint, and build passed; these authenticated views still need browser QA. The requirement audit now marks the code as present without claiming live verification.
- Added guided first-use setup and `profiles.onboarding_completed_at`, with sign-up and confirmation routing and an app-route gate. The disposable PostgreSQL harness now has a reusable Windows runner in `scripts/test_local_db.ps1` and passed after the schema change. Typecheck, lint, tests, and build passed; live Auth, Storage, and responsive onboarding QA remain.
- Added profile-backed timer preferences and an elapsed-time countdown. The local database harness passed preference defaults and persistence; typecheck, lint, tests, and build passed. Browser notification and background-tab timing need live verification.
- Added a browser-local last-workout snapshot for the service worker's offline fallback. The Playwright check in `scripts/check_offline_preview.mjs` passed on a 390px viewport with network disabled and verified that injected HTML stays text; the screenshot is `docs/screenshots/offline-mobile.png`. Four unit tests, typecheck, lint, and build passed. Unsaved-set syncing remains incomplete.
- Added a durable browser-local queue for workout sets, with pending labels, reconnect/visibility retry, manual retry, and a sign-out warning. The offline fallback shows queued sets read-only. Queue unit tests, the 390px offline browser check, typecheck, lint, eight tests total, and build passed. The design detector reported only the standalone offline page's existing Arial fallback and dark button text as palette advisories. Live Supabase sync and install testing remain; other edit types do not queue offline.
- Replaced two-request workout creation with `forge_start_workout`, an invoker-rights RPC that creates a session and copies its exercises atomically, returning an existing active session on duplicate starts. The PostgreSQL harness passed rest-day rejection, idempotence, full-plan copy, unique-index enforcement, and empty-plan rollback. Live authenticated behavior remains unverified.
- Corrected measurement edits to explicitly clear blank values and validate converted range, with unit tests. Progress and onboarding now reject empty photo files and surface failed upload cleanup; Progress deletes the private file before removing its gallery row so a failed file deletion leaves a retryable record. Compact buttons, tabs, and nav targets now have a 44px CSS minimum. Typecheck, lint, ten tests, and build passed. The design detector surfaced existing CSS token advisories only. Live Storage and touch QA remain.
- Matched the mobile navigation to the specified five destinations, with an accessible More sheet for History, Journal, Routine, and Settings. The 360px Edge check in `scripts/check_mobile_nav.mjs` passed link count, Escape/focus return, 44px target boxes, overflow, and desktop sidebar behavior. `docs/screenshots/mobile-more.png` and refreshed desktop/mobile preview captures record the result. Authenticated route testing remains.
- Expanded the PostgreSQL harness to put owner fixtures in all 15 private tables and verify RLS enabled, owner reads, cross-owner read/update/delete isolation, and a forged-owner insert. Private Storage read/delete/insert isolation also passed. This remains a local stub harness; live Supabase Auth and Storage are unverified.
- Added remaining values for protein, carbs, and fat on the Nutrition screen, with an over-target label that also covers calories. Typecheck, lint, 11 tests, and production build passed. Signed-in Nutrition rendering still needs a live account.
- Today now lists the ordered exercises for the scheduled day, reports missing plan/day queries, and shows the body-weight change from the previous check-in. Refreshed development screenshots at 390px and 1440px; Edge checks passed seven exercise names, no horizontal overflow, and Start Workout inside the first mobile viewport. Typecheck, lint, 11 tests, build, and the Impeccable detector (zero anti-patterns) passed. Actual account data and start/resume remain unverified.
- Query inspection found the exercise-history filter and dated journal list lacked owner-first indexes. Added both to the initial migration; the PostgreSQL 16 harness passed. A source scan found no service-role or secret-key references in app source/public assets/Next config/env example. Production-scale plans, bundle audit, and Lighthouse remain.
- Added a Vitest alias config and rendered-component Today tests with controlled account data. Training-day ordered names/start navigation, rest-day behavior, and failed-plan error handling passed; typecheck, lint, and all 14 tests pass. These tests do not substitute for the live Supabase account round trip.
- Nutrition add/create/delete now catch rejected network promises, clear busy state in `finally`, and surface recovery messages. The add form retains its food selection on failure. Rendered-component tests passed successful food logging and a rejected insert followed by retry; typecheck, lint, 16 tests, build, and the Impeccable detector (zero anti-patterns) passed. Live Supabase persistence and slow-network/ambiguous-response behavior remain unverified.
- Workout-session Delete set, Skip, Replace exercise, Save notes, Finish/Cancel, and manual sync retry now release the busy state and show contextual errors after rejected requests. Session edit controls are disabled while requests run. Rendered-component tests passed failed Finish, Delete set, and Skip requests followed by retries; typecheck, lint, 19 tests, and build passed. Live account persistence and slow-network/ambiguous-response behavior remain unverified.
- Routine exercise reordering now calls the owner-scoped `forge_reorder_program_exercise` RPC, which swaps adjacent positions in one database transaction. The local PostgreSQL 16 harness passed swap/reverse, invalid and cross-owner input, and rollback after an injected mid-swap failure. A rendered-component test passed request rejection, retry, and new ordering. The local database runner and README now apply migrations in filename order. Typecheck, lint, 20 tests, and build passed; live Supabase editing remains unverified.
- The user added a request for a reference video for each workout. The working interpretation is one optional private video per scheduled training day; clarification about per-exercise videos was requested. Added `202609290002_workout_reference_videos.sql`, resumable MP4/WebM uploads up to 50 MiB, signed on-demand playback, replacement/removal controls in Edit routine, and playback access in a workout session. The PostgreSQL 16 harness passed owner/cross-owner metadata and Storage checks. Component tests passed upload, playback, replacement cleanup, validation, and no-video behavior; typecheck, lint, 24 tests, and build passed. The user said they applied the Supabase migrations; the configured project now exposes the video table and shows a private bucket with three policies, a 50 MB limit, and MP4/WebM restrictions. Live upload/playback and authenticated mobile QA remain unverified. The original source specification was preserved above a dated user addendum; the six working documents, README, PRODUCT.md, DESIGN.md, decisions, audit, and build status were updated.
- The Settings JSON export now includes workout-video metadata, while private media files remain in Storage.
- Pushed video feature commit `00a3fe9` to GitHub `main`; Vercel automatically deployed it to `forge-runo.vercel.app` and marked it Ready. The production project has all three public environment-variable names, and its app URL matches the domain. Added the exact production confirmation and password-reset callback URLs to Supabase Auth's allowlist, which previously had only the production root. An existing signed-in account loaded Today, Edit routine (showing the empty reference-video card), and Settings (showing video metadata export text). No video file or account data was changed during live inspection. Email flows, live upload/playback, separate preview/development environment, and authenticated mobile QA remain unverified.

## Application build record (2026-09-28)

- Initialized the local Git repository and built the Forge app from `docs/SOURCE_SPEC.md` using the three installed design skills.
- Added Next.js, Supabase migration and RLS, private photo Storage, auth flows, workout/nutrition/progress/journal/goals routes, unit conversion, export, and a static-only PWA offline fallback.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass. The PostgreSQL stub harness passed migration and isolation checks. See `docs/BUILD_STATUS.md` for the precise verification boundary.
- The local development-only `/design-preview` route is for responsive inspection; production responds with 404.
- A Supabase project URL/publishable key and GitHub remote are configured. The Supabase project exposes the workout-video table and private bucket, and Vercel production is live. Signed-in reads passed; writes, video transfer, and a separate preview/development environment remain. Exact exercise prescriptions need the missing original workout document.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

- 2026-09-29: The user clarified exercise-level reference media using Cable Lateral Raise and requested images alongside videos. Added a separate owner-scoped exercise-media table and private bucket, lazy routine/session disclosures, validation, signed viewing, removal, metadata export, and expanded local database isolation checks. The workout-day reference video remains separate. See `docs/BUILD_STATUS.md` for live upload and deployment results.

- 2026-09-29: Applied the exercise-media migration in the configured Supabase SQL Editor; Table Editor shows `exercise_reference_media` and Storage shows a private `exercise-reference-media` bucket with three policies, 50 MB cap, and the intended MIME list. Pushed `1dbcd04`; Vercel production is Ready. Signed-in mobile routine UI exposes the Cable Lateral Raise picker without horizontal overflow. The ChatGPT Edge extension refused local `fileChooser.setFiles` until its ?Allow access to file URLs? setting is enabled, so the user was given that setting and the exact-file upload/playback remains pending.

- 2026-09-29: Read-only production browser QA loaded Today, Nutrition, Progress, Workouts, Journal, Settings, Goals, and Edit routine at 375?390px without visible query alerts or horizontal overflow. The browser was returned to the open Cable Lateral Raise media form. This does not verify writes, upload/playback, email flows, or device touch behavior; those remain in `docs/BUILD_STATUS.md`. Latest Vercel commit `cf78508` is Ready.

- 2026-09-29: Added routine-template migration, three built-ins (Runo, Mom's beginner gym plan, blank), owner-private saved snapshots, atomic plan switching with historical programs retained, first-use selection, template management, and day editing. The mother's measurements are intentionally absent from shared template data; equipment and health restrictions remain open. See `docs/BUILD_STATUS.md` for verification and deployment boundary.
- 2026-09-29: Applied migration 004 in production, confirmed built-in counts of 35/13/0 exercises, and deployed UI commit `5072f16` to Vercel Ready. A signed-in save of “Runo's Current Routine” persisted after reload. Added development-only template preview and saved 390px/1440px screenshots. The requested Cable Lateral Raise MP4 is still pending because the Edge extension blocks file selection until its local-file permission is enabled. The user authorized the setting, but browser-control policy rejected `edge://extensions` and prohibited alternate routes, so the user was asked to enable it manually. New-account onboarding and live template switching remain unverified.
- 2026-09-29: The template preview passed 390px/1440px Playwright visual checks and no horizontal overflow at 390px; its local production route returned HTTP 404. Final typecheck, lint, and build passed. See `docs/screenshots/templates-*.png` and `docs/BUILD_STATUS.md`.
- 2026-09-29: Final template documentation, screenshots, preview, and accessible radio labels were pushed as `92d4062`. Vercel's deployment list reported that production commit Ready, and the production preview route returned HTTP 404. Typecheck, lint, 28 tests, and build passed. Live MP4 transfer still awaits the user-enabled Edge extension setting after browser-control policy rejected changing it via the agent.

- 2026-09-29: Found that the signup trigger and Today/Nutrition/Settings still assigned Runo's nutrition figures to accounts without chosen targets. Added migration 005 to stop seeding those values for new users; existing rows are preserved. Updated onboarding retry initialization, targetless summaries, and Today mobile action order. PostgreSQL harness, 30 tests, typecheck, lint, build, and 390px/1440px Edge preview passed. The Impeccable detector had existing token advisories only. Migration 005 and UI still need production application and live new-account proof; see `docs/BUILD_STATUS.md`.

- 2026-09-30: Published nutrition/Today correction as `3c7d087`. GitHub reports a successful Vercel check; production preview routes still return 404. Supabase browser-control failed before SQL Editor access, so migration 005 is not yet verified remotely. The worktree was clean after the push. Resume by applying migration 005, querying the function body or testing a new account, and recording the result.

- 2026-09-30: Hardened Settings profile and nutrition-target saves against rejected requests and surfaced initial/read-back errors. Added two rendered Settings tests for an empty target and a failed save followed by retry. Typecheck, lint, all 32 tests, and build passed. The browser-control service still cannot load its request-header policy, so remote migration 005 and live Settings persistence remain unverified.

- 2026-09-30: Pushed the Settings correction as `01f959f`; GitHub reports a successful Vercel status for that commit. The configured Supabase project's migration 005 and live new-account test remain pending because browser-control cannot connect.

- 2026-09-30: Added a GitHub Actions app gate for PRs and `main` pushes: install, typecheck, lint, test, and build on Node.js 24. Check the first remote run before calling CI verified. This does not cover PostgreSQL RLS or signed-in browser journeys.

- 2026-09-30: The first Verify run failed at `npm ci` before any code checks. Added install-error annotations for the next run; local offline dry-run of `npm ci` passed. GitHub's separate Supabase Preview check failed with `relation "profiles" already exists` in initial migration, indicating remote migration history needs inspection before relying on automatic database deployment. The browser-control connection is still unavailable, and no remote repair was attempted.

- 2026-09-30: The second Verify run again failed at `npm ci`; the public annotations showed only npm's usage footer. Local Linux-platform dry-run passed. Updated diagnostics to annotate the first 10 lines of npm output on the next run.
