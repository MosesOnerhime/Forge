## 1. Product Requirements Document (PRD)

### Purpose
Define what Forge must do, who it is for, and how we know the product is working.

### Product name and one-sentence idea

**Product Name:** Forge

**Idea:** Forge is a personal gym, nutrition, and physique-progress tracker that combines a user's workout routine, workout logging, progressive overload, diet tracking, body measurements, progress photos, and fitness notes in one simple dashboard.

The initial version is primarily being built for personal use, but the architecture should support multiple independent users later.

---

### Target users

#### Primary user

Someone who:

- Follows a structured gym routine.
- Wants to know exactly what workout they have each day.
- Tracks sets, reps, weight and rest periods.
- Wants to progressively increase gym performance.
- Tracks calories, protein and general diet.
- Wants to monitor body weight and measurements.
- Takes progress photos.
- Wants all fitness information in one place.

Forge should be especially useful for someone training toward a specific physique goal instead of simply exercising casually.

---

### Problem and current workaround

Fitness information is currently scattered across:

- Workout documents.
- Notes apps.
- Photos.
- Memory.
- Food tracking apps.
- Calculator apps.
- Timers.
- Spreadsheets.

This makes it harder to quickly answer questions such as:

- What am I training today?
- What weight did I use last time?
- Did I progress from last week?
- How long should I rest?
- Am I eating enough protein?
- Is my weight moving in the right direction?
- How have my measurements changed?
- What did my physique look like three months ago?

Forge replaces these separate tools with one personal fitness dashboard.

---

### Goal and success measure

#### Primary goal

Make it extremely easy to consistently execute and track a structured training and nutrition plan.

#### Success measures

Forge V1 is successful if:

- A complete workout can be logged without leaving the app.
- Logging a set normally takes less than 10 seconds.
- The previous performance for an exercise is immediately visible.
- Rest timers automatically begin after sets.
- At least 90% of planned workouts can be accurately represented inside the system.
- Nutrition totals update automatically when food is logged.
- Weight, measurements and progress photos can be compared over time.
- The app works comfortably from a phone while standing in the gym.
- The user does not need a separate notes app, workout spreadsheet or rest timer for normal training.

---

### Current training baseline

Forge should initially ship with the current workout routine already loaded.

The current weekly structure is:

- Monday — Back + Biceps + Forearms
- Tuesday — Rest
- Wednesday — Chest + Shoulders + Triceps
- Thursday — Rest
- Friday — Legs + Abs
- Saturday — Back + Biceps + Forearms
- Sunday — Chest + Shoulders + Triceps

The sessions are designed around roughly 85–110 minutes, with Tuesday and Thursday reserved as recovery days.

The current nutrition baseline is approximately **2,800–3,000 kcal/day** with **160–180g protein/day**, adjusted based on weekly weight trends.

The system should also support the current progressive-overload approach: improving reps at a given weight before increasing the load, while normally keeping roughly 1–2 reps in reserve.

---

### Core features

| Feature | User benefit | Priority |
|---|---|---|
| Today Dashboard | Immediately see today's workout, nutrition and progress | P0 |
| Workout Routine | Store the full weekly training program | P0 |
| Workout Sessions | Start and complete today's workout | P0 |
| Set Logging | Record weight, reps and RIR | P0 |
| Previous Performance | See what was done last session | P0 |
| Rest Timer | Automatically track rest between sets | P0 |
| Workout History | Review previous workouts | P0 |
| Nutrition Dashboard | Track daily calories and macros | P0 |
| Food Logging | Record foods and meals | P0 |
| Saved Foods | Quickly reuse commonly eaten foods | P0 |
| Body Weight | Track weight over time | P0 |
| Body Measurements | Track waist, chest, arms, etc. | P0 |
| Progress Photos | Upload dated physique photos | P0 |
| Notes / Journal | Record training, diet or physique observations | P1 |
| Progress Charts | Visualize changes over time | P1 |
| Personal Goals | Store current physique and performance goals | P1 |
| Exercise PR Detection | Identify new personal bests | P1 |
| Routine Editing | Add, remove and reorder exercises | P1 |
| Workout Reference Video | Upload and watch one private technique or overview video for each scheduled workout day | P1 |
| PWA Installation | Install Forge on mobile like an app | P1 |
| Data Export | Export workout and progress information | P2 |
| Multiple Training Programs | Switch between different programs | P2 |

---

### Out of scope for version one

The following should wait:

- Social features.
- Following other users.
- Public profiles.
- Leaderboards.
- Coaches managing clients.
- AI-generated workout programs.
- AI physique analysis.
- Automatic meal recognition from photos.
- Barcode scanning.
- Wearable integration.
- Apple Health integration.
- Google Fit / Health Connect integration.
- Smartwatch application.
- A public or shared exercise video library (private exercise reference media is implemented).
- Community workout marketplace.
- Payments or subscriptions.
- Public food database.
- Automatic calorie recommendations.
- Advanced strength forecasting.

