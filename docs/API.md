# YouLab API contract

Base path: `/api`. Endpoints accept and return JSON except CSV export. All routes other than signup, login, and demo-capable public landing behavior require an authenticated PHP session. State-changing requests require the CSRF token returned by `GET /api/auth/me.php` in an `X-CSRF-Token` header. All resource IDs are scoped to the session user.

## Response conventions

Success:

```json
{"ok":true,"data":{},"message":"Optional human-readable message"}
```

Failure:

```json
{"ok":false,"error":{"code":"VALIDATION_ERROR","message":"Please check the submitted values.","fields":{}}}
```

Use standard HTTP codes: `200` success, `201` created, `204` successful logout/deletion without a body, `400` malformed request, `401` unauthenticated, `403` CSRF or authorization failure, `404` missing resource, `409` duplicate/conflicting state, `422` validation failure, and `500` unexpected server error. Do not return SQL details or credentials to the browser.

## Authentication

| Method and path | Purpose | Request / result |
|---|---|---|
| `POST /api/auth/signup.php` | Create account and PHP session | `{name,email,password}`; returns public user profile and CSRF token. Validate email and password server-side; store only `password_hash()`. |
| `POST /api/auth/login.php` | Start a session | `{email,password}`; returns public user profile and CSRF token. Verify with `password_verify()` and rotate session ID. |
| `POST /api/auth/logout.php` | End session | CSRF header required; clears session and cookie. |
| `GET /api/auth/me.php` | Read current user/session state | Returns profile, onboarding state, demo-mode flag, and CSRF token. |

The demo entry point should establish the seeded demo user through the same session protections; do not expose a universal demo password in client-side code.

## Experiments

| Method and path | Purpose | Request / result |
|---|---|---|
| `GET /api/experiments/templates.php` | List available templates | Returns active global templates plus templates owned by the current user. |
| `GET /api/experiments/list.php` | List current user's experiments | Optional `status`; returns summary cards and today's scheduled condition. |
| `POST /api/experiments/create.php` | Create an experiment and fixed schedule | `{template_id?,title,description,test_condition,normal_condition,duration_days,start_date,outcome_name,schedule?}`; duration is 7, 14, or 21. A supplied preview schedule is accepted only when it is balanced, shuffled, and has no run longer than three days. Returns the saved schedule. |
| `GET /api/experiments/details.php?id={id}` | Read one experiment | Returns owned experiment, schedule, check-in presence, and current progress. |
| `POST /api/experiments/pause.php` | Pause an active experiment | `{experiment_id}`; preserves schedule and moves remaining dates when resuming per implementation rule. |
| `POST /api/experiments/resume.php` | Resume a paused experiment | `{experiment_id}`; returns updated status and schedule dates. |
| `POST /api/experiments/stop.php` | Stop an experiment early | `{experiment_id}`; sets terminal stopped state and preserves collected data. |

Schedule generation balances test and normal conditions as evenly as possible, randomizes the order, and avoids long predictable runs. Persist each assigned condition in `experiment_days` in the same transaction as experiment creation.

## Check-ins

| Method and path | Purpose | Request / result |
|---|---|---|
| `POST /api/checkins/submit.php` | Create or correct a scheduled-day check-in | `{experiment_day_id,rating,followed_plan,context_tags?,note?}`. Upsert by scheduled day; only allow eligible days and owned experiments. |
| `GET /api/checkins/history.php?experiment_id={id}` | Read check-in history | Returns schedule day, condition, rating, adherence, tags, note, and timestamp for an owned experiment. |
| `POST /api/checkins/undo.php` | Remove a submitted check-in | `{experiment_day_id}`; deletes only the owned day's record so it can be entered again. |

Ratings are integers 1–5. Context tags are a subset of `sick`, `travel`, `exam`, `bad_sleep`, and `unusual_day`. Notes are optional and limited to 500 characters. Duplicate submissions correct the existing row instead of creating a second row.

## Analysis

| Method and path | Purpose | Request / result |
|---|---|---|
| `GET /api/analysis/calculate.php?experiment_id={id}` | Compute and return current analysis | Returns conclusion, means, mean difference, confidence interval, effect size, valid/excluded counts, daily series, and plain-language explanation. |

Primary analysis excludes check-ins with a flagged context tag and check-ins where the plan was not followed. Return excluded-day counts transparently. Require at least five valid days in each condition before making a comparison; otherwise use `not_enough_data`. Results must communicate uncertainty and must not imply medical causation. Persist each calculation as a new `results` snapshot, with its calculation version.

## Playbook

| Method and path | Purpose | Request / result |
|---|---|---|
| `GET /api/playbook/list.php` | List saved entries | Optional `category`; returns the user's saved discovery cards. |
| `POST /api/playbook/save.php` | Save an experiment takeaway | `{experiment_id,category,key_finding}`; derive title, conclusion, and confidence from owned experiment analysis. One saved entry per experiment and user. |
| `POST /api/playbook/delete.php` | Remove a saved entry | `{entry_id}`; delete only if owned by the current user. |

## Settings

| Method and path | Purpose | Request / result |
|---|---|---|
| `GET /api/settings/profile.php` | Read profile/preferences | Returns name, email, goal, experience, reminder time, theme, and onboarding state. |
| `POST /api/settings/update.php` | Update profile/preferences | Allowlisted fields: `{name?,goal_preference?,experience_level?,reminder_time?,theme?}`. |
| `POST /api/settings/change-password.php` | Change account password | `{current_password,new_password}`; verifies the current hash and stores a new `password_hash()`. |
| `GET /api/settings/export.php` | Export personal data | Returns downloadable CSV with user-owned experiments, scheduled days, and check-ins. Set safe content headers. |
| `POST /api/settings/delete-account.php` | Delete account and owned data | `{password}` plus CSRF token; verify password, delete transactionally, and end session. |

## Security and implementation notes

- Configure secure, HTTP-only, same-site session cookies; enable `Secure` when served over HTTPS.
- Use PDO prepared statements and validate all IDs, enums, dates, ratings, and lengths server-side.
- Rotate the session ID after successful authentication; reject requests without the expected CSRF token.
- Apply ownership filters in every read, update, and delete query, including child-row operations.
- Send `Content-Type: application/json; charset=utf-8` for JSON responses and avoid leaking exception messages.
- For demo fast-forward, expose an authenticated demo-only action during the demo implementation; use a transaction and a uniqueness check so a day cannot be entered twice.
