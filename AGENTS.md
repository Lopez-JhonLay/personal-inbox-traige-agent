# Repository Guidelines

## Project Structure & Module Organization

Read `README.md`,
`docs/ARCHITECTURE.md`, and `docs/CODING_GUIDELINES.md` before implementing features.

- `frontend/src/`: React/TypeScript in `components/`, `pages/`,
  `hooks/`, `services/`, `types/`, and `utils/`. Assets: `frontend/public/`.
- `backend/app/`: Flask factory and configuration, with separate `routes/`, `services/`,
  `repositories/`, `models/`, and `schemas/` layers. Keep business logic outside routes.
- `backend/tests/`: pytest tests. `backend/migrations/`: Alembic configuration and revisions.
- `docs/`: requirements, architecture, and roadmap.
- `.vscode/`: shared workspace settings and extension recommendations.

## Build, Test, and Development Commands

Run from the repository root with Node.js 24 or 26 LTS, Python 3.14, and uv:

```powershell
npm --prefix frontend ci
uv sync --project backend --locked
npm --prefix frontend run dev
uv run --project backend flask --app backend/run.py run --debug --port 5000
```

The first two commands install dependencies. Run servers in separate terminals;
Vite proxies `/api` from port 5173 to Flask on port 5000.

- `npm --prefix frontend run build`: type-check and build.
- `npm --prefix frontend run lint`: run Biome.
- `npm --prefix frontend run format:check`: check Prettier formatting.
- `uv run --project backend ruff check backend`: lint Python.
- `uv run --project backend ruff format --check backend`: check Python formatting.
- `uv run --project backend pytest backend/tests`: run backend tests.

## Coding Style & Naming Conventions

Use two-space indentation for frontend/configuration files and four spaces for Python.
Keep TypeScript strict; avoid `any`. Use PascalCase component filenames, camelCase
functions, and snake_case Python modules/functions with type annotations. Python lines
are limited to 100 characters. Biome replaces ESLint due to TypeScript 7 compatibility;
use Prettier and Ruff for formatting.

## Testing Guidelines

Name backend tests `test_*.py` and test functions `test_*`. Cover changed behavior and
failure cases; mock external services. Routine tests must not contact Gmail, OpenRouter,
or Neon. No numeric coverage threshold or frontend test runner is configured.

## Commit & Pull Request Guidelines

Git uses `main`. Repository-local identity and SSH settings
select the personal `Lopez-JhonLay` account; preserve work/global settings. Follow
Conventional Commits, such as `docs: clarify setup`. Keep changes
focused. PR descriptions should explain behavior, link relevant issues, list validation,
and include screenshots for visible UI changes. Do not commit, push, or deploy
unless requested.

## Security & Configuration

Copy `.env.example` files for local configuration; never commit secrets or email data.
Treat `VITE_*` values as public. Keep Gmail permissions read-only. Use the pooled Neon
URL for application traffic and `DIRECT_DATABASE_URL` for migrations. Preserve lockfiles;
regenerate `backend/requirements.txt` from uv when dependencies change.
