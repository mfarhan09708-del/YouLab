# YouLab database design

MySQL 8.0+ schema, InnoDB storage, `utf8mb4` encoding. The tables use integer primary keys for straightforward PDO usage. Foreign keys enforce ownership chains, and indexes support user dashboards and dated experiment views.

## Relationships and table purposes

| Table | Purpose |
|---|---|
| `users` | Login identity, password hash, onboarding preferences, reminder setting, theme, and demo-account marker. |
| `templates` | Reusable experiment definitions, including test/control instructions and default measurement guidance. Templates may be global or owned by a user. |
| `experiments` | A user's run of an experiment. Copies template details into the run so later template edits do not rewrite history. |
| `experiment_days` | One fixed scheduled condition per calendar date and experiment. Makes generated randomized schedules durable. |
| `checkins` | Daily rating, adherence, optional context tags, and note. At most one current check-in per scheduled day; edits update that row. |
| `results` | A computed analysis snapshot for an experiment, including comparison means, effect size, interval, counts, conclusion, and explanatory text. |
| `playbook_entries` | A user's saved takeaway, linked to its source experiment when available and retaining text snapshots for later display. |

Relationships: a user owns many experiments and playbook entries; a template can seed many experiments; an experiment has many scheduled days and result snapshots; a scheduled day has zero or one check-in. Deleting a user cascades their records. Deleting a template sets historical experiment template references to `NULL`. Experiment deletion cascades schedule, check-in, result, and linked playbook records.

## Important constraints

- `experiment_days` has unique `(experiment_id, day_number)` and `(experiment_id, scheduled_date)` keys.
- `checkins.experiment_day_id` is unique, preventing duplicate daily submissions.
- Ratings are constrained to 1–5; adherence and condition are explicit enumerated values.
- Result metrics may be `NULL` when there is insufficient valid data.
- Tags are JSON arrays to preserve a flexible set of context flags while keeping the check-in as one row.
- The API must verify ownership even when a foreign key exists; database constraints alone do not authorize a request.
