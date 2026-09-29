# Requirement audit

Last checked: 2026-09-29. Source of truth: `SOURCE_SPEC.md`, especially the PRD acceptance criteria, App Flow, TRD, and Implementation Plan. “Code present” means implementation exists in the current repository; it does not mean a signed-in user journey passed.

| Requirement | Current evidence | Status / next proof |
| --- | --- | --- |
| Six project documents and source preservation | `SOURCE_SPEC.md`, `PRD.md`, `TRD.md`, `APP_FLOW.md`, `DESIGN_BRIEF.md`, `BACKEND_SCHEMA.md`, `IMPLEMENTATION_PLAN.md` | Present. |
| Next.js, TypeScript, Tailwind, shadcn configuration | `package.json`, `components.json`, `src/app`, build output | Local typecheck, lint, and build pass. |
| Owner-scoped Auth, database, private photos | Supabase migration, SSR/client helpers, local PostgreSQL harness | Local migration, seed, RLS visibility, cross-owner checks pass. Supabase Auth, email, and Storage need a live project. |
| Today, routine, sessions, set logging, previous performance, rest timer, and history | `src/app/(app)/today`, `workouts`, `workouts/session/[id]`; `forge_start_workout`, `forge_previous_sets` | Code present. Local SQL checks cover atomic/idempotent start, empty-plan rollback, previous sets, and all-time volume best; full gym session remains untested with a real account. |
| Routine changes, including training-day reassignment | `src/app/(app)/workouts/routine/page.tsx`; local SQL reassignment check | Code present and destination ordering passed locally. Signed-in mobile and desktop UI remain untested. |
| Exercise-specific history | `src/app/(app)/workouts/exercise/[id]` lists logged sets across sessions; session cards link to it | Code present. Signed-in query and mobile layout remain untested. |
| Nutrition totals, saved foods, meals, targets | Nutrition and settings routes | Code present. Live persistence and boundary checks remain. |
| Weight and measurement tracking | Progress route, `body_measurements`, selectable chart field | Code present for weight and other measurements. Signed-in chart behavior remains untested. |
| Progress-photo upload, categories, dates, compare, delete | Progress route, private Storage policies | Code present, including gallery date filter. Upload, signed URL, deletion, and large-image behavior need live tests. |
| Journal, goals, unit conversion, export | Journal, goals, settings, export component, unit tests | Code present. Account data round trip remains untested. |
| First-use journey | `/onboarding` collects profile, units, goal, targets, optional starting measurements/photo, and displays the seeded plan; app routes check `onboarding_completed_at` | Code present. Real sign-up, confirmation redirect, optional upload, and final redirect need live Supabase testing. |
| Workout and timer settings | Routine editor, Settings default rest and notification controls, elapsed-time rest timer | Code present. Browser notification permission and background countdown need live device checks. |
| PWA install and offline behavior | Manifest, service worker, offline snapshot, owner-scoped pending-set queue with automatic and manual retry | Partly present: unit tests prove queue replacement/retry/isolation; a browser test proves the offline snapshot shows a pending set and escapes user text. Live upload/reconnect and install behavior remain untested. Offline support covers workout sets, not all edit types. |
| Mobile UI, accessibility, reliability, performance | Development preview captures; typecheck, lint, build | Partial. Design verdict is `fix`; authenticated workout at 390px, keyboard/touch checks, Lighthouse, slow-network and failure cases remain. |
| Preview and production release | Local Git commits, `.env.example`, deployment instructions | Pending Supabase, GitHub, and Vercel destinations; no preview URL or production account simulation. Exact workout prescriptions were not supplied. |

The implementation plan's final test is a real account round trip: create account, finish a workout, log food and measurements, upload photos, write a journal entry, sign out and back in, then verify all records. Local compilation and stubbed PostgreSQL tests do not cover this sequence.
