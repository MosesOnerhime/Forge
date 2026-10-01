# 5. Backend Schema

## Purpose

Define how Forge stores fitness information and how those records relate.

---

## Entities

**profiles**  
User preferences and profile information.

**goals**  
Current fitness and physique goals.

**workout_programs**  
Training programs belonging to a user.

**workout_days**  
Individual days inside a program.

**exercises**  
Reusable exercise definitions.

**program_exercises**  
Exercise prescription inside a specific workout day.

**workout_sessions**  
An actual completed or active workout.

**session_exercises**  
Exercises performed during a session.

**workout_sets**  
Individual sets.

**nutrition_targets**  
Daily calorie and macro goals.

**foods**  
Saved foods.

**food_entries**  
Foods actually consumed.

**body_measurements**  
Weight and physique measurements.

**progress_photos**  
Stored progress-image metadata.

**journal_entries**  
Free-form notes.

---

## Tables

### profiles

```text
id UUID PK
user_id UUID UNIQUE NOT NULL
display_name VARCHAR(100)
units VARCHAR(10) DEFAULT 'metric'
timezone VARCHAR(50)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

Index:

`user_id`

---

### goals

```text
id UUID PK
user_id UUID NOT NULL
name VARCHAR(100) NOT NULL
description TEXT
start_date DATE
target_date DATE
active BOOLEAN DEFAULT true
created_at TIMESTAMPTZ
```

---

### workout_programs

```text
id UUID PK
user_id UUID NOT NULL
name VARCHAR(150) NOT NULL
description TEXT
active BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

### workout_days

```text
id UUID PK
program_id UUID NOT NULL
day_of_week SMALLINT
name VARCHAR(150)
estimated_minutes_min INTEGER
estimated_minutes_max INTEGER
is_rest_day BOOLEAN DEFAULT false
sort_order INTEGER
```

---

### exercises

```text
id UUID PK
user_id UUID
name VARCHAR(150) NOT NULL
primary_muscles TEXT[]
secondary_muscles TEXT[]
equipment VARCHAR(100)
notes TEXT
created_at TIMESTAMPTZ
```

---

### program_exercises

```text
id UUID PK
workout_day_id UUID NOT NULL
exercise_id UUID NOT NULL
sort_order INTEGER NOT NULL
target_sets INTEGER
min_reps INTEGER
max_reps INTEGER
rest_seconds_min INTEGER
rest_seconds_max INTEGER
notes TEXT
```

---

### workout_sessions

```text
id UUID PK
user_id UUID NOT NULL
workout_day_id UUID
started_at TIMESTAMPTZ NOT NULL
completed_at TIMESTAMPTZ
status VARCHAR(20) DEFAULT 'active'
notes TEXT
created_at TIMESTAMPTZ
```

Index:

`user_id, started_at DESC`

---

### session_exercises

```text
id UUID PK
session_id UUID NOT NULL
exercise_id UUID NOT NULL
sort_order INTEGER
notes TEXT
skipped BOOLEAN DEFAULT false
```

---

### workout_sets

```text
id UUID PK
session_exercise_id UUID NOT NULL
set_number INTEGER NOT NULL
weight_kg NUMERIC(6,2)
reps INTEGER
rir NUMERIC(3,1)
completed BOOLEAN DEFAULT false
completed_at TIMESTAMPTZ
notes TEXT
```

Index:

`session_exercise_id, set_number`

---

### nutrition_targets

```text
id UUID PK
user_id UUID NOT NULL
effective_from DATE NOT NULL
calories INTEGER
protein_g INTEGER
carbs_g INTEGER
fat_g INTEGER
created_at TIMESTAMPTZ
```

Initial targets:

- Calories: 2,800–3,000 kcal range.
- Protein: 160–180g.
- Fat: approximately 70–90g.
- Carbohydrates: remaining calories.

The existing diet plan explicitly uses fats around 70–90g/day and fills most remaining calories with carbohydrates.

---

### foods

```text
id UUID PK
user_id UUID NOT NULL
name VARCHAR(150) NOT NULL
serving_description VARCHAR(100)
serving_grams NUMERIC
calories NUMERIC
protein_g NUMERIC
carbs_g NUMERIC
fat_g NUMERIC
created_at TIMESTAMPTZ
```

---

### food_entries

```text
id UUID PK
user_id UUID NOT NULL
food_id UUID NOT NULL
logged_date DATE NOT NULL
meal_type VARCHAR(30)
quantity NUMERIC DEFAULT 1
calories NUMERIC
protein_g NUMERIC
carbs_g NUMERIC
fat_g NUMERIC
notes TEXT
created_at TIMESTAMPTZ
```

Index:

`user_id, logged_date`

---

### body_measurements

```text
id UUID PK
user_id UUID NOT NULL
measured_at DATE NOT NULL
weight_kg NUMERIC
waist_cm NUMERIC
chest_cm NUMERIC
shoulders_cm NUMERIC
bicep_left_cm NUMERIC
bicep_right_cm NUMERIC
forearm_left_cm NUMERIC
forearm_right_cm NUMERIC
thigh_left_cm NUMERIC
thigh_right_cm NUMERIC
neck_cm NUMERIC
calf_left_cm NUMERIC
calf_right_cm NUMERIC
notes TEXT
created_at TIMESTAMPTZ
```

