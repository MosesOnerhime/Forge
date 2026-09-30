---
name: Forge
description: Focused training, nutrition, and progress logging in a dark operating UI.
colors:
  background: "#0b0d10"
  surface: "#15181d"
  elevated: "#1d2128"
  line: "#2b3038"
  text: "#f5f7fa"
  muted: "#a7adb7"
  accent: "#ff6b2c"
  amber: "#ffa62b"
  success: "#3ddc84"
typography:
  display:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "clamp(30px, 6vw, 46px)"
    fontWeight: 850
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.02em"
  planTitle:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 700
  planItem:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.35
  metric:
    fontFamily: "Geist Sans, Arial, Helvetica, sans-serif"
    fontSize: "32px"
    fontWeight: 850
    lineHeight: 1
    letterSpacing: "-0.04em"
rounded:
  tab: "10px"
  button: "11px"
  field: "12px"
  empty: "14px"
  card: "16px"
  pill: "100px"
spacing:
  xs: "8px"
  field-gap: "12px"
  stack: "16px"
  card-inset: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#170b06"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-secondary:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "11px 16px"
  field-default:
    backgroundColor: "{colors.elevated}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "12px 14px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-inset}"
  pill-default:
    backgroundColor: "#252a31"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
---

# Design System: Forge

## Overview

**Creative North Star: "The Training Console"**

Forge is a compact operating UI for a user moving between a workout, food log, and progress history. Near-black canvas, tonal panels, strong numbers, and one bright action color give the screens a focused, athletic feel. The code favors familiar controls and vertical task flow over decorative expression. The design brief calls this strong, clean, and focused; the implemented shell follows that direction.

**Key Characteristics:**

- Dark canvas with subtly stepped panels and visible hairline borders.
- Orange primary actions, active navigation, and quantitative progress.
- Large, tight headings and tabular workout and nutrition figures.
- Mobile bottom navigation that becomes a fixed-width desktop sidebar.

The current visual evidence is the development-only preview at `docs/screenshots/desktop.png` and `docs/screenshots/mobile.png`, plus source in `src/app/globals.css` and `src/components`. Review status is **fix**. The preview carries repeated card kicker labels, and the initial mobile viewport partly obscures the food action behind the fixed navigation. The authenticated workout experience has not been visually verified. These findings are defects and evidence limits, not rules for future screens.

## Colors

### Primary

- **Forge Orange** (`accent`): Primary actions, selected navigation, progress fill, and small directional icons. It is bright against the dark base and is used selectively.

### Secondary

- **Warm Amber** (`amber`): Secondary highlight, including nutrition iconography and keyboard focus outlines.
- **Success Green** (`success`): Positive status and achievement labels.

### Neutral

- **Canvas** (`background`): App-wide base.
- **Panel** (`surface`): Default card fill.
- **Raised Control** (`elevated`): Inputs and secondary buttons.
- **Divider** (`line`): Card outlines, field strokes, and list separators.
- **Primary Text** (`text`): Main labels and values.
- **Quiet Text** (`muted`): Descriptions, navigation at rest, and supporting numbers.

**The Signal Accent Rule.** Use orange where an action or current state needs attention; keep the surrounding surfaces dark.

## Typography

**Display and body font:** Geist Sans from `geist/font/sans`, with Arial and Helvetica fallbacks.

The hierarchy is clean and numeric. Headings use tight tracking; metrics use tabular numerals to keep changing values aligned. The root font stack is shared across all surfaces.

### Hierarchy

- **Display:** Tight, heavy page heading; scales from phone to desktop (`typography.display`).
- **Headline:** Section and card heading (`typography.headline`), with page-specific larger overrides in the preview.
- **Title:** Smaller exercise and item title (`typography.title`).
- **Body:** Default reading and control text (`typography.body`); paragraphs have a 1.5 line height.
- **Label:** Compact field label (`typography.label`); the preview also uses a separate 13px bold card kicker, which is not a recommended system role.
- **Metric:** Large, tightly tracked values (`typography.metric`); unit and target text recede to smaller muted type.
- **Plan list:** A compact 14px heading and 13px ordered rows keep all seven exercises visible below the workout action (`typography.planTitle`, `typography.planItem`).

