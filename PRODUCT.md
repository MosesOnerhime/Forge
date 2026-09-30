# Forge

Forge is a private gym, nutrition, and physique progress tracker for someone following a structured training plan. The core promise is that logging a set is faster than thinking about logging it.

## Users and jobs

- A signed-in user sees today's scheduled workout or recovery day immediately.
- During training, the user sees previous performance beside the current set, logs weight, reps, and RIR quickly, and gets an automatic rest timer.
- The user can save a private reference video for a scheduled workout and open it during that workout without interrupting set logging.
- The user logs repeat foods, monitors daily macros, records body measurements and photos, and reviews change over time.
- Every user owns their data. The architecture allows separate accounts, even though initial use is personal.

## Product boundaries

- App: mobile-first Next.js web application and installable PWA.
- Data: Supabase Auth, PostgreSQL, private Storage, and Row Level Security.
- V1 has no social network, coach features, wearable sync, barcode scanning, public food API, payment, or AI physique analysis.
- Never make up a user measurement, progress result, testimonial, or nutritional claim.

## Core constraints

- One-tap access to today's plan and a completed set in about ten seconds.
- A lost network connection must never appear to have saved a workout silently.
- The interface uses the supplied dark palette, orange accent, and 8px spacing system.
- Body data and photos are private to their owner.

Source of truth: [docs/SOURCE_SPEC.md](docs/SOURCE_SPEC.md). Decisions and gaps: [docs/DECISIONS.md](docs/DECISIONS.md).

## Exercise references (2026-09-29)

A user can attach private reference images and videos to an individual exercise. The same references appear wherever that exercise is scheduled or logged; they do not move with a workout day. The weekly plan, routine editor, and session show a horizontal row of visible previews. Selecting a preview opens a larger image or video. The routine editor and session can add or remove references. The scheduled-day overview video remains separate and has its own visible preview.

During set logging, weight and reps start with the latest completed set for that exercise in the current workout, or the first set from the previous workout. For Dips and Upright Dips, zero added weight means body weight; a positive value is displayed as weighted dips.

## Routine templates

During setup, choose Runo's Workout Routine, Mom's Starter Routine, or a blank week. Edit day names and training/recovery status, then add and tune exercises. From Edit routine, open Templates to save your current week privately or load a saved or built-in week. A switch preserves prior workout history. Templates copy the schedule and prescriptions, while media remains private to its owner.
