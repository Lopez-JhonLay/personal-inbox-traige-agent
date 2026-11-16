# Mailkind

Mailkind helps you review email summaries, spot deadlines, and decide what to handle
first. The product name is Mailkind; the existing repository URL and local folder
name are retained.

Initial monorepo setup based on [the architecture](docs/ARCHITECTURE.md).

- `frontend/`: React, TypeScript, Vite, Tailwind CSS, and a responsive homepage with an interactive sample inbox.
- `backend/`: Flask application factory, settings, health/error handling, and an opt-in
  synthetic-email analysis endpoint with Pydantic-validated OpenRouter results.
- Integration factories: SQLAlchemy with psycopg for Neon, OpenAI SDK for OpenRouter,
  Google OAuth and a read-only Gmail client.
- Five SQLAlchemy domain models, ownership-scoped repositories, and an initial Alembic migration.

Phase 4 adds Google OAuth endpoints, encrypted refresh tokens, read-only Gmail retrieval,
and homepage connection controls. Live consent, refresh, read, disconnect, and reconnect
passed; see `docs/TASKS.md` for verification details.
Phase 5 adds bounded Gmail synchronization, stored email APIs, and sequential analysis
controls on the homepage. Two-message synthetic live acceptance and repeat sync passed;
verification details are tracked in `docs/TASKS.md`.
There is no live inbox dashboard or deployment configuration.
Phase 2 analyzes supplied plain-text
synthetic emails without persistence; see [the Phase 2 guide](docs/TASKS.md#phase-2-analysis-and-testing-guide).
Phase 2 is complete for synthetic-email analysis: the fixed free ERNIE model passed
all eight evaluation cases and manual review. Privacy review for non-synthetic email
content remains later work; free-model capacity can still be rate limited.
Client factories do not call external services during application startup.

Git uses `main` for the initial scaffold and documentation. The SSH origin is
`git@github.com:Lopez-JhonLay/personal-inbox-traige-agent.git`. Repository-local Git
settings use `Lopez-JhonLay`, `jhonlaylopez000@gmail.com`, and the personal
`~/.ssh/id_ed25519_personal` key with `IdentitiesOnly=yes`; global/work settings are
unchanged. Personal GitHub authentication and remote access were verified.
See [the task tracker](docs/TASKS.md) for completed setup work and remaining tasks,
and [the contributor guide](AGENTS.md) for repository conventions.
The [roadmap](docs/TASKS.md) contains every phase's checklist, the Phase 2 testing
guide, and project milestones.

Frontend formatting uses Prettier. Biome supplies linting because the current
`typescript-eslint` release requires TypeScript `<6.1.0`, which excludes the latest
stable TypeScript 7 selected for this setup.

## Design system

The global Tailwind v4 design system uses warm paper/ink colors, readable system
typography, fluid spacing, rounded outlined controls, and crisp offset shadows.
`frontend/src/styles/` contains the theme tokens, document defaults, and responsive
layout/control primitives, imported by `frontend/src/index.css`. Use semantic utilities
such as `bg-paper`, `text-ink`, `text-heading`, and `rounded-panel`, with `stack`,
`cluster`, `auto-grid`, and `sidebar-layout` for layout. See
[DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) for reference analysis, tokens, and examples.
`styles/motion.css` adds opt-in entrance/pop/exit/stagger/lift effects with shared
timing tokens and reduced-motion defaults. Exits require inert content; future
consumers handle visibility, focus, and unmounting.
`App.tsx` renders `pages/HomePage.tsx`, with the responsive navigation, sample inbox,
walkthrough, workspace image, FAQs, and closing call to action. The demo supports
filtering fictional messages, opening their details, copying a sample reply, and
toggling local reviewed status. Reloading resets all demo state. No Gmail or AI calls
are made. The homepage runs with the frontend alone; Flask is only needed for API work.
Copy is warm and direct, with one demo notice beside the inbox. Named imports from
Lucide React replace custom icon artwork; icons mainly identify actions and states.
The locally served workspace photo is from
[Unsplash](https://images.unsplash.com/photo-1497032628192-86f99bcd76bc), under the
[Unsplash license](https://unsplash.com/license).

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

The homepage is at `http://localhost:5173`.
Vite proxies `/api` to Flask on `127.0.0.1:5000`. The fetch wrapper sends session cookies;
the backend restricts cross-origin access to `FRONTEND_URL`.

```powershell
Invoke-RestMethod http://localhost:5000/api/health
Invoke-RestMethod http://localhost:5173/api/health
```

Health is a liveness check and does not test external credentials or connectivity.

## API errors

Flask HTTP errors use the architecture's JSON envelope and retain their status codes:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Not Found"
  }
}
```

Unknown routes return 404; unsupported methods return 405 with the `Allow` header.
Other HTTP errors preserve protocol headers such as `Retry-After`. Messages are
generic and do not echo custom exception descriptions. Unexpected exceptions return
500 JSON when debug/testing exception propagation is disabled; Flask retains its
normal server-side exception logging. Local `--debug` mode intentionally retains
Flask's interactive debugger. Error handling is registered in the application factory
so routing failures are covered as well as Blueprint errors.

## Integration configuration

All credentials stay in `backend/.env`. Frontend `VITE_*` values are public.
See each `.env.example` for the complete variable list.

- **Neon:** set `DATABASE_URL` to the pooled PostgreSQL URL and `DIRECT_DATABASE_URL`
  to the direct URL, retaining Neon's SSL query parameters. Standard `postgresql://`
  URLs are normalized to `postgresql+psycopg://`. The application creates a lazy engine
  only when configured. Future repositories can use
  `app.extensions["database"].session_factory.begin()` for transaction-scoped sessions.
- **Google:** follow the [Phase 4 setup guide](docs/TASKS.md#phase-4-setup-and-testing-guide).
  Supply web client credentials and register the exact `GOOGLE_REDIRECT_URI`. OAuth uses
  only `gmail.readonly`, state, and PKCE. The connection panel uses `/api/auth/status`,
  `/api/auth/google`, and CSRF-protected `/api/auth/disconnect`; Google returns to
  `/api/auth/google/callback`. Accounts are identified with Gmail's authenticated profile.
- **OpenRouter:** supply an API key locally and use
  `OPENROUTER_MODEL=baidu/ernie-5.5-flash-preview:free`.
  Set `ENABLE_DEV_ANALYSIS=true` only for local synthetic-email testing. The development
  endpoint is absent by default. Requests use strict structured output, a 30-second
  timeout per attempt, and at most two attempts overall; SDK retries are disabled.
  The selected model is fixed, and no automatic model fallback is configured. See
  [request examples and evaluation instructions](docs/TASKS.md#phase-2-analysis-and-testing-guide).
- **Token encryption:** set `TOKEN_ENCRYPTION_KEY` to a Fernet key. Refresh tokens are
  encrypted before database storage; access tokens are held in request memory. Keep the
  key stable across restarts. A lost/replaced key requires accounts to reconnect.

Sessions use a signed HttpOnly `mailkind_session` cookie with SameSite=Lax and an
eight-hour lifetime. Set `SESSION_COOKIE_SECURE=true` with production HTTPS. Tokens are
never stored in cookies; authenticated status responses include a CSRF token for mutations.
Use `localhost` consistently across ports 5173 and 5000 during local OAuth testing.
Disconnect removes stored credentials and the current cookie, retaining saved content.
If remote revocation fails, the UI explains how to remove access in the Google Account.
Configure hosted access logs to omit callback query strings; the local Werkzeug filter
redacts them. Production hosting and cross-site cookie deployment remain Phase 10 work.

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
not override a previously saved selection. The workspace explicitly names the Python
executable because this extension combination passed a `.venv` directory setting
directly to Pylance, preventing installed packages from being resolved.
The explicit Python, Ruff, and Biome binary paths
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

Backend tests cover setup, health/CORS, safe API errors, analysis schemas, request
contracts, mocked OpenRouter responses, retry bounds, and the live-evaluation budget.
They do not access Gmail, OpenRouter, or Neon. Routes used to induce errors exist
only inside the tests. The evaluation script is a separate, opt-in network operation.

## Inbox processing

See the [Phase 5 verification guide](docs/TASKS.md#phase-5-verification-guide) before your
first run. Local sync is restricted to inbox messages labeled `mailkind-test`; prepare
fictional test messages and review the displayed filter and confirmation before syncing.
Clearing `GMAIL_SYNC_QUERY` opts into the most recent inbox messages instead.

Sync stores up to 20 normalized emails and pending analyses. The homepage then analyzes
one email per request, preserving completed work. Continue analysis resumes pending work;
Retry failed creates new attempts. A rate limit pauses the remaining queue. Closing the
page stops scheduling new requests, while any request already running may finish.

Authenticated `/api/emails` endpoints provide listing, detail, analysis, and history;
mutations use the existing session CSRF token. Imported data remains after disconnect,
with automated retention controls deferred. The sample inbox stays fictional.

## Migrations and dependency updates

Alembic uses `DIRECT_DATABASE_URL`, never the application's pooled URL. Revision `0001`
creates `users`, `gmail_connections`, `emails`, `email_analyses`, and `action_items`.
Revision `0002` adds a two-minute connection operation lease and a unique partial index
preventing multiple pending/processing analyses for an email. Upgrade before starting
the Phase 5 backend. Revisions already applied are never modified.
Use both URLs for the same Neon database in the ignored `backend/.env`, preserving
Neon's SSL parameters. No local PostgreSQL installation is required.

Inspect existing tables and migration state before applying the initial migration.
It creates only the five domain tables and Alembic's version table; it does not replace
existing tables. Flask startup never runs migrations or creates tables automatically.

```powershell
uv run --project backend alembic -c backend/alembic.ini upgrade head
uv run --project backend alembic -c backend/alembic.ini current
uv run --project backend pytest backend/tests --run-db-tests
```

Normal pytest runs are offline. `--run-db-tests` explicitly enables Neon tests using
`DATABASE_URL`; missing configuration or migrations cause an error. Tests use synthetic
data inside an outer transaction with session savepoints and always roll back, including
when a test calls `session.commit()`. They do not truncate tables, drop schemas, or
execute migration downgrades. Offline tests check the migration against model metadata
and render upgrade/downgrade SQL. Downgrade execution is not tested against Neon.

Repositories accept an explicit session and user ID, enforce ownership, and flush without
committing. Services own transactions:

```python
from app.repositories.email_repository import list_emails

with database.session_factory.begin() as session:
    emails = list_emails(session, authenticated_user_id, limit=50)
    # Map records to response data before the session closes.
```

The existing Flask extension supplies `database = app.extensions["database"]`.
Phase 4 persists OAuth users and encrypted Gmail connections; Phase 5 persists
synchronized messages and validated results from `analyze_email()`. Provider calls stay
outside database transactions. `/api/dev/analyze` remains stateless.

Email insertion uses PostgreSQL `ON CONFLICT DO NOTHING` to retain the original message.
Analysis attempts preserve history; the latest completed attempt is selected by creation
time and UUID as a tie-breaker. Actions are created explicitly by the user, and must refer
to their own emails. User deletion cascades to dependent records. Gmail disconnection
retains email history and clears the encrypted refresh token. The connection repository
expects caller-encrypted ciphertext, now supplied by the Phase 4 auth service.
Conditional refresh writes cannot restore a disconnected connection.

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