**The Number First Rule.** Let weights, reps, calories, and macro totals lead their local group; keep units and comparison figures visually quieter.

## Layout

The mobile app uses a single vertical flow inside a main area with 18px side padding and 24px top padding. Groups commonly use 12px or 16px gaps and 20px card padding. A desktop content area is capped at 1200px. At 720px, two-column cards and three-column fields become available. At 1000px, the layout adds a 240px sidebar and wider main padding. The workout set form stays a compact field grid even when the page grows.

The mobile bottom navigation is fixed and includes safe-area padding. The desktop sidebar is sticky. Preserve room for fixed controls when composing the first mobile viewport; the current preview's food action is partly obscured there.

## Elevation & Depth

Most surfaces are flat at rest. Depth comes from the three dark fills, thin borders, and a restrained warm gradient on the featured training card. The floating rest timer is the one prominent raised element, using `0 10px 32px #0008` to separate it from the page.

**The Tonal Layer Rule.** Use fill and border changes for ordinary hierarchy; reserve a pronounced shadow for a floating control such as the timer.

## Shapes

Cards have gently rounded 16px corners; fields use 12px; standard buttons use 11px. Tabs are slightly tighter at 10px. Pills are fully rounded. Borders carry the edges of most shapes rather than a shadow.

## Components

### Buttons

The shared button pattern is bold, compact, and at least 44px tall and wide where compact. Primary buttons carry orange fill and dark text. Secondary buttons sit on the raised control color; ghost buttons remove the fill. Hover changes the fill over 150ms, press scales to 97%, disabled controls fade, and keyboard focus receives an amber outline. The compact button variant, tabs, and navigation links have a 44px minimum target; browser/device verification is still pending.

### Chips

Small status pills use a deep neutral fill, muted text, and a full capsule shape. Orange and green variants show workout sequence or positive state. Day tabs are separate, more rectangular controls with orange border and warm dark fill when selected.

### Cards / Containers

Cards use the panel color, divider border, 16px radius, and 20px inset. The featured training card adds a subtle warm gradient and copper border. Lists divide entries with horizontal lines. Empty states use a dashed border and centered muted text.

### Inputs / Fields

Text, numeric, select, and textarea controls use the raised fill, divider stroke, 12px radius, 12px by 14px padding, and at least 44px height. Orange border and a soft orange ring show focus. Labels are compact and muted. Forms often arrange weight, reps, and RIR as a responsive grid.

### Navigation

On mobile, Today, Workout, Nutrition, Progress, and More occupy a fixed, translucent bottom bar. More opens a short sheet for History, Journal, Routine, and Settings, with Escape returning focus to its trigger. The active destination turns orange. At desktop width, six direct destinations appear in a sidebar with horizontal rows and a dark warm active background. The wordmark is uppercase and heavy with an orange period.

### Rest Timer

The timer floats above the mobile bar and moves near the desktop lower edge. It uses a warm dark panel, copper outline, distinct shadow, and tabular time readout.

### Pending workout sets

An orange status pill marks a set saved on the device but not yet uploaded. A notice above the session names the pending count and offers a manual retry; completion stays unavailable until those sets sync or are discarded. The standalone offline page uses amber text for the same state. This status must not be styled as a completed server record.

### Workout reference video

The selected training day has an optional reference-video card in Edit routine and the workout session. It accepts MP4 or WebM up to 50 MiB, shows upload progress, and allows replacement or removal. A saved video has a tall preview tile in both places; selecting it opens a player in a dialog. Preview and playback use time-limited private links. The authenticated layout still needs mobile and desktop browser QA.

