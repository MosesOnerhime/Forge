# Forge — Product & Technical Specification

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
- Exercise video library.
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

---

### Security and privacy

Forge contains potentially sensitive personal information including:

- Body weight.
- Body measurements.
- Nutrition.
- Progress photographs.
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

# 3. App Flow

## Entry points

Users can arrive through:

- Main domain.
- PWA home-screen icon.
- Login page.
- Deep link to a workout session.
- Deep link to progress.

Authenticated users should normally land on **Today**.

---

## Screen inventory

### Login

Purpose:
Authenticate the user.

Data:

- Email.
- Password.

---

### Today / Dashboard

Purpose:
Give an immediate overview of the day.

Displays:

- Date.
- Today's training/rest status.
- Workout name.
- Estimated workout length.
- Start/Resume Workout button.
- Calories.
- Protein.
- Carbohydrates.
- Fat.
- Latest body weight.
- Recent progress indicator.
- Quick actions.

---

### Workout Session

Purpose:
Perform and log today's workout.

Displays:

- Exercise name.
- Target sets.
- Target rep range.
- Target rest.
- Primary muscles.
- Previous performance.
- Current set.
- Weight.
- Reps.
- RIR.
- Rest timer.
- Notes.

---

### Routine

Purpose:
View and edit the weekly training plan.

Displays:

- Monday–Sunday schedule.
- Rest days.
- Exercises.
- Sets.
- Rep ranges.
- Rest periods.
- Exercise order.

---

### Nutrition

Purpose:
Track food and daily nutrition.

Displays:

- Calories consumed / target.
- Protein.
- Carbohydrates.
- Fat.
- Meals.
- Foods.
- Add Food.

---

### Food Library

Purpose:
Store frequently eaten foods.

Examples:

- Eggs.
- Rice.
- Chicken.
- Fish.
- Oats.
- Milk.
- Plantain.
- Beans.
- Soybean powder.

---

### Progress

Purpose:
Visualize physical changes.

Displays:

- Weight graph.
- Measurement graphs.
- Progress photos.
- Date comparison.

---

### Measurements

Purpose:
Record body measurements.

Possible measurements:

- Weight.
- Waist.
- Chest.
- Shoulders.
- Biceps.
- Forearms.
- Thighs.
- Neck.
- Calves.

---

### Progress Photos

Purpose:
Track visual changes.

Photo categories:

- Front.
- Side.
- Back.
- Optional custom.

---

### History

Purpose:
Review previous workouts.

Displays:

- Calendar/date list.
- Workout performed.
- Duration.
- Exercises.
- Sets.
- PRs.

---

### Journal

Purpose:
Store free-form fitness notes.

---

### Settings

Purpose:

- Profile.
- Units.
- Nutrition targets.
- Workout settings.
- Timer settings.
- Account management.

---

## Primary workout journey

```text
Today
  ↓
Start Workout
  ↓
Workout Session
  ↓
Exercise 1
  ↓
Enter Weight + Reps + RIR
  ↓
Complete Set
  ↓
Rest Timer
  ↓
Next Set / Exercise
  ↓
Finish Workout
  ↓
Workout Summary
  ↓
Today
```

---

## Nutrition journey

```text
Today
  ↓
Nutrition
  ↓
Add Food
  ↓
Select Saved Food
  ↓
Enter Quantity
  ↓
Save
  ↓
Updated Daily Macros
```

---

## Progress-photo journey

```text
Progress
  ↓
Progress Photos
  ↓
Add Photo
  ↓
Select Front / Side / Back
  ↓
Choose Image
  ↓
Upload
  ↓
Progress Gallery
```

---

## Alternate journeys

Users may:

- Cancel an unfinished workout.
- Resume an unfinished workout.
- Skip an exercise.
- Replace an exercise.
- Add an additional set.
- Delete an accidental set.
- Edit previously logged values.
- Pause a rest timer.
- Skip a rest timer.
- Return to the dashboard without ending a workout.
- Add food retroactively.
- Edit measurements from previous dates.

---

## Action-state requirements

| Action | Validation | Loading | Success | Error | Next |
|---|---|---|---|---|---|
| Start Workout | Workout exists | Button spinner | Session created | Retry message | Session |
| Save Set | Valid reps/weight | Optimistic save | Set marked complete | Unsaved warning | Rest Timer |
| Add Food | Valid quantity | Save indicator | Macros update | Retry | Nutrition |
| Add Measurement | Numeric valid value | Save indicator | Chart updates | Field error | Progress |
| Upload Photo | Image type/size | Upload progress | Photo appears | Retry/remove | Gallery |
| Finish Workout | At least one logged set | Summary calculation | Session completed | Retry | Summary |

---

## Navigation rules

Mobile bottom navigation:

**Today | Workout | Nutrition | Progress | More**

`More` contains:

- History.
- Journal.
- Routine.
- Settings.

During an active workout, the workout session becomes the primary screen.

Browser back must never accidentally delete an active workout.

An active workout should remain resumable after navigation or refresh.

---

## Empty and blocked states

### No workout today

Display:

**Rest Day**

Show:

- Recovery message.
- Nutrition progress.
- Recent weight.
- Optional previous workout.

### No workout history

Display:

**Complete your first workout to start tracking progress.**

