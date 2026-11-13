# Deploy YouLab to Vercel

YouLab is a PHP and MySQL application. The Vercel deployment uses the official Docker container runtime with FrankenPHP. MySQL stores user data and PHP sessions so sessions work across container instances and restarts.

## Requirements

- A Vercel account and a Git repository connected to it, or Vercel CLI with Docker available locally.
- A hosted MySQL 8 compatible database with TLS and remote connections enabled. Vercel Marketplace currently lists TiDB Cloud as a MySQL-compatible option. Choose a database region near the Vercel deployment region. The database must support the foreign keys in `database/schema.sql`.
- The database connection values: host, port, database name, username, password, and the provider CA certificate if required.

Vercel's container runtime is currently in beta. Container files and memory are not durable or shared between instances; this setup stores application data and sessions in MySQL. Review Vercel's current container limits and pricing before publishing.

## 1. Create the database

Create a database and a restricted application user with permission to create and update tables in that database. From a SQL console with the new database selected, import `database/schema.sql` and then `database/seed.sql`. Do not import the local XAMPP database or its user records into a public deployment. If using TiDB Cloud, connect its Vercel integration to the project; the app reads the integration's `TIDB_HOST`, `TIDB_PORT`, `TIDB_USER`, `TIDB_PASSWORD`, and `TIDB_DATABASE` values.

## 2. Deploy the project

Connect this project repository to Vercel. The root `Dockerfile` selects Vercel's Container preset and the `Caddyfile` serves the frontend and PHP API from the same origin. For a command-line deployment, install Vercel CLI and Docker Desktop, then run `vercel login` and `vercel deploy` from the project root.

## 3. Add Vercel environment variables

Add these variables to the Vercel project for Production (and Preview only if Preview should use a separate test database):

| Variable | Value |
|---|---|
| `YOULAB_ENV` | `production` |
| `YOULAB_SESSION_DRIVER` | `mysql` |
| `YOULAB_DB_HOST` | Host from a MySQL provider (skip if using the TiDB integration variables) |
| `YOULAB_DB_PORT` | Provider port (skip if using the TiDB integration variables) |
| `YOULAB_DB_NAME` | Hosted database name (skip if using the TiDB integration variables) |
| `YOULAB_DB_USER` | Restricted database user (skip if using the TiDB integration variables) |
| `YOULAB_DB_PASS` | Database password (skip if using the TiDB integration variables) |
| `YOULAB_DB_SSL_CA` | Optional provider CA certificate PEM, if required |

Redeploy after saving environment variables. Keep credentials out of Git and out of the Docker image.

## 4. Confirm the deployment

Open the Vercel deployment URL and confirm the landing page loads. Use the demo button, then verify the dashboard, experiment details, results, Playbook, and settings. Create a separate account for your own data. Check Vercel runtime logs and the MySQL provider's connection logs if an API reports a server error.

## Notes

- SQL scripts no longer force the database name to `youlab`; select the intended database before importing.
- Do not expose the Vercel project to real users until the database is backed up and the public deployment has been reviewed.
- This app includes wellness tracking and personal analysis, not medical advice.