## Do's and Don'ts

### Do:

- **Do** lead set logging and nutrition summaries with the current numbers and make context easy to scan.
- **Do** use the existing surface steps and thin borders for ordinary grouping.
- **Do** keep primary actions orange and keyboard focus visible.
- **Do** check fixed navigation against mobile actions in the initial viewport.

### Don't:

- **Don't** turn orange into a page-wide fill or use it for routine body text.
- **Don't** add pronounced card shadows to ordinary content panels.

### Exercise reference images and videos

Saved JPG/PNG/WebP images and MP4/WebM videos appear directly beneath each exercise as tall, horizontally scrollable preview tiles. The rail appears in the weekly Workouts list, routine editor, and workout session. Selecting a tile opens a native dialog with an enlarged image or video player. The editor and session offer upload and removal controls, while the weekly list is view-only. Media uses signed private links; filenames wrap, actions remain reachable at mobile widths, and progress and errors stay in context. The add form opens on demand so references remain visible without pushing set logging farther down the page.

| Before | After | Why |
| --- | --- | --- |
| References hidden in a disclosure, then behind a View action | Visible tall preview tiles with click-to-enlarge/play | Lets users scan exercise technique while scrolling, as requested. |
| Session reference controls were read-only | Upload and removal available in the session | Lets users attach a reference at the moment they need it. |
| Blank set inputs | Latest completed set's weight and reps suggested | Cuts repetitive typing while leaving the values editable. |
| Dips displayed as a generic weight | `0 kg` labeled body weight; positive values labeled weighted dips | Makes added load unambiguous. |

### Routine templates

First use presents a single-choice list with each plan's purpose, training-day count, exercise count, and a seven-day preview for the selected choice. Template management stays behind Edit routine, where Save current routine and Load selected routine are explicit actions. Day details sit in a disclosure above the selected day's exercises so the main logging plan remains scannable. The starter plan's copy avoids a promise of targeted fat loss and does not use Runo's nutrition targets.

Selecting the empty template reveals three concrete steps: change a recovery day into a named training day with a duration, add exercises and prescriptions, then save the week as a template. New users who select it land in Edit routine after onboarding, where the empty state repeats those steps and the day card explains the Recovery day switch. The guide disappears once a training day is configured.

The development-only `/design-preview/templates` route renders this chooser with labeled sample data. Its 390px Runo and Mom states and 1440px desktop state were captured in `docs/screenshots/`; the checked mobile document width did not exceed the viewport.

### Today action order review (2026-09-29)

| Before | After | Why |
| --- | --- | --- |
| The full exercise list filled the training card before the nutrition card on a phone. | The Start workout and Log food actions lead; the ordered exercise list follows both summaries. | In the 390px preview, Log food now ends 13px above the fixed navigation instead of sitting behind it. The seven exercise names stay on Today. |
| A missing nutrition target displayed Runo's 2,900 kcal and macro goals. | The cards show logged amounts and a link to set targets. | A different account must not mistake Runo's figures for its own goals. |

The refreshed `docs/screenshots/mobile.png` and `desktop.png` show the layout. The first mobile viewport check used Edge at 390x844; it proves layout geometry, not physical touch behavior.

### Journal and Goals error-state review (2026-09-30)

| Before | After | Why |
| --- | --- | --- |
| A rejected Journal delete or Goals toggle/delete request could escape without an alert. | Each action reports its failure beside the page content and releases its busy state for retry. | A failed write must stay visible and recoverable. |
| Action buttons remained usable while a write was in flight. | Edit, delete, toggle, and cancel controls are disabled while the request runs. | This prevents duplicate actions and conflicting edits on slow connections. |
| A successful write followed by a failed list refresh looked like an ordinary failed write. | The error says the write succeeded but the list could not refresh. | The user can check the saved record before retrying, avoiding an accidental duplicate. |
