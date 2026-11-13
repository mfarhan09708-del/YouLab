# YouLab

**Your Body. Your Experiment. Your Discovery.**

YouLab is a personal fitness and lifestyle experimentation platform. Users choose a habit to test, follow a randomized schedule of test and normal days, record a brief daily outcome, and review a plain-language summary of their own data. It is a personal tracking tool, not medical advice.

## Current implementation

The project includes the landing page and working demo, PHP session authentication, sign up and onboarding, a workspace dashboard, randomized experiment setup, experiment details and controls, daily check-ins, results charts and plain-language analysis, a personal Playbook, and account settings for preferences, password changes, CSV export, and account deletion. The app is designed for Apache/PHP and MySQL in XAMPP. Its conclusions describe personal observations and are not medical advice.

### Project structure

```text
YouLab/
├── index.html
├── login.html
├── signup.html
├── onboarding.html
├── dashboard.html
├── experiment.html
├── experiment-detail.html
├── checkin.html
├── experiment.html
├── checkin.html
├── results.html
├── playbook.html
├── settings.html
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── dashboard.css
│   │   ├── dashboard-app.css
│   │   ├── auth.css
│   │   ├── onboarding.css
│   │   ├── experiment-setup.css
│   │   ├── experiment-views.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── app.js
│   │   ├── auth.js
│   │   ├── onboarding.js
│   │   ├── dashboard.js
│   │   ├── experiment-setup.js
│   │   ├── experiment-detail.js
│   │   ├── checkin.js
│   │   ├── auth.js
│   │   ├── experiment.js
│   │   ├── checkin.js
│   │   └── charts.js
│   └── images/
├── api/
│   ├── config/
│   │   └── database.php
│   ├── auth/
│   ├── experiments/
│   ├── checkins/
│   ├── analysis/
│   ├── playbook/
│   └── settings/
├── database/
│   ├── schema.sql
│   └── seed.sql
├── tests/
│   └── analysis-tests.php
├── docs/
│   ├── API.md
│   ├── DATABASE.md
│   └── UI-UX.md
├── README.md
└── .gitignore
```

The HTML files are individual screens, CSS and browser JavaScript stay under `assets/`, and PHP REST-style endpoints are grouped by feature. Shared PHP connection and response helpers are under `api/config/`. SQL setup scripts are kept separate from application code. The design system and screen layouts are documented in [docs/UI-UX.md](docs/UI-UX.md); the landing page is [index.html](index.html).

## Database model

The tables and their relationships are documented in [docs/DATABASE.md](docs/DATABASE.md). The runnable schema is [database/schema.sql](database/schema.sql), and [database/seed.sql](database/seed.sql) adds the six starter templates. The demo workspace is created when a visitor opens the demo.

```text
users 1 ─── * experiments 1 ─── * experiment_days 1 ─── 0..1 checkins
  │                  │                                      │
  │                  └──────────── 0..* results             │
  └─────────────────────────────── 0..* playbook_entries ───┘
templates 1 ─── 0..* experiments (optional source template)
```

Experiment schedules are stored as dated `experiment_days` rows so a condition does not change when a user revisits the experiment. A check-in is unique per scheduled day. Results are persisted calculation snapshots and can be recomputed from check-ins; the underlying daily records remain the source of truth.

## API overview

The endpoint contract, authentication expectations, example payloads, and response shape are in [docs/API.md](docs/API.md). Endpoints use JSON unless an export endpoint explicitly returns CSV. Session-authenticated state-changing requests require a CSRF token.

| Area | Endpoints |
|---|---|
| Authentication | `POST /api/auth/signup.php`, `POST /api/auth/login.php`, `POST /api/auth/demo.php`, `POST /api/auth/logout.php`, `GET /api/auth/me.php` |
| Experiments | `GET /api/experiments/templates.php`, `GET /api/experiments/list.php`, `POST /api/experiments/create.php`, `GET /api/experiments/details.php`, `POST /api/experiments/pause.php`, `POST /api/experiments/resume.php`, `POST /api/experiments/stop.php` |
| Check-ins | `POST /api/checkins/submit.php`, `GET /api/checkins/history.php`, `POST /api/checkins/undo.php` |
| Analysis | `GET /api/analysis/calculate.php` |
| Playbook | `GET /api/playbook/list.php`, `POST /api/playbook/save.php`, `POST /api/playbook/delete.php` |
| Settings | `GET /api/settings/profile.php`, `POST /api/settings/update.php`, `POST /api/settings/change-password.php`, `GET /api/settings/export.php`, `POST /api/settings/delete-account.php` |
| Demo | `POST /api/demo/fast_forward.php` (demo users only) |

## Deploy to Vercel

The Vercel container files and setup steps are in [docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md). The deployment needs a hosted MySQL database; the Vercel container stores PHP sessions in that database so they persist between requests and instances.

## Initialize in VS Code and XAMPP

1. Install XAMPP with Apache, PHP 8+, and MySQL/MariaDB, plus VS Code and Git.
2. Put the project folder under XAMPP's `htdocs` directory (for example, `C:\xampp\htdocs\YouLab`) or configure an Apache virtual host that points to it.
3. Start Apache and MySQL from the XAMPP Control Panel.
4. Open `http://localhost/phpmyadmin`, create a database named `youlab` using `utf8mb4`, then import `database/schema.sql` followed by `database/seed.sql`.
5. Copy `api/config/database.local.example.php` to `api/config/database.local.php`, enter your local database settings, and keep the private file out of Git. Do not commit credentials.
6. Open the project folder in VS Code. The landing page is at `http://localhost/YouLab/`. Sign up and log in from the landing page; the first sign-in goes through onboarding and then opens the workspace dashboard. Start an experiment from the dashboard, open its schedule from the experiment list, and record a daily check-in when the day becomes available.

Run the statistical unit checks with `php tests/analysis-tests.php`. Other API routes require Apache/PHP with PDO MySQL and the imported database.

### GitHub setup

Create an empty GitHub repository named `YouLab`, then from the project folder run:

```bash
git init
git add .
git commit -m "Add YouLab Phase 1 architecture"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YouLab.git
git push -u origin main
```

Replace `YOUR-USERNAME` with the GitHub account or organization that owns the repository. Review `.gitignore` before the first push and never commit database credentials, local environment files, or user data.

## Project phases

1. **Architecture** — structure, schema, endpoint contract, and setup guidance.
2. **UI/UX** — design system, screen layouts, landing page, and navigation.
3. **PHP backend** — PDO, authentication, scheduling, check-ins, analysis, Playbook, settings, demo, and analysis tests. Connection setup: `api/config/database.local.example.php`.
4. **Frontend** — responsive screens, interactions, results charts, settings, and API integration.
5. **Integration and polish** — demo flow, accessibility, responsive layouts, and deployment notes.

## Privacy and safety principles

- Use PDO prepared statements for database access and `password_hash()` / `password_verify()` for passwords.
- Keep authenticated data scoped to the signed-in user's records.
- Store a random session CSRF token and require it for state-changing session requests.
- Treat experiment conclusions as personal observations. Small personal datasets are uncertain and do not establish medical causation.
- Provide users a way to export and delete their own data.