Index:

`user_id, measured_at DESC`

---

### progress_photos

```text
id UUID PK
user_id UUID NOT NULL
photo_date DATE NOT NULL
view_type VARCHAR(20)
storage_path TEXT NOT NULL
notes TEXT
created_at TIMESTAMPTZ
```

`view_type`:

- front
- side
- back
- custom

---

### workout_reference_videos

```text
id UUID PK
user_id UUID NOT NULL
workout_day_id UUID NOT NULL UNIQUE
storage_path TEXT NOT NULL UNIQUE
original_name VARCHAR(255) NOT NULL
mime_type VARCHAR(20) NOT NULL (video/mp4 or video/webm)
file_size_bytes INTEGER NOT NULL (1 through 52,428,800)
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

The `(workout_day_id, user_id)` foreign key must point to a day owned by the same user. The Storage path starts with that user's ID and the workout day ID. The private `workout-reference-videos` bucket accepts only MP4/WebM files up to 50 MiB. Playback uses short-lived signed URLs.

---

### journal_entries

```text
id UUID PK
user_id UUID NOT NULL
entry_date DATE NOT NULL
title VARCHAR(200)
content TEXT NOT NULL
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## Relationships

```text
User
 ├── Profile
 ├── Goals
 ├── Workout Programs
 │     └── Workout Days
 │           └── Program Exercises
 │
 ├── Workout Sessions
 │     └── Session Exercises
 │           └── Workout Sets
 │
 ├── Nutrition Targets
 ├── Foods
 │     └── Food Entries
 │
 ├── Body Measurements
 ├── Progress Photos
 └── Journal Entries
```

---

## User ownership

Every user-specific record must ultimately resolve to a Supabase Auth user.

No user can access another user's:

- Workouts.
- Foods.
- Measurements.
- Photos.
- Goals.
- Journal.
- Nutrition information.

---

## Authentication flow

```text
Sign Up
  ↓
Verify Account if required
  ↓
Create Profile
  ↓
Authenticated Session
  ↓
Refresh Token
  ↓
Persistent Login
```

Password reset:

```text
Forgot Password
  ↓
Reset Email
  ↓
Secure Reset Link
  ↓
New Password
```

---

## Authorization rules

Supabase Row Level Security must enforce:

**SELECT**

`record.user_id = auth.uid()`

**INSERT**

`new.user_id = auth.uid()`

**UPDATE**

`record.user_id = auth.uid()`

**DELETE**

`record.user_id = auth.uid()`

Child tables must validate ownership through their parent entity.

---

## Data validation

Examples:

- Reps must be ≥0.
- Weight must be ≥0.
- RIR should normally remain within 0–10.
- Calories must be ≥0.
- Macronutrients must be ≥0.
- Measurements must be positive.
- Dates must be valid.
- Exercise names cannot be blank.
- Set numbers must be unique within an exercise session.
- Uploads must be valid supported image types.
- Workout reference uploads must be supported MP4/WebM files within the private bucket's size limit.
- File-size limits must be enforced.
- Emails must be unique through authentication.

---

## Retention and deletion

By default, fitness history remains available until the user deletes it.

Users should eventually be able to:

- Delete individual workouts.
- Delete foods.
- Delete measurements.
- Delete photos.
- Delete journal entries.
- Export account data.
- Delete the entire account.

Deleting a progress photo must also remove the associated Storage object.

Replacing or deleting a workout reference video must remove the superseded private Storage object; a failed cleanup stays visible for retry. The account JSON export includes `workout_reference_videos` rows but does not embed the private video files.

---

## Migration and seed data

Database migrations must be version controlled.

Initial seed data should include the current Forge workout plan.

### Monday

Back + Biceps + Forearms

- Weighted Pull-ups
- Chest-Supported Row
- Lat Pulldown
- Incline Dumbbell Curl
- Preacher Curl / Cable Curl
- Reverse Curl
- Wrist Curl / Reverse Wrist Curl

### Wednesday

Chest + Shoulders + Triceps

- Incline Barbell / Dumbbell Press
- Flat Dumbbell Press
- Cable Lateral Raise
- Rear Delt Fly
- Overhead Triceps Extension
- Cable Pushdown
- Dips

### Friday

Legs + Abs

- Back Squat
- Romanian Deadlift
- Bulgarian Split Squat
- Leg Curl
- Standing Calf Raise
- Hanging Leg Raise
- Cable Crunch

### Saturday

Back + Biceps + Forearms

- Chin-up / Neutral-Grip Pull-up
- Barbell Row
- Single-Arm Cable Row
- EZ-Bar Curl
- Hammer Curl
- Reverse Curl
- Farmer's Carry / Wrist Roller

### Sunday

Chest + Shoulders + Triceps

