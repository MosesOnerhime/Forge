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

## Application build record (2026-09-28)

- Initialized the local Git repository and built the Forge app from `docs/SOURCE_SPEC.md` using the three installed design skills.
- Added Next.js, Supabase migration and RLS, private photo Storage, auth flows, workout/nutrition/progress/journal/goals routes, unit conversion, export, and a static-only PWA offline fallback.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass. The PostgreSQL stub harness passed migration and isolation checks. See `docs/BUILD_STATUS.md` for the precise verification boundary.
- The local development-only `/design-preview` route is for responsive inspection; production responds with 404.
- Remote Supabase, GitHub, and Vercel setup needs the user's project/account destinations. Exact exercise prescriptions need the missing original workout document.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