### No measurements

Display:

**Add your first measurement.**

### No progress photos

Display:

**Upload your first progress photo.**

### Offline

Previously loaded workout data should remain visible where possible.

Unsaved changes should display:

**Waiting to sync.**

### Permission denied

Never expose another user's data.

Return to a safe dashboard or authentication screen.

---

## First-use journey

```text
Open Forge
   ↓
Create Account
   ↓
Basic Profile
   ↓
Units: kg / cm
   ↓
Fitness Goal
   ↓
Load Default Forge Training Plan
   ↓
Set Nutrition Targets
   ↓
Optional Starting Weight + Measurements
   ↓
Optional Progress Photos
   ↓
Today Dashboard
```

For the initial personal deployment, the existing routine should already be preloaded.

---

# 4. UI and UX Design Brief

## Purpose

Create an interface that feels like a focused training tool rather than a complicated health-management platform.

---

### Audience and tone

Audience:

People seriously tracking gym progress without wanting excessive complexity.

Design adjectives:

**Strong. Clean. Focused.**

Forge should feel athletic and premium rather than aggressive or stereotypically "bodybuilding."

---

### Reference products

**Hevy**

Borrow:

- Fast workout logging.
- Exercise history.
- Clear workout structure.

Avoid:

- Social-feed emphasis.

**Strong**

Borrow:

- Minimal set logging.
- Previous-performance comparison.
- Fast interaction.

**Apple Fitness**

Borrow:

- Clean progress visualization.
- Strong hierarchy.
- High-quality mobile presentation.

**MyFitnessPal**

Borrow:

- Meal grouping.
- Daily macro summaries.

Avoid:

- Dense interfaces.
- Excessive menu depth.
- Advertising-style UI.

---

### Color palette

Forge should primarily use a dark interface.

**Primary**

Near-black:
`#0B0D10`

**Surface**

`#15181D`

**Elevated Surface**

`#1D2128`

**Primary Accent**

Forge Orange:
`#FF6B2C`

**Secondary Accent**

Warm amber:
`#FFA62B`

**Primary Text**

`#F5F7FA`

**Secondary Text**

`#A7ADB7`

**Success**

`#3DDC84`

**Warning**

`#FFB020`

**Error**

`#FF5A5F`

Use accent colors intentionally rather than covering the interface in orange.

---

### Typography

Recommended:

**Inter**

Alternative:

**Geist**

Scale:

- Display: 32px
- H1: 28px
- H2: 22px
- H3: 18px
- Body: 16px
- Secondary: 14px
- Caption: 12px

Workout numbers such as:

`32.5 KG`

and

`10 REPS`

should receive stronger visual emphasis.

---

### Components

Core components:

- Primary button.
- Secondary button.
- Icon button.
- Exercise card.
- Set row.
- Macro progress bar.
- Nutrition card.
- Measurement card.
- Stat card.
- Progress chart.
- Rest timer.
- Bottom navigation.
- Modal.
- Drawer.
- Text input.
- Numeric input.
- Select.
- Date picker.
- Image uploader.
- Toast.
- Confirmation dialog.
- Skeleton loader.

---

### Layout rules

Use an 8px spacing system.

Examples:

- 8px small.
- 16px normal.
- 24px section.
- 32px large.
- 48px page separation.

Maximum desktop content width:

Approximately 1200px.

Breakpoints:

- Mobile: <640px.
- Tablet: 640–1024px.
- Desktop: >1024px.

Workout screens should remain relatively narrow even on desktop because fast vertical interaction is more useful than extremely wide layouts.

---

### Screen notes

#### Today

Hierarchy:

1. Date / greeting.
2. Today's workout.
3. Start Workout.
4. Nutrition.
5. Weight/progress.
6. Recent activity.

---

#### Workout

The most important numbers should dominate.

Example:

```text
INCLINE DUMBBELL PRESS

3 × 8–12
Rest 2–3 min

Previous
30kg × 10
30kg × 10
30kg × 9

TODAY

SET     KG     REPS     RIR
1       30      10       2
2       30       9       1
3       --      --       --
```

The user should not need to navigate away to see previous performance.

---

#### Nutrition

Top:

Large calorie indicator.

Below:

Protein / Carbs / Fat.

Then:

Breakfast  
Lunch  
Dinner  
Snacks

---

#### Progress

Top:

Current weight and weekly change.

Then:

Weight graph.

Then:

Measurements.

Then:

Progress photos.

---

### Accessibility

Requirements:

- WCAG AA contrast where practical.
- Keyboard navigation on desktop.
- Visible focus states.
- Proper input labels.
- Semantic HTML.
- Minimum 44×44px touch targets.
- Do not communicate important state using color alone.
- Charts should expose textual values.
- Buttons require accessible names.
- Images require appropriate descriptions or deliberately empty alt text where decorative.

---

### Interaction states

Every interactive component must define:

- Default.
- Hover.
- Active.
- Focus.
- Disabled.
- Loading.
- Error.
- Success.

Set completion should provide immediate feedback without disruptive animations.

---

### Assets needed

V1:

- Forge wordmark.
- Forge app icon.
- Favicon.
- Exercise category icons.
- Navigation icons.
- Empty-state illustrations or simple icons.

No elaborate illustration library is required.

---

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