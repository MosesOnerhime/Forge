# 2. Technical Requirements Document (TRD)

## Purpose

Make technical choices explicit so development does not depend on assumptions.

---

### Platforms

Primary:

- Responsive web application.
- Mobile-first interface.
- Desktop support.

Secondary:

- Progressive Web App installation on iOS and Android.

Native iOS and Android apps are not required for V1.

---

### Frontend and hosting

**Framework**

Next.js using:

- App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui

**Hosting**

Vercel.

**Design approach**

Mobile-first responsive application.

The workout experience should be particularly optimized for approximately 360–430px wide phone screens.

---

### Backend and database

**Backend platform**

Supabase.

**Database**

PostgreSQL.

**Supporting services**

Supabase:

- Database
- Authentication
- Storage
- Row Level Security
- Server-side functions where necessary

**Region**

Use the lowest-latency suitable Supabase region available to the primary user when the production project is created.

Development and production databases must remain separate.

---

### Authentication and roles

V1 authentication:

- Email + password.
- Password reset.
- Persistent sessions.

Optional:

- Google authentication.

Roles:

**User**
- Can access only their own data.

**Admin**
- Reserved for future administrative functions.

There is no trainer or coach role in V1.

---

### External services and APIs

V1 should deliberately minimize external dependencies.

Required:

**Supabase**
- Authentication.
- Database.
- Photo storage.

**Vercel**
- Hosting and deployment.

Optional future services:

- Food database API.
- Apple Health.
- Health Connect.
- Error monitoring.
- Analytics.

No third-party food API should be required for the first version.

---

### Architecture

```text
User
  │
  ▼
Next.js Web Application
  │
  ├──────────────┐
  │              │
  ▼              ▼
Supabase Auth   Application API / Server Actions
                  │
                  ▼
             PostgreSQL
                  │
                  ├── Workouts
                  ├── Nutrition
                  ├── Measurements
                  ├── Goals
                  └── Journal
                  
User
  │
  ▼
Progress Photo Upload
  │
  ▼
Supabase Storage
```

The browser communicates with Next.js and Supabase.

Authentication determines the current user.

Every user-owned database record contains a `user_id`.

Supabase Row Level Security prevents users from reading or modifying another user's records.

Workout reference videos use a separate private Storage bucket and an owner-scoped metadata table linked to `workout_days`. The browser uploads MP4/WebM files in resumable chunks, capped at 50 MiB, and requests a time-limited signed URL when playback begins. Storage paths include the owner ID and workout day ID; RLS prevents another account from listing, inserting, or deleting them.

---

### Security and privacy

Forge contains potentially sensitive personal information including:

- Body weight.
- Body measurements.
- Nutrition.
- Progress photographs.
- Workout reference videos.
- Workout history.
- Personal notes.

Requirements:

- HTTPS only.
- Row Level Security enabled.
- Private storage bucket for progress photos.
- Signed URLs used for private images.
- Users can only access their own records.
- Service-role credentials never exposed to the browser.
- Environment secrets stored securely.
- Database input validated server-side.
- Upload file types restricted.
- Upload size restricted.
- Rate limiting added where appropriate.
- Users must be able to delete progress photos.
- Users must eventually be able to delete/export their account information.

---

### Performance and reliability targets

Target:

- Initial usable screen under approximately 2.5 seconds on a reasonable mobile connection.
- Normal UI interactions under 200ms where no network round trip is required.
- Typical database operations under 500ms.
- Workout set logging must feel immediate.
- Optimistic UI may be used when appropriate.
- Failed writes must be clearly communicated.
- No completed workout should silently disappear because of a network error.
- Production database backups must be enabled according to the selected hosting plan.
- Target application availability: 99.9%, excluding upstream provider failures.

---

### Environments and delivery

Environments:

**Development**
- Local development.
- Development Supabase instance.

**Preview / Staging**
- Vercel preview deployments.
- Separate staging database where needed.

**Production**
- Production Vercel deployment.
- Production Supabase instance.

Source control:

GitHub.

CI/CD:

```text
Feature Branch
     ↓
Pull Request
     ↓
Lint + Type Check + Tests
     ↓
Vercel Preview
     ↓
Review
     ↓
Main Branch
     ↓
Production Deployment
```

Database migrations must be stored in source control.

---

### Key technical decisions and tradeoffs

#### Next.js instead of separate React + API projects

**Reason:** Faster development and one codebase.

**Tradeoff:** More framework-specific architecture.

---

#### Supabase instead of building a custom backend

**Reason:** Authentication, PostgreSQL and file storage are already integrated.

**Tradeoff:** Some platform dependency.

---

#### PostgreSQL instead of NoSQL

**Reason:** Workout sessions, sets, programs and exercises have clear relationships.

**Tradeoff:** Schema changes require controlled migrations.

---

#### PWA instead of native mobile app

**Reason:** Much faster development while still supporting phone use.

**Tradeoff:** Less native device integration.

---

#### Manual nutrition database initially

**Reason:** The user repeatedly eats many of the same foods, making saved foods sufficient for V1.

**Tradeoff:** New foods require manual entry.

---

## Exercise reference media (2026-09-29)

`202609290003_exercise_reference_media.sql` adds owner-scoped `exercise_reference_media` with a composite `(exercise_id, user_id)` foreign key to `exercises`, path checks for owner and exercise IDs, MIME and size constraints, and RLS. The private `exercise-reference-media` bucket accepts JPG/PNG/WebP and MP4/WebM, with a 50 MiB bucket cap; the table and client cap images at 10 MiB. Storage object policies restrict owner-folder reads, inserts, and deletes. Videos use the existing resumable TUS client; images use Storage upload. Metadata is inserted after the file, failed inserts trigger cleanup, and ambiguous saves are checked by path. Signed URLs are requested on View. JSON export includes metadata only.

## Routine templates (2026-09-29)

Migration `202609290004_routine_templates.sql` adds RLS-protected `routine_templates` with nullable owner for read-only built-ins, JSONB seven-day snapshots, and a source-template reference on active programs. `forge_save_routine_template` snapshots the caller's active week. `forge_apply_routine_template` checks authentication and ownership, serializes a switch per profile, rejects active sessions, deactivates the previous program, and creates a complete new program inside one transaction. The old program and days remain for historical foreign keys. Onboarding asks the apply RPC to reuse an already selected active template during retry. Built-ins contain no private media or personal body metrics.

## Nutrition seed correction (2026-09-29)

Migration `202609290005_nutrition_target_choice.sql` replaces `forge_seed_user` so signup creates the profile and provisional workout fallback without inserting Runo's nutrition values into every account. Onboarding writes owner-chosen targets after the routine choice. Existing target rows are preserved. Client summaries handle a missing target as an unset state and avoid division by zero.