- Incline Dumbbell Press
- Upright Dips
- Cable / Machine Fly
- Cable Lateral Raise
- Reverse Pec Deck
- Skull Crusher / Overhead Cable Extension
- Rope Pushdown

The exact sets, rep ranges and rest times should be seeded from the existing workout specification rather than re-entered manually.  

---

### exercise_reference_media (2026-09-29)

`id UUID PRIMARY KEY`, `user_id UUID NOT NULL`, `exercise_id UUID NOT NULL`, `storage_path TEXT NOT NULL UNIQUE`, `original_name VARCHAR(255) NOT NULL`, `mime_type VARCHAR(20) NOT NULL`, `file_size_bytes INTEGER NOT NULL`, `created_at TIMESTAMPTZ NOT NULL`. A composite `(exercise_id, user_id)` foreign key targets `exercises(id, user_id)` with cascade delete. RLS allows only the owner. Paths begin with `<user_id>/<exercise_id>/`. The private `exercise-reference-media` Storage bucket has owner-folder policies and accepts JPG/PNG/WebP images and MP4/WebM videos. Images are at most 10 MiB; videos at most 50 MiB. Deletion removes the Storage file and metadata row. JSON export includes rows, not file bytes.

## Routine templates (2026-09-29)

`routine_templates(id, user_id nullable, name, description, days jsonb, created_at)` stores built-in rows with null owner and owner-private saved snapshots. RLS allows authenticated reads of built-ins and own rows; only owners can delete their rows. Inserts occur through `forge_save_routine_template`, not direct client writes. `workout_programs.source_template_id` records the selected source and becomes null if a private saved template is removed. Applying a template creates new program/day/plan rows while retaining archived programs for session history. Migration 202610010002 adds template reference metadata and creator-controlled sharing. Storage files are copied into each new owner's private routine on load.

## Nutrition target seed correction (2026-09-29)

Migration 005 changes `forge_seed_user` to leave `nutrition_targets` empty for new accounts. The owner enters targets during onboarding, which stores a dated row. Existing rows are retained; the migration does not rewrite another user's nutrition history. The local PostgreSQL harness asserts zero target rows immediately after two signups, then adds explicit owner fixtures for RLS checks.

## Set load interpretation (2026-09-30)

No schema change is needed for body-weight dips. `workout_sets.weight_kg` already allows zero: for Dips and Upright Dips, zero records body weight and a positive value records added external load. Existing set rows keep their numeric value. The client labels zero as body weight and positive values as weighted dips. Weight and rep suggestions come from saved or pending sets in the current session, then `forge_previous_sets` for the first set.

## Profile lifecycle migration (2026-10-01)

`202610010001_profile_lifecycle.sql` adds three authenticated-only, security-definer functions with an empty search path:

- `forge_profile_media()`: up to 1,000 Storage objects in the current user's folder across the three app buckets, including orphan uploads. Re-read after deletion until empty.
- `forge_reset_profile(p_expected_user uuid, p_confirmation text, p_delete_account boolean default false)`: assert the expected identity matches `auth.uid()`; verify confirmation and a live Auth row; lock it; reject remaining uploads; delete private records in dependency order. Reset recreates a default profile with incomplete onboarding. Delete removes `auth.users`, allowing its FK cascades to remove Auth sessions/identities. No shared template is deleted.
- `forge_account_exists()`: existence check used by a restrictive Storage policy to block stale JWTs from accessing or recreating files after Auth deletion.

All record filters derive their owner from `auth.uid()`, never the identity assertion argument. Storage files are deleted using the Storage API, not SQL; file cleanup and the subsequent database transaction are not atomic together. Already issued JWTs can remain valid until expiry, but removed account FKs and the live-account Storage policy block recreating app data.

## Template reference sharing (2026-10-01)

Migration `202610010002_template_references.sql` adds `routine_templates.is_shared`, `publisher_id`, and `source_program_id`, with a creator/source index. Built-ins retain null `user_id`; an assigned publisher controls Runo's starter. Ordinary saved templates retain their creator in `user_id`. Read RLS includes shared rows; direct template updates remain revoked, and delete stays owner-only.

`template_reference_media` links a template to an owner source exercise-media row or workout-video row, along with exercise name/day, source bucket/path, filename, MIME, and size. Source FK cascades remove links on reference deletion. Authenticated users can read only published links or their own links. No direct link mutation is granted. Triggers rebuild matching links after media insert/update/delete. Save snapshots the week and source program; owner Update refreshes the week/source. A one-time guarded bootstrap assigns the existing Runo starter only when the historical `Runo's Current Routine` owner is unique.

Authenticated RPCs: `forge_set_template_sharing(uuid,boolean)` and `forge_update_routine_template(uuid)` require the creator; `forge_template_import_targets(uuid,uuid)` maps a visible template's references to the caller's destination program. Existing save/apply RPCs include media linkage and shared-template selection. Internal sync/trigger functions are revoked from client roles. `forge_template_file_visible(text,text)` permits SELECT on only explicitly published source files, with no shared write/delete grant. All buckets stay private. Files are copied through Storage API under the importer ID, not through SQL. Exports include visible template-reference metadata.
