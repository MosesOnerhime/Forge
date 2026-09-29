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
