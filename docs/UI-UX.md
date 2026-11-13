# YouLab Phase 2 — UI/UX direction

## Design system

- **Personality:** thoughtful, calm, evidence-aware, and encouraging. A missed day is ordinary life, not failure.
- **Palette:** deep navy `#152B2D` grounds dark areas; teal `#167D73` marks primary actions and progress; pale sage `#F2F7F5` and white are the main surfaces. Lavender, peach, and warm gold are limited to category accents.
- **Type:** Manrope for display headings and DM Sans for interface text, with system sans-serif fallbacks.
- **Shape and spacing:** 12px control radius, 16–22px card radius, subtle borders and shadows, 8px spacing rhythm, and generous section spacing.
- **Icons and layout:** Lucide line icons; Bootstrap 5 provides responsive container and grid utilities, while product styling stays in local CSS.
- **Motion and accessibility:** brief hover feedback; honor reduced-motion preferences. Keep keyboard focus visible, use semantic headings and labelled controls, and provide a skip link.

## Shared components

Brand mark, responsive sticky navigation, primary/quiet/outlined buttons, eyebrow labels, status chips, cards, progress tracks, insight cards, and accessible native dialogs. Empty and loading states will reuse the same card and type treatments during frontend implementation.

## Responsive behavior

Desktop uses two-column hero and content layouts. At tablet widths, navigation becomes a disclosure menu and idea cards use two columns. On phones, content stacks, calls to action become full-width, and card grids simplify. Check layouts around 1200px, 992px, 768px, and 420px.

## Low-fidelity layouts for all screens

Phase 2 implements the landing page in `index.html`. The remaining screen descriptions establish the structure for later implementation.

### A. Landing page (implemented)

```text
┌ Brand ─ How it works ─ Experiments ─ Why YouLab ─ Log in / Start ┐
│ Your body. Your experiment. Your discovery.      Dashboard preview│
│ Supporting copy + primary action + demo action                   │
├ Three steps: question / daily trial / personal pattern            ┤
├ Dashboard preview with illustrative chart and insight             ┤
├ Experiment idea cards                                             ┤
├ Why YouLab: personal / gentle / clear                             ┤
├ Closing CTA and footer                                            ┤
└──────────────────────────────────────────────────────────────────┘
```

### B. Authentication

```text
┌ Brand ─────────────────────────────────────────────── Back home ┐
│ Center card: Welcome back or Create your account                 │
│ Email, password, validation, show-password control               │
│ Primary submit; switch login/signup; demo access                 │
└─────────────────────────────────────────────────────────────────┘
```

### C. Onboarding

```text
┌ Step 1 of 3 ─ progress ─ Back ──────────────────────────────────┐
│ Choose a goal → choose experience → welcome                      │
│ One clear question and large selectable cards per step            │
└─────────────────────────────────────────────────────────────────┘
```

### D. Home dashboard

```text
┌ Navigation: Today / Experiments / Playbook / Profile             ┐
│ Welcome and date                             Start experiment    │
│ Today card: condition, task, check-in, day X of Y                 │
│ Progress and streak          Latest personal insight             │
│ Completion summary           Recent experiment history            │
└─────────────────────────────────────────────────────────────────┘
```

### E. Experiment creation wizard

```text
┌ 1 Choose template/custom → 2 Duration and outcome                 │
│ 3 Balanced randomized schedule calendar                           │
│ 4 Review conditions and dates → Start                             │
└─────────────────────────────────────────────────────────────────┘
```

### F. Daily check-in

```text
┌ Today / Day N ─ assigned condition and one short instruction       │
│ Five large labelled rating choices (1–5)                          │
│ Followed plan? Yes / No                                            │
│ Optional context tags and short note                               │
│ Submit → friendly confirmation → correct or undo                  │
└───────────────────────────────────────────────────────────────────┘
```

### G. Experiment details

```text
┌ Title / status / start and end / pause-resume-stop controls        │
│ Progress summary and completion count                              │
│ Calendar with condition and check-in markers                       │
│ Missed days without shame; link to results                         │
└───────────────────────────────────────────────────────────────────┘
```

### H. Results and analysis

```text
┌ Plain-English conclusion + confidence label                       │
│ Test vs normal comparison chart + daily ratings line chart         │
│ Valid days, flagged/excluded days, short explanation               │
│ Expandable details: mean, difference, effect size, interval        │
│ Save to Playbook / Run again / Dashboard                           │
│ Personal experiments, not medical advice.                          │
└───────────────────────────────────────────────────────────────────┘
```

### I. My Playbook

```text
┌ Works for Me | Doesn't Seem to Help | Still Unclear                │
│ Finding cards: experiment, conclusion, date, confidence, remove     │
│ Helpful empty state and start-experiment action                   │
└───────────────────────────────────────────────────────────────────┘
```

### J. Settings and profile

```text
┌ Profile and goal preferences                                       │
│ Reminder time and light/dark appearance                            │
│ Export data / change password / delete account                     │
│ Save confirmation and destructive-action confirmation             │
└───────────────────────────────────────────────────────────────────┘
```

## Landing page interactions

- Navigation scrolls to real sections; the mobile menu opens and closes with an accessible disclosure button.
- Start opens an experiment-choice dialog. Choices jump to the examples; actual experiment creation is part of a later phase.
- Demo and login open honest preview dialogs; neither pretends authentication or the live demo is already implemented.
- Footer Privacy and About controls open informational dialogs. Dialogs close with Escape, close controls, or backdrop click.
