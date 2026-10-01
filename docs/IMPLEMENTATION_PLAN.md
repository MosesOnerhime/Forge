# 6. Implementation Plan

## Purpose

Build Forge incrementally while keeping every milestone usable and testable.

---

## Milestone 1 — Project setup

### Task 1.1 — Repository

**Owner:** AI development agent

**Inputs:** Technical specification.

**Output:** GitHub repository.

**Definition of done:**

- Next.js project created.
- TypeScript configured.
- Tailwind configured.
- shadcn/ui configured.
- Linting works.
- Type checking works.

**Dependencies:** None.

---

### Task 1.2 — Supabase

**Owner:** AI development agent

**Output:** Development Supabase project configuration.

**Definition of done:**

- Environment variables configured.
- Supabase client established.
- Server/client authentication helpers work.

---

### Task 1.3 — Deployment

**Owner:** AI development agent

**Output:** Vercel preview deployment.

**Definition of done:**

Application successfully builds and is accessible from a preview URL.

---

## Milestone 2 — Data and authentication

Build:

1. Authentication.
2. Profile.
3. Database migrations.
4. RLS policies.
5. Seed data.
6. Storage configuration.
7. Database tests.

Checkpoint:

A user can create an account, log in and load their seeded workout plan.

---

## Milestone 3 — Core user journey

Implementation order:

### 3.1 Today Dashboard

Build:

- Current date.
- Today's scheduled workout.
- Rest-day state.
- Nutrition summary.
- Weight summary.

### 3.2 Workout Session

Build:

- Start workout.
- Session persistence.
- Exercise list.
- Set entry.
- Weight.
- Reps.
- RIR.

### 3.3 Exercise history

Show the previous performance for each exercise.

### 3.4 Rest timer

Automatically start after a completed set.

Requirements:

- Pause.
- Resume.
- Skip.
- Reset.
- Notification/sound when complete where browser permissions allow.

### 3.5 Workout completion

Generate:

- Duration.
- Total exercises.
- Completed sets.
- Total training volume where relevant.
- PRs.

Checkpoint:

An entire gym session can be completed using Forge without another workout-tracking app.

---

## Milestone 4 — Secondary features

Build in this order:

### Nutrition

- Food library.
- Food logging.
- Meals.
- Daily calories.
- Protein.
- Carbohydrates.
- Fats.

### Measurements

- Add measurements.
- Edit measurements.
- Historical graph.

### Progress photos

- Upload.
- Private storage.
- Gallery.
- Date filtering.
- Front/side/back categories.
- Compare dates.

### History

- Workout history.
- Individual session details.
- Exercise history.

### Journal

- Create.
- Edit.
- Delete.
- Browse previous notes.

### Routine editor

- Add exercises.
- Delete exercises.
- Reorder exercises.
- Change sets/reps/rest.
- Change training day.
- Upload, replace, play, and remove one private reference video per training day.
- Show that video on demand during a workout session.

---

## Milestone 5 — Quality

Test:

- Authentication.
- Row Level Security.
- Invalid inputs.
- Network failure.
- Duplicate submissions.
- Session restoration.
- Mobile layouts.
- Desktop layouts.
- Keyboard navigation.
- Touch targets.
- Contrast.
- Image uploads.
- Large images.
- Deleted images.
- Video type/size validation, replacement cleanup, private playback, and deleted videos.
- Slow networks.
- Empty states.
- Rest days.
- Incomplete workouts.

Performance audit:

- Lighthouse.
- Database query inspection.
- Image optimization.
- Bundle size review.

Security review:

- No service-role keys in client bundles.
- RLS on every private table.
- Signed progress-image URLs.
- Validated uploads.
- Secure environment variables.

---

## Milestone 6 — Release

### Test plan

Perform a complete real-world simulation:

```text
Create account
→ Open Monday workout
→ Complete every exercise
→ Log all sets
→ Use rest timers
→ Finish workout
→ Add meals
→ Add weight
→ Add measurements
→ Upload progress photos
→ Write journal entry
→ Log out
→ Log back in
→ Confirm everything remains
```

