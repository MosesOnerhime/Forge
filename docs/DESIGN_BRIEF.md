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

An optional workout reference video should stay secondary to set logging. Show its name and a clear Watch action; load the player only when the user asks. Put upload and replacement controls with the selected day in Edit routine, and show upload progress without blocking the exercise list.

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