The initial app should remain focused on **logging and understanding personal progress**.

---

### User stories

**Workout**

As a user, I want to see today's workout immediately so I know what I need to train.

As a user, I want to enter my weight and reps after each set so I can track performance.

As a user, I want to see my previous performance beside the current exercise so I know what I am trying to beat.

As a user, I want the rest timer to start after completing a set so I do not need another timer.

As a user, I want to record RIR so I can track training intensity.

As a user, I want to substitute an exercise when equipment is unavailable without destroying the original routine.

As a user, I want to upload a reference video for a scheduled workout and watch it during the session without leaving Forge.

**Nutrition**

As a user, I want to log food so I can monitor calories and protein.

As a user, I want frequently eaten foods saved so logging meals does not become tedious.

As a user, I want to see calories and macros remaining for the day so I can adjust what I eat.

**Progress**

As a user, I want to log my body weight so I can see whether my bulk or cut is progressing correctly.

As a user, I want to record body measurements so I can see where I am gaining size.

As a user, I want to upload physique photos so I can visually compare progress.

As a user, I want to compare two dates so I can see how my body has changed.

**Journal**

As a user, I want to write quick notes about training, diet, injuries or performance so I can refer to them later.

---

### Acceptance criteria

#### Today's workout

**Given** that a workout is scheduled for today,  
**when** the user opens Forge,  
**then** today's workout name, estimated duration and exercises are visible on the dashboard.

#### Starting a workout

**Given** that today's workout exists,  
**when** the user selects **Start Workout**,  
**then** a new workout session is created and the first exercise appears.

#### Logging sets

**Given** that the user is performing an exercise,  
**when** they enter weight and reps and complete the set,  
**then** the set is stored and immediately visible in the session.

#### Rest timer

**Given** that an exercise has a configured rest period,  
**when** the user completes a working set,  
**then** the appropriate rest timer automatically begins.

#### Workout reference video

**Given** that the user has saved a supported video for a training day,
**when** they open that workout session,
**then** they can play the private video in Forge. Replacing or removing it must not alter the exercise plan or past set logs.

#### Previous performance

**Given** that the user has performed an exercise before,  
**when** that exercise appears in a new session,  
**then** the previous session's weight and repetitions are displayed.

#### Nutrition

**Given** that daily nutrition targets exist,  
**when** food is logged,  
**then** calories, protein, carbohydrates and fats consumed and remaining update automatically.

#### Measurements

**Given** that previous measurements exist,  
**when** a new measurement is saved,  
**then** Forge updates the relevant progress chart.

#### Progress photos

**Given** that the user uploads a valid image,  
**when** the upload completes,  
**then** the photo appears under the selected date and view type.

#### Workout history

**Given** that previous sessions exist,  
**when** the user opens History,  
**then** previous workouts can be viewed by date.

---

### Open questions

Decisions that can be made after V1 development begins:

- Whether Google sign-in should be supported immediately.
- Whether nutrition should eventually use a third-party food database.
- Whether progress photos should support automated alignment.
- Whether multiple workout programs should be introduced in V1.1 or V2.
- Whether Forge remains completely personal or eventually becomes a public product.
- Whether Apple Health integration is worth adding later.
- Whether calorie and macro targets should eventually adjust automatically based on weight trends.

---

## Exercise reference media addendum (2026-09-29)

The user specified Cable Lateral Raise as the target for a test video and asked for reference images as well. An account owner can attach multiple private JPG, PNG, or WebP images (10 MiB each) and MP4 or WebM videos (50 MiB each) to an individual exercise. The owner can view and remove them in Edit routine; the current exercise's references are available during a session. References follow the exercise across training days and are separate from the single optional workout-day video. File bytes stay in private Storage; JSON export contains metadata.

Acceptance: an owner can upload a supported file, see its name, open a signed image/video link, and see it on the same exercise in a session. Another account cannot read, attach, or delete that media. Unsupported, empty, or oversized files are rejected before upload.

## Routine templates addendum (2026-09-29)

First-use setup offers Runo's Workout Routine, Mom's Starter Routine, and a blank week. Selection loads seven days and their exercise prescriptions. A signed-in user can edit day names, training/recovery state, durations, exercises, and prescriptions; save the current week as a private template; and load a template later. Switching archives the previous program so past sessions still resolve to their original days. Active sessions block a switch. Exercise reference media remains owner-private and attached to the owner's exercise records; scheduled-day videos stay with the archived days. Runo's initial prescriptions remain provisional until the missing original document is supplied.

## Personal nutrition targets (2026-09-29)

Each new account chooses its own calorie and macro targets during setup. Runo's numbers may prefill only when Runo's routine is selected; another routine must not inherit them. Today and Nutrition show logged amounts without a made-up goal if no target exists, with a path to Settings to add one.
