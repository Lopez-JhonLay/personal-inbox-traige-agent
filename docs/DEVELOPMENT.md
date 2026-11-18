# Local development

Setup, configuration, and testing instructions for contributors. For the product
overview and live application, see the [README](../README.md).

## Getting started

### Prerequisites

- Node.js **24 LTS** or **26 LTS**, with npm.
- Python **3.14** and [uv](https://docs.astral.sh/uv/getting-started/installation/).
- A Neon database, a Google Web OAuth client with the Gmail API enabled, and an OpenRouter API key.

Run the following commands from the repository root in **PowerShell**.

### 1. Clone and install

```powershell
git clone https://github.com/Lopez-JhonLay/personal-inbox-traige-agent.git
cd personal-inbox-traige-agent
npm --prefix frontend ci
uv sync --project backend --locked
```

### 2. Configure the environment

Copy the templates on first setup. Preserve existing local values if the files already exist.

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

Configure `backend/.env`:

| Variables                                  | Purpose                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `SECRET_KEY`                               | A strong, stable secret for signing application sessions.                |
| `TOKEN_ENCRYPTION_KEY`                     | A stable Fernet key for stored Google refresh tokens.                    |
| `DATABASE_URL`                             | Neon **pooled** URL for application traffic, retaining SSL parameters.   |
| `DIRECT_DATABASE_URL`                      | Neon **direct** URL for Alembic migrations.                              |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Your Google Web OAuth client credentials.                                |
| `GOOGLE_REDIRECT_URI`                      | `http://localhost:5000/api/auth/google/callback` locally.                |
| `FRONTEND_URL`                             | `http://localhost:5173` locally.                                         |
| `OPENROUTER_API_KEY`                       | Backend-only AI provider credential.                                     |
| `OPENROUTER_MODEL`                         | Defaults to `baidu/ernie-5.5-flash-preview:free`.                        |
| `GMAIL_SYNC_QUERY`                         | Example configuration uses `label:mailkind-test` for controlled testing. |

Generate the two local secrets separately:

```powershell
uv run --project backend python -c "import secrets; print(secrets.token_hex(32))"
uv run --project backend python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Keep `VITE_API_BASE_URL=/api` in `frontend/.env`. All `VITE_*` values are public;
credentials belong only in the backend environment. See the complete
[backend](../backend/.env.example) and [frontend](../frontend/.env.example) templates.

Register the exact local callback URI in your Google OAuth client. For a separate
Google project in Testing mode, add your account as a test user. The
[Google setup guide](TASKS.md#phase-4-setup-and-testing-guide) covers the full flow.

### 3. Prepare the database

For your configured database, review and apply the existing migrations:

```powershell
uv run --project backend alembic -c backend/alembic.ini upgrade head
uv run --project backend alembic -c backend/alembic.ini current
```

The migration head is `0003`. Application startup never creates tables or runs
migrations automatically. Use your own database when setting up a separate copy.

### 4. Start both servers

**Terminal 1 - backend**

```powershell
uv run --project backend flask --app backend/run.py run --debug --port 5000
```

**Terminal 2 - frontend**

```powershell
npm --prefix frontend run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to Flask on port `5000`.
Use `localhost` consistently during local OAuth testing.

`http://localhost:5000/api/health` checks application liveness; it does not validate
database connectivity or provider credentials.

## Development and testing

### Routine checks

```powershell
npm --prefix frontend run test
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend run build

uv run --project backend pytest backend/tests
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
```

Routine tests mock external services. Database tests are opt-in and use synthetic
records inside rollback-only transactions:

```powershell
uv run --project backend pytest backend/tests --run-db-tests -m database
```

Live AI evaluation is also explicit. These commands send synthetic fixtures to
OpenRouter, with one attempt per case and no automatic requeuing:

```powershell
uv run --project backend python backend/scripts/evaluate_analysis.py --live --max-requests 8
uv run --project backend python backend/scripts/evaluate_task_decisions.py --live --max-requests 8
```

Keep generated reports in ignored `.cache/`. The
[security review](SECURITY_REVIEW.md) records evaluation results and limitations.

### Repository structure

```text
personal-inbox-traige-agent/
|-- frontend/
|   |-- public/          # Brand assets and static files
|   |-- src/
|   |   |-- components/  # Inbox controls, reader, tasks, and shared UI
|   |   |-- pages/       # Landing, inbox, actions, settings, and policies
|   |   |-- hooks/       # Queries, mutations, and processing workflow
|   |   |-- services/    # Typed API clients
|   |   `-- styles/      # Theme, layout, and motion
|   `-- vercel.json
|-- backend/
|   |-- app/             # Routes, services, repositories, models, schemas
|   |-- migrations/      # Alembic revisions
|   |-- scripts/         # Provider checks and AI evaluations
|   |-- tests/           # Offline and opt-in integration tests
|   `-- vercel.json
`-- docs/                # Architecture, roadmap, design, and release guides
```
