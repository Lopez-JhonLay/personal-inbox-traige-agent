# Personal Inbox Triage Agent

Initial monorepo setup based on [the architecture](docs/ARCHITECTURE.md).

- `frontend/`: React, TypeScript, Vite, and Tailwind CSS. The React root renders nothing.
- `backend/`: Flask application factory, Pydantic settings, and `/api/health`.
- Integration factories: SQLAlchemy with psycopg for Neon, OpenAI SDK for OpenRouter,
  Google OAuth and a read-only Gmail client.
- Alembic is configured with empty metadata and no migration revisions.

There are no domain models, application schemas, authentication endpoints, email processing,
AI analysis workflows, UI features, or deployment configuration.
Client factories do not call external services during application startup.

Git uses `main` for the initial scaffold and documentation. The SSH origin is
`git@github.com:Lopez-JhonLay/personal-inbox-traige-agent.git`. Repository-local Git
settings use `Lopez-JhonLay`, `jhonlaylopez000@gmail.com`, and the personal
`~/.ssh/id_ed25519_personal` key with `IdentitiesOnly=yes`; global/work settings are
unchanged. Personal GitHub authentication and remote access were verified.
See [the task tracker](docs/TASKS.md) for completed setup work and remaining tasks,
and [the contributor guide](AGENTS.md) for repository conventions.

Frontend formatting uses Prettier. Biome supplies linting because the current
`typescript-eslint` release requires TypeScript `<6.1.0`, which excludes the latest
stable TypeScript 7 selected for this setup.

## Requirements

- Node.js 24 LTS (selected in `.nvmrc`); Node.js 26 LTS is also supported.
- Python 3.14 and [uv](https://docs.astral.sh/uv/getting-started/installation/).
- npm, supplied with Node.js.

Direct dependencies were checked against npm and PyPI stable releases during setup.
`frontend/package-lock.json` and `backend/uv.lock` record resolved dependencies.
`backend/requirements.txt` is a generated runtime-only export for pip users.

## Local setup

Run these commands from the repository root in PowerShell:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
npm --prefix frontend ci
uv sync --project backend --locked
```

The environment copies are for first-time setup. Preserve any existing local values.
Generate a local `SECRET_KEY` if needed:

```powershell
uv run --project backend python -c "import secrets; print(secrets.token_hex(32))"
```

Start the backend and frontend in separate terminals:

```powershell
uv run --project backend flask --app backend/run.py run --debug --port 5000
```

```powershell
npm --prefix frontend run dev
```

The frontend is at `http://localhost:5173` and intentionally displays a blank page.
Vite proxies `/api` to Flask on `127.0.0.1:5000`. The fetch wrapper sends session cookies;
the backend restricts cross-origin access to `FRONTEND_URL`.

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5173/api/health
```

Health is a liveness check and does not test external credentials or connectivity.

## Integration configuration

All credentials stay in `backend/.env`. Frontend `VITE_*` values are public.
See each `.env.example` for the complete variable list.

- **Neon:** set `DATABASE_URL` to the pooled PostgreSQL URL and `DIRECT_DATABASE_URL`
  to the direct URL, retaining Neon's SSL query parameters. Standard `postgresql://`
  URLs are normalized to `postgresql+psycopg://`. The application creates a lazy engine
  only when configured. Future repositories can use
  `app.extensions["database"].session_factory.begin()` for transaction-scoped sessions.
- **Google:** supply web application client credentials and register the exact
  `GOOGLE_REDIRECT_URI`. Only the `gmail.readonly` scope is configured. The OAuth factory
  does not start authorization, handle callbacks, store credentials, or create sessions.
  The Gmail client requires credentials supplied by the caller.
- **OpenRouter:** supply an API key. `OPENROUTER_MODEL` is reserved for a selected and
  evaluated free model; no inference requests or prompts are implemented.
- **Token encryption:** `TOKEN_ENCRYPTION_KEY` is reserved for later credential storage.
  No OAuth tokens are persisted by this skeleton.

Missing integration credentials do not prevent the health endpoint from starting.
Flask uses `--debug`; the removed `FLASK_ENV` setting is intentionally omitted.

## Checks

### VS Code

Open the repository root in VS Code. `.vscode/extensions.json` recommends Python,
Pylance, Ruff, Biome, Prettier, Tailwind CSS IntelliSense, and Microsoft's TypeScript 7
extension (`TypeScriptTeam.native-preview`, its retained Marketplace identifier).
The shared workspace settings enable format-on-save with Prettier for frontend files
and Ruff for Python, use the backend virtual environment, and discover `backend/tests`
with pytest. Biome supplies frontend lint diagnostics; the TypeScript language server
uses the project's TypeScript 7 package. Local dependencies must already be installed.

Reload the VS Code window after installing extensions if prompted. If this workspace
already had another Python interpreter selected, run **Python: Select Interpreter**
and select `backend/.venv/Scripts/python.exe`; the default interpreter setting does
not override a previously saved selection. The explicit Ruff and Biome binary paths
target Windows x64; adjust them locally for other platforms. Other projects' workspace
settings and global editor preferences are unchanged.

Configuration follows the official [Biome extension reference](https://biomejs.dev/reference/vscode/),
[Ruff editor settings](https://docs.astral.sh/ruff/editors/settings/), and
[Python settings reference](https://code.visualstudio.com/docs/python/settings-reference).

### Command-line checks

```powershell
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend run build
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
uv run --project backend pytest backend/tests
uv run --project backend alembic -c backend/alembic.ini heads
```

Setup tests construct clients locally and check health, CORS, and the database driver.
They do not access Gmail, OpenRouter, or Neon.

## Migrations and dependency updates

Alembic uses `DIRECT_DATABASE_URL`, never the application's pooled URL. No database
schema or migration has been created. When models are implemented, run Alembic from
`backend/` using `uv run alembic ...` and review generated revisions before applying them.

After changing Python dependencies, regenerate the lock and pip export:

```powershell
uv lock --project backend
uv export --project backend --no-dev --no-hashes --no-emit-project --output-file backend/requirements.txt
```

Use `npm --prefix frontend install` after changing frontend dependencies and retain
the updated lockfile. Dependency versions are pinned for reproducible installs.

Stack references: [Node.js LTS](https://nodejs.org/en/about/previous-releases),
[Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite),
[Flask configuration](https://flask.palletsprojects.com/en/stable/config/), and
[OpenRouter](https://openrouter.ai/docs/quickstart).