Then test:

- Tuesday rest state.
- Wednesday workout.
- Historical comparison.
- Mobile PWA installation.

---

### Production release

Release checklist:

- Production Supabase project.
- Production database migrations.
- RLS verification.
- Production Storage bucket.
- Environment variables.
- Custom domain.
- Vercel deployment.
- Error monitoring.
- Backup configuration.
- Analytics if required.

---

### Rollback

Each production release must:

- Come from version-controlled source.
- Have a previous deploy available.
- Keep database migrations reversible where practical.
- Avoid destructive schema changes without backups.

---

## Build rule for every milestone

Before moving to the next milestone:

1. Run the application.
2. Test the feature on mobile and desktop.
3. Verify its relevant acceptance criteria.
4. Fix blocking defects.
5. Record unresolved non-blocking issues.
6. Update project documentation.
7. Only then continue.

The main development principle for Forge is:

**Logging should always be faster than thinking about logging.**

If entering workout or nutrition information becomes tedious, the feature should be simplified rather than adding more complexity.

## Exercise reference media extension (2026-09-29)

Added an exercise-owned media table and private Storage bucket, file validation, resumable video and direct image upload, lazy routine/session disclosures, signed viewing, removal, metadata export, and local RLS/Storage checks. Migration `202609290003_exercise_reference_media.sql` and the app are deployed. On 2026-09-30, the supplied Cable Lateral Raise MP4 was uploaded through Edit routine, played through a signed source, and remained after reload. Image upload, session viewer, and cross-account live checks remain.

## Visible references and faster set logging (2026-09-30)

Replace closed reference disclosures with visible preview rows in Workouts, Edit routine, and sessions. Open media in a larger viewer, sign preview links on load and a fresh link on selection, and permit exercise and workout-day reference uploads from a session. Prefill a new set from the latest completed current-session set, falling back to last workout's first set; allow edits. Record zero added load for Dips/Upright Dips as body weight and identify positive loads as weighted dips. Verify image and video cards, modal opening, session upload controls, set defaults, body-weight and weighted labels, mobile/desktop layout, then production signed-in behavior.

Follow-up: put native inline controls on each video tile and give it a separate Expand button. Move rest state to an app-shell provider with per-user local persistence and a wall-clock deadline. Verify inline play and expand independently at phone and desktop widths; verify the timer across app navigation, browser tab backgrounding, reload, pause/resume, and completion. Local tests cover route persistence and reload timing; authenticated browser checks remain to run after deployment.

## Routine template extension (2026-09-29)

Apply migration 004 before deploying the picker. Verify three built-ins, owner-only saved templates, onboarding choice, blank-week editing, save/reload, active-session rejection, and preserved session history in the local database harness and signed-in browser. Complete mobile and desktop visual checks. The missing original Runo prescriptions and the mother's equipment/health restrictions remain open inputs for plan refinement.

## Nutrition and Today correction (2026-09-29)

Apply migration 005 before deploying the UI that removes the universal nutrition fallback. Verify a new account has no seeded nutrition row, then complete onboarding with each template choice and check that only account-entered targets appear in Today and Nutrition. Check the phone layout at 390px for both Start workout and Log food above the fixed navigation. The local database, rendered component, and layout checks cover part of this; a real new-account flow remains required.

## Profile lifecycle addition (2026-10-01)

Implemented Settings reset/delete confirmations, owner-folder media cleanup, atomic database reset or Auth deletion, stale-account Storage guard, and local-data cleanup. Component/helper tests cover confirmation, batching, cleanup failure/retry, foreign paths, deletion sign-out, and retained local data after a failed database change. PostgreSQL checks cover owner identity, remaining-file guard, injected rollback, historical FK chains, private/shared templates, reset/reinitialization, deletion, stale-token denial, and other-owner preservation. Production migration/deployment and read-only Settings browser QA are recorded in BUILD_STATUS.
