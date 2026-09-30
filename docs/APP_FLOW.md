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
- An optional reference video for the scheduled workout, opened on demand.

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
- Upload, replace, play, and remove the selected training day's reference video.

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

## Workout reference video journey

```text
Edit routine
  -> Select training day
  -> Choose MP4 or WebM video
  -> Upload and save privately
  -> Open that workout session
  -> Watch reference on demand
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

## Exercise reference media journey (2026-09-29)

Workouts, Edit routine, or a workout session -> scroll to the exercise -> see its image/video preview cards -> select one to enlarge or play it. In Edit routine or a session, choose **Add image or video**, select JPG/PNG/WebP (up to 10 MiB) or MP4/WebM (up to 50 MiB), and save. Remove is available on each owned card. Files remain attached to the exercise if its training day changes. The optional workout-day video appears separately as a preview card and can be uploaded from Edit routine or the session.

## Set suggestion and dips flow (2026-09-30)

Open an exercise in a session -> the next set starts with the last logged set's weight and reps, or the first set from the previous workout -> adjust either number -> log the set -> the following set inherits the new values. For Dips and Upright Dips, enter `0` added weight for body weight or a positive amount for weighted dips; the form and log state which one was recorded.

## Routine templates flow (2026-09-29)

New account -> onboarding -> choose Runo's plan, Mom's starter, or Build from scratch -> review the seven-day preview -> complete setup -> selected plan becomes active. Existing account -> Workouts -> Edit routine -> Choose or save a template -> select a built-in or private template -> confirm Load -> return to Edit routine. To make a custom template: start blank or edit any active routine, rename and configure each day, add exercises, then Save current routine with a private name. Finish/cancel an active workout before switching. History keeps sessions from previous programs.

## Nutrition choice and Today order (2026-09-29)

During onboarding, selecting Runo's plan can prefill his supplied nutrition figures. Selecting another plan clears those figures unless the user already entered their own targets. Today and Nutrition show consumed amounts and a Settings link if targets are absent. On phones, Today puts Log food before the full exercise list so it is reachable above the fixed navigation in the checked 390px viewport.
## Build from scratch guidance (2026-09-30)

Selecting the blank routine template shows the steps to configure training days, add exercises, and save a reusable template. New accounts choosing it finish onboarding in Edit routine rather than Today. The empty editor repeats the guide, and each recovery day explains how to turn it into a training day. Existing accounts loading the blank template reach the same editor.
