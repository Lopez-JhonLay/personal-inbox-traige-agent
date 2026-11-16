# Mailkind

## Development Roadmap

Detailed checklists are linked under [Overall Progress](#overall-progress).
Key milestones are recorded in [Development History](#development-history).

**Version:** 1.9\
**Status:** In Progress — Phases 0 through 3 Complete; Phase 4 Next\
**Project:** Mailkind  
**Development Approach:** Incremental, Project-Based Learning

---

## Project Overview

This document serves as the development roadmap and task tracker for Mailkind.

The project will be developed incrementally, starting with environment setup and backend fundamentals before introducing AI integration, Gmail connectivity, database persistence, the frontend dashboard, and deployment.

### Development Principles

- Complete one phase at a time.
- Understand each concept before implementing it.
- Build working features rather than isolated exercises.
- Test features before marking them complete.
- Follow `PRD.md`, `ARCHITECTURE.md`, and `CODING_GUIDELINES.md`.
- Avoid unnecessary complexity and premature optimization.
- Maintain human approval for sensitive operations.

### Task Status Legend

- `[ ]` Not started or incomplete
- `[x]` Completed

### Current Setup — November 16, 2026

The product is named **Mailkind**. Homepage branding, page metadata, package names,
and project documentation use this name. The existing GitHub repository URL and
local folder name are retained.

The initial project skeleton and dependencies are installed and locked. Verified:
frontend build, Biome/Prettier, Python Ruff checks, 88 backend tests (including opt-in Neon tests),
`GET /api/health`, and the Vite-to-Flask proxy. External client construction is tested
locally; live OpenRouter synthetic requests have succeeded. Neon connectivity and
migration `0001` are verified; Gmail remains unverified.

Git is initialized on `main`. The user supplied the GitHub repository at
`git@github.com:Lopez-JhonLay/personal-inbox-traige-agent.git`; it is configured as
`origin`, and SSH authentication and remote access were verified. Repository-local
identity is `Lopez-JhonLay <jhonlaylopez000@gmail.com>`; SSH selects
`~/.ssh/id_ed25519_personal` with `IdentitiesOnly=yes`. Work/global settings are unchanged.
The user authorized the initial commit and push of the scaffold and documentation.

Phase 0 editor setup is complete: recommended extensions are installed, and shared
`.vscode/settings.json` and `.vscode/extensions.json` configure formatting, linting,
the Python environment, pytest discovery, and the TypeScript 7 language server.
Configured tool paths, test collection, frontend build/lint/format, Python lint/format,
and all five backend tests were verified. Reload VS Code if extension activation is
pending; any previously selected Python interpreter must be changed using
**Python: Select Interpreter** as described in `README.md`.

Phase 1 is complete. Flask errors return the standard JSON envelope with accurate
HTTP statuses and preserved protocol headers. Messages do not echo private exception
descriptions. Unexpected failures use generic 500 JSON outside debug/testing exception
propagation, retaining Flask's normal exception logging. Seven error-handling tests
and the five original setup tests pass; error-inducing routes exist only in tests.

The user also authorized the global design system before Phase 2. Reference research
used web search and public HTML/CSS, without computer automation. Tailwind v4 theme
tokens, base typography, responsive layout primitives, and control/link/surface styles
are implemented and documented in `DESIGN_SYSTEM.md`. This does not complete the
remaining frontend UI or application-feature work.

Phase 2 implements the gated development analysis endpoint, strict Pydantic schemas,
versioned untrusted-input prompt, and bounded AI retries. The OpenRouter account and
local key are configured. Initial free-router evaluations used 20 synthetic requests
and exposed invalid outputs and draft commitments. The subsequent fixed ERNIE model
passed all eight cases and manual review in nine requests, including one rate limit.
`baidu/ernie-5.5-flash-preview:free` is now selected. Phase 2 is complete for synthetic
analysis; Gmail, the live processing pipeline, and real-email privacy review remain later work.
See [Phase 2 guide](#phase-2-analysis-and-testing-guide) for findings and limitations.

Only individually completed tasks are checked below. Client factories and environment
placeholders do not count as completed auth flows, live integrations, or persistence.
Phase completion requires all remaining work, including error handling, UI, or security
checks applicable to that phase. Later-phase setup work is recorded without implying
that those features or the full MVP are complete.

### Overall Progress

- [x] [Phase 0 — Development Environment & Project Setup](#phase-0--development-environment--project-setup)
- [x] [Phase 1 — Flask Backend Foundation](#phase-1--flask-backend-foundation)
- [x] [Phase 2 — AI Integration & Email Analysis](#phase-2--ai-integration--email-analysis)
- [x] [Phase 3 — Database Design & Persistence](#phase-3--database-design--persistence)
- [ ] [Phase 4 — Google OAuth & Gmail Integration](#phase-4--google-oauth--gmail-integration)
- [ ] [Phase 5 — Email Synchronization & AI Pipeline](#phase-5--email-synchronization--ai-pipeline)
- [ ] [Phase 6 — React Frontend Foundation](#phase-6--react-frontend-foundation)
- [ ] [Phase 7 — Dashboard & Email Management](#phase-7--dashboard--email-management)
- [ ] [Phase 8 — Action Tracking & Reply Drafts](#phase-8--action-tracking--reply-drafts)
- [ ] [Phase 9 — Testing, AI Evaluation & Security](#phase-9--testing-ai-evaluation--security)
- [ ] [Phase 10 — Deployment & Final Validation](#phase-10--deployment--final-validation)

---

# Phase 0 — Development Environment & Project Setup


**Status:** Complete — Development Tools, Workspace Configuration, and Git Setup Verified

## Objective

Prepare the local development environment, initialize the project, and configure the tools required for development.

## Learning Goals

- Understand the project's technology stack.
- Understand frontend/backend separation.
- Learn Python virtual environments.
- Understand environment variables.
- Establish a clean Git workflow.

## Tasks

### 0.1 Development Tools

- [x] Install or verify Git.
- [x] Install or verify Node.js LTS.
- [x] Install or verify npm.
- [x] Install or verify Python 3.
- [x] Install or verify uv for dependency installation (pip is optional and absent from the uv virtual environment).
- [x] Install or verify Visual Studio Code.
- [x] Configure VS Code for React, TypeScript, and Python development.
- [x] Install or verify recommended VS Code extensions:
  - [x] Python
  - [x] Pylance
  - [x] Biome
  - [x] Prettier
  - [x] Ruff
  - [x] Tailwind CSS IntelliSense
  - [x] TypeScript 7 (`TypeScriptTeam.native-preview`, the retained Marketplace identifier)
- [x] Configure format-on-save, project-local tools, backend imports, and pytest discovery.
- [x] Track shared workspace settings and extension recommendations while ignoring other local editor files.

### 0.2 Project Initialization

- [x] Create the project root directory.
- [x] Initialize a Git repository.
- [x] Create a GitHub repository (user supplied; empty remote access verified).
- [x] Connect the local repository to GitHub.
- [x] Create the `frontend/` directory.
- [x] Create the `backend/` directory.
- [x] Create the `docs/` directory.
- [x] Add `PRD.md`.
- [x] Add `ARCHITECTURE.md`.
- [x] Add `CODING_GUIDELINES.md`.
- [x] Add the development tracker as `docs/TASKS.md`.
- [x] Create a root `.gitignore`.
- [x] Create an initial `README.md`.
- [x] Add contributor instructions in `AGENTS.md` and shared `.editorconfig` conventions.

### 0.3 Git Configuration

- [x] Confirm repository-local personal Git username, email, and SSH key settings.
- [x] Configure `.gitignore` for Node.js, Python, virtual environments, and secret files.
- [x] Verify that `.env` files are ignored and `.env.example` files remain trackable.
- [x] Create the initial Git commit.
- [x] Push the initial commit to GitHub.

## Phase Completion Checklist

- [x] All required development tools are installed; configured paths and command-line checks pass.
- [x] Project folder structure is initialized.
- [x] Documentation exists in the project.
- [x] GitHub repository is connected.
- [x] No credentials or secret files are committed; local secret files are ignored.

**Deliverable:** Initialized project repository and development environment.

---

# Phase 1 — Flask Backend Foundation


**Status:** Complete — Flask Foundation and Basic API Error Handling Verified

## Objective

Create a functional Flask REST API that will serve as the backend foundation.

## Learning Goals

- Understand how Flask handles HTTP requests.
- Understand REST APIs.
- Learn Flask Blueprints.
- Understand the application factory pattern.
- Learn request and response handling.
- Understand layered backend architecture.

## Tasks

### 1.1 Python Environment

- [x] Navigate to `backend/`.
- [x] Create a Python virtual environment.
- [x] Run commands in the virtual environment using uv (manual activation is unnecessary).
- [x] Install Flask.
- [x] Install Pydantic.
- [x] Install python-dotenv (via pydantic-settings).
- [x] Set up dependency management with uv, pinned dependencies, lockfile, and requirements export.
- [x] Create `.env.example`.
- [x] Confirm that the Flask application runs locally.

### 1.2 Backend Structure

- [x] Create the `app/` package.
- [x] Create the Flask application factory.
- [x] Create `config.py`.
- [x] Create the `routes/` directory.
- [x] Create the `services/` directory.
- [x] Create the `repositories/` directory.
- [x] Create the `models/` directory.
- [x] Create the `schemas/` directory.
- [x] Create the `utils/` directory.
- [x] Register the health Blueprint (feature Blueprints remain unimplemented).

### 1.3 First API Endpoint

- [x] Create `GET /api/health`.
- [x] Return a structured JSON response.
- [x] Test the endpoint directly and through Vite using an HTTP client.
- [x] Verify the health endpoint returns HTTP 200.
- [x] Configure application-wide JSON HTTP error handling, including safe 500 responses and preserved protocol headers.

### 1.4 Code Quality Setup

- [x] Install and configure Ruff.
- [x] Install and configure Pytest.
- [x] Create a `tests/` directory.
- [x] Write a test for the health endpoint.
- [x] Run formatting and linting checks.
- [x] Run backend tests successfully (five setup tests and seven API error-handling tests).

## Phase Completion Checklist

- [x] Flask runs without errors.
- [x] Health endpoint returns a successful response.
- [x] Layered backend structure is established.
- [x] Environment variables are supported.
- [x] Basic backend test passes.
- [x] Basic API error handling is configured and tested.

**Deliverable:** Working Flask REST API foundation.

---

# Phase 2 — AI Integration & Email Analysis


**Status:** Complete — Fixed Free Model Passed Synthetic Evaluation and Manual Review

## Objective

Integrate a free AI model through OpenRouter and create an email analysis service using sample data.

## Learning Goals

- Understand LLM inference.
- Understand system and user prompts.
- Learn the OpenAI Python SDK.
- Understand OpenRouter's model API.
- Learn structured outputs.
- Understand tokens, rate limits, and model responses.
- Learn Pydantic validation.
- Understand AI hallucinations and prompt injection.

## Tasks

### 2.1 OpenRouter Setup

- [x] Create an OpenRouter account.
- [x] Explore available free AI models.
- [x] Compare candidate models for email analysis.
- [x] Review model/provider privacy and data retention policies.
- [x] Select an initial free model.
- [x] Generate an OpenRouter API key.
- [x] Add `OPENROUTER_API_KEY` to the backend environment.
- [x] Add `OPENROUTER_MODEL` to the backend environment.
- [x] Install the OpenAI Python SDK.
- [x] Configure the SDK client factory to use OpenRouter.
- [x] Make a successful test request using synthetic text.

### 2.2 Email Analysis Design

- [x] Define the expected email analysis output.
- [x] Define email categories.
- [x] Define priority classification rules.
- [x] Define requested-action extraction rules.
- [x] Define deadline extraction rules.
- [x] Define reply-needed detection rules.
- [x] Define suggested reply behavior.

### 2.3 Pydantic Schema

- [x] Create an email input schema.
- [x] Create an email analysis response schema.
- [x] Define allowed category values.
- [x] Define allowed priority values.
- [x] Support optional and nullable fields.
- [x] Add appropriate field validation.
- [x] Test valid and invalid model responses.

### 2.4 Prompt Engineering

- [x] Create the initial system prompt.
- [x] Define the email analysis instructions.
- [x] Define the expected output format.
- [x] Include rules for missing information.
- [x] Include rules against invented facts.
- [x] Treat email content as untrusted data.
- [x] Include timestamp and timezone context for relative dates.
- [x] Test prompts using different sample emails.

### 2.5 AI Service Implementation

- [x] Create `ai_service.py` with a client factory, timeout, and bounded service retries; SDK retries disabled.
- [x] Implement the AI API request.
- [x] Parse the model response.
- [x] Validate the result using Pydantic.
- [x] Handle malformed responses.
- [x] Handle API errors and timeouts.
- [x] Handle rate limits.
- [x] Add limited retry behavior.
- [x] Keep the AI model configurable.

### 2.6 Analysis Endpoint

- [x] Create a development analysis endpoint.
- [x] Accept a sample email request.
- [x] Call the AI service.
- [x] Return the validated analysis as JSON.
- [x] Test using multiple synthetic sample emails.
- [x] Restrict or remove the development endpoint before production deployment.

## Phase Completion Checklist

- [x] Pass controlled model evaluation and manual quality review; see [analysis and testing guide](#phase-2-analysis-and-testing-guide).

- [x] OpenRouter connection works.
- [x] Sample emails can be analyzed.
- [x] AI returns structured output.
- [x] Pydantic validation works.
- [x] Invalid outputs are handled.
- [x] AI failures do not crash the API.

**Deliverable:** Working AI-powered email analysis endpoint.

## Guide and Manual Verification

See the [analysis and testing guide](#phase-2-analysis-and-testing-guide) for configuration, requests, and
evaluation findings. The user confirmed manual testing passed on November 16, 2026.

## Phase 2 Analysis and Testing Guide


Run all commands below from the repository root.

Mailkind analyzes one supplied plain-text email with OpenRouter. This is a local
development integration for synthetic examples, without Gmail access, storage,
authentication, autonomous actions, or frontend integration.

### Configuration and model choice

Set these values in the existing ignored `backend/.env`, then restart Flask:

```dotenv
OPENROUTER_API_KEY=your-local-key
OPENROUTER_MODEL=baidu/ernie-5.5-flash-preview:free
ENABLE_DEV_ANALYSIS=true
```

Keep keys in the backend. The endpoint does not exist when the flag is false, which
is the default. Use Flask bound to localhost; the development endpoint is unauthenticated
and should stay disabled outside local development.

The selected model is
[ERNIE-5.5-Flash-Preview (free)](https://openrouter.ai/baidu/ernie-5.5-flash-preview:free).
On November 16, 2026, OpenRouter listed zero input/output prices, JSON Schema support,
and one serving provider (Baidu). It passed the eight synthetic cases and manual review
below. This is a small initial acceptance set, not a claim that it is the best model
or that it is ready for real email. The model alias/provider implementation may evolve.

The [free router](https://openrouter.ai/docs/guides/routing/routers/free-router) was
evaluated first but produced inconsistent quality across models. It remains an explicit
evaluation option. `model` in the API response identifies the actual model. GPT-5.6 Sol
was considered but is paid. No automatic model fallback is configured.

As checked November 16, 2026, [free-model limits](https://openrouter.ai/collections/free-models)
are 20 requests/minute and 50/day across the account, rising to 1,000/day after
purchasing at least $10 in credits. Failed attempts and retries can consume capacity;
the app does not maintain a separate authoritative account-quota counter.

### Request and response

Start the backend from the repository root:

```powershell
uv run --project backend flask --app backend/run.py run --debug --port 5000
```

In a separate PowerShell terminal:

```powershell
$sampleEmail = @{
  subject = 'Project feedback'
  sender = 'Maya <maya@example.test>'
  body = 'Please review the draft by tomorrow, November 17, 2026. Please reply with comments.'
  received_at = '2026-11-16T09:00:00+08:00'
  timezone = 'Asia/Manila'
} | ConvertTo-Json
Invoke-RestMethod http://localhost:5000/api/dev/analyze `
  -Method Post -ContentType 'application/json' -Body $sampleEmail
```

The subject can be empty; sender can be absent or null. Body must be nonblank plain
text. Limits: subject 500 characters, sender 320, body 20,000, request 128 KiB.
`received_at` requires a UTC offset and `timezone` requires an IANA name. Unknown
fields are rejected. HTML normalization belongs to the future Gmail pipeline.

Success uses `{success: true, data: {analysis, model, prompt_version, usage}}`.
`usage` contains prompt/completion/total token counts when available, otherwise null.
Analysis requires every architecture field: summary, category, priority, deadline,
deadline_text, requested_action, suggested_action, reply_needed, and draft_reply.
Missing facts use null. Categories follow the PRD, including plural `Newsletters`.

Summary: 1–2 sentences, capped at 500 characters. Other action text is capped at
2,000 characters, drafts at 4,000, and deadline wording at 500. Extracted deadline
wording must occur in the source subject/body (ignoring case and whitespace).
Priority depends on consequential urgency, not keywords.
Relative dates use the received timestamp and user timezone; priority also considers
current time. Ambiguous phrases such as an unspecified Friday retain `deadline_text`
without a guessed date. Drafts avoid invented commitments and are null when no reply
is needed. These are prompt rules plus structural validation, not factual guarantees.

### Failure handling and privacy

Errors retain `{success: false, error: {code, message}}`. Invalid requests return
400, oversized requests 413, unsupported content types 415, provider rate limits 429,
unavailable configuration/credentials/capacity 503, exhausted timeouts 504, and
invalid/refused model output 502. Valid `Retry-After` values are preserved.

The service has a 30-second timeout per attempt and at most two attempts overall,
with one second between attempts. SDK retries are disabled. Only connection errors,
timeouts, provider 5xx errors, and invalid output are retried. Rate limits and refusals
return immediately. A malformed result is requested again without returning its content
to the model. Health checks never contact OpenRouter.

Prompt version `email-analysis-v2` treats all email fields as untrusted data. No tools
are supplied. Application logs contain model/version/token metadata and safe error
codes, never bodies, drafts, API keys, or raw provider errors.

Review [OpenRouter privacy](https://openrouter.ai/privacy) and
[provider logging policies](https://openrouter.ai/docs/guides/privacy/provider-logging).
Provider training and retention policies vary. Separate free-model account privacy
settings can restrict training-enabled providers and may reduce availability. Free
routing does not guarantee zero retention; provider-specific review remains necessary
before real email processing. This phase uses only synthetic fixtures.

### Verification

```powershell
uv run --project backend pytest backend/tests
uv run --project backend ruff check backend
uv run --project backend ruff format --check backend
```

Routine tests use mocked HTTP transports and never make inference requests. The
installed SDK uses `httpx2`; tests use its existing mock transport without another
HTTP dependency. `tzdata` is explicitly pinned for IANA timezone support on Windows.

The opt-in evaluation sends synthetic fixtures and makes at most ten requests per run:

```powershell
uv run --project backend python backend/scripts/evaluate_analysis.py `
  --model baidu/ernie-5.5-flash-preview:free --max-requests 10
```

Eight cases cover work, billing, meetings, personal mail, newsletters, promotions,
ambiguous dates, and prompt injection. Two extra requests can recheck failures. Every
attempt is counted; SDK/service retries are disabled inside this runner. It stops on
rate limits or unavailable configuration/capacity. Re-running spends a new budget.
The evaluation uses a fixed November 16, 2026 reference time for reproducible urgency.

The JSON report includes actual models, outputs, expected-field mismatches, and attempt
history. A zero exit code means all expected fields matched, not that manual review
passed. Inspect summaries, amounts, dates, actions, drafts, and injection handling
before marking Phase 2 complete. Keep generated reports in ignored `.cache/`.

Only the fixed ERNIE model and `openrouter/free` are allowed by the runner; arbitrary
models, including paid models, are rejected. `--model` overrides the evaluation only,
without editing `.env`. Checks include required non-null actions for actionable cases.
To resume selected cases after a rate limit, use repeated `--case` flags and set
`--max-requests` to the remaining authorized budget. Each invocation has its own cap;
budgets do not automatically carry across runs. The report records valid `Retry-After`
values, when supplied. Do not automatically retry 429 responses.

```powershell
uv run --project backend python backend/scripts/evaluate_analysis.py `
  --model baidu/ernie-5.5-flash-preview:free --max-requests 5 `
  --case newsletter --case promotion --case ambiguous-date --case prompt-injection
```

### Evaluation findings — November 16, 2026

**Phase 2 is complete for synthetic-email analysis.** The first two approved batches
used 20 requests and exposed quality failures. The subsequent fixed-model round used
nine requests within its ten-request cap, bringing the total to 29 synthetic requests.

| Batch | Configuration | Automated result | Manual review |
| --- | --- | --- | --- |
| Initial | Prompt v1, 2,000 output tokens | 6/8 expected-field matches after 10 attempts | Work and meeting drafts made unsupported commitments. Injection had no usable output. One deadline mismatch was harmless source phrasing: `by Friday` versus `Friday`. |
| Revised | Prompt v2, 4,096 output tokens | 6/8 expected-field matches after 10 attempts | Draft commitments improved, but billing omitted the requested action and rewrote deadline wording; an ambiguous-date summary contained serialization artifacts. Promotion and injection still lacked usable output. |
| Fixed ERNIE | Prompt v2, final stricter validation, 4,096 output tokens | 8/8 cases passed across nine attempts | All eight manually reviewed outputs passed: source dates/amounts/actions preserved, ambiguous Friday remained undated, drafts made no commitments, injection instructions were ignored. One request hit 429; a later run resumed only the four unfinished cases. |

Observed models included `nvidia/nemotron-3.5-super-vl:free`,
`baidu/ernie-5.5-flash-preview:free`, and `liquid/lfm-3-1.7b:free`.
This small, varying-model sample does not establish comparative model quality.
Invalid-output failures were handled safely, but the original report did not distinguish
truncation from schema failures; it would be incorrect to attribute all failures to
truncation. Later failures now include a safe reason code in logs/evaluation reports.

After those evaluations, validation was tightened to reject deadline wording absent
from the email and summaries above 500 characters. These guards and the revised
service pass mocked tests and were used in the successful fixed-model evaluation.
The stored 6/8 counts describe the earlier configurations, not the final stricter schema.
Reports are local ignored files: `.cache/phase2-evaluation.json` and
`.cache/phase2-evaluation-v2.json` (PowerShell redirection produced UTF-16 JSON).

The controlled round used `baidu/ernie-5.5-flash-preview:free` throughout. Four cases
passed initially; the fifth request (newsletter) was rate limited and the runner stopped.
After a cooldown, the remaining four cases passed in four requests. Key metadata
confirmed a free-tier account but did not establish the cause or reset time of that
rate limit. This evaluation does not establish sustained throughput or production quality.

Reports: `.cache/phase2-evaluation-fixed-ernie.json` and
`.cache/phase2-evaluation-fixed-ernie-resume.json` (UTF-16 JSON). The selected model is
now configured in Settings, the environment example, and local `.env`. There are 80
passing backend tests; Ruff and frontend lint/format/build checks also passed.
Future live evaluation uses a new explicit request budget. Phase 3 persistence is now
verified; real-email privacy/provider review is required before Gmail content is used.

---

# Phase 3 — Database Design & Persistence


**Status:** Complete — Neon Migration and Repository Tests Verified

## Objective

Set up Neon PostgreSQL and implement persistent data storage using SQLAlchemy.

## Learning Goals

- Understand ORM concepts.
- Learn SQLAlchemy models and relationships.
- Understand database migrations.
- Learn PostgreSQL constraints.
- Understand transactions.
- Learn secure database connections.

## Tasks

### 3.1 Neon Setup

- [x] Create a Neon account.
- [x] Create a PostgreSQL project.
- [x] Obtain the database connection strings.
- [x] Configure pooled database connection.
- [x] Configure direct database connection for migrations.
- [x] Add database environment variables.
- [x] Verify database connectivity.

### 3.2 SQLAlchemy Setup

- [x] Install SQLAlchemy.
- [x] Install a compatible PostgreSQL driver (psycopg).
- [x] Configure a lazy SQLAlchemy engine factory with PostgreSQL URL normalization.
- [x] Configure a database session factory with service-owned transactions.
- [x] Document transaction-scoped session usage in `README.md`.
- [x] Test a basic database query.

### 3.3 Database Models

- [x] Create the `users` model.
- [x] Create the `gmail_connections` model.
- [x] Create the `emails` model.
- [x] Create the `email_analyses` model.
- [x] Create the `action_items` model.
- [x] Define foreign key relationships.
- [x] Define unique constraints.
- [x] Define useful indexes.

### 3.4 Database Migrations

- [x] Install Alembic.
- [x] Initialize Alembic configuration and an empty revision directory.
- [x] Configure Alembic to read `DIRECT_DATABASE_URL` (live connectivity verified).
- [x] Generate the initial migration.
- [x] Review migration changes.
- [x] Apply the migration.
- [x] Verify that tables were created successfully.

### 3.5 Repository Layer

- [x] Implement user persistence.
- [x] Implement Gmail connection persistence.
- [x] Implement email persistence.
- [x] Implement analysis persistence.
- [x] Implement action-item persistence.
- [x] Add duplicate prevention.
- [x] Add user ownership filtering.
- [x] Test database transactions.

## Phase Completion Checklist

- [x] Flask connects to Neon.
- [x] Database tables exist.
- [x] SQLAlchemy models work.
- [x] Alembic migrations work.
- [x] Records can be created and retrieved.
- [x] Duplicate email records are prevented.

**Deliverable:** Persistent database and repository layer.

## Phase 3 Verification

Migration `0001` was reviewed and applied to the user's empty Neon development database.
Both URLs target the same endpoint/database: pooled application URL and direct migration URL.
Five domain tables plus `alembic_version` exist. No local PostgreSQL or separate test URL is used.

- Offline suite: 82 passed, six Neon tests skipped.
- Explicit Neon suite: all 88 tests passed with `--run-db-tests`.
- Tests cover persistence, duplicate constraints, ownership, analysis history, action status,
  savepoint rollback, and cascading deletion. Synthetic writes are rolled back, including
  service-style commits inside the fixture's outer transaction.
- Offline tests compare migration columns/constraints/indexes with model metadata and render
  upgrade/downgrade SQL. No migration downgrade was executed against Neon.
- Alembic reports no schema drift; all five domain tables contain zero rows after tests.
- Flask's pooled database connection, Ruff lint, and formatting checks passed.

Commands and repository usage are documented in `README.md`. Phase 4 will connect OAuth
users and encrypted credentials to these repositories; Phase 5 will persist synchronized
emails and validated AI results. No new endpoints or frontend changes were introduced.
The development analysis endpoint remains stateless.

---

# Phase 4 — Google OAuth & Gmail Integration


**Status:** In Progress — Client Factories Only; Authorization and Retrieval Pending

## Objective

Allow users to securely connect their Gmail account and retrieve real emails.

## Learning Goals

- Understand OAuth 2.0.
- Understand authorization scopes.
- Learn Gmail API fundamentals.
- Understand access and refresh tokens.
- Learn secure session management.
- Understand API permissions and rate limits.

## Tasks

### 4.1 Google Cloud Setup

- [ ] Create a Google Cloud project.
- [ ] Enable the Gmail API.
- [ ] Configure Google Auth Platform settings.
- [ ] Configure the OAuth consent screen.
- [ ] Add authorized test users when required.
- [ ] Create OAuth client credentials for a web application.
- [ ] Configure authorized redirect URIs.
- [ ] Store Google credentials in backend environment variables.

### 4.2 OAuth Backend

- [x] Install required Google authentication libraries.
- [x] Add a Google OAuth Flow factory using the read-only Gmail scope (no authorization exchange).
- [ ] Implement OAuth authorization flow.
- [ ] Generate and validate OAuth state.
- [ ] Implement the OAuth callback endpoint.
- [ ] Exchange authorization codes for tokens.
- [ ] Retrieve the authorized account identity.
- [ ] Establish authenticated application sessions.
- [ ] Encrypt refresh tokens before storage.
- [ ] Implement secure token refresh.
- [ ] Handle failed or denied authorization.

### 4.3 Gmail Service

- [x] Create `gmail_service.py`.
- [x] Configure a Gmail API client factory accepting caller-supplied credentials.
- [ ] Retrieve Gmail account information.
- [ ] Fetch a list of recent message IDs.
- [ ] Retrieve individual message details.
- [ ] Extract sender information.
- [ ] Extract subject information.
- [ ] Extract received timestamps.
- [ ] Decode supported message bodies.
- [ ] Handle plain-text and HTML emails.
- [ ] Ignore attachment contents for MVP.
- [ ] Handle Gmail API failures.

### 4.4 Connection Management

- [ ] Implement Gmail connection status endpoint.
- [ ] Implement Gmail disconnect endpoint.
- [ ] Revoke access where supported.
- [ ] Remove stored credentials on disconnection.
- [ ] Define handling of previously synchronized data.
- [ ] Verify authorization is required for protected endpoints.

## Phase Completion Checklist

- [ ] User can connect Gmail.
- [ ] OAuth flow works securely.
- [ ] Backend can retrieve authorized Gmail messages.
- [ ] Access and refresh tokens are protected.
- [ ] User can disconnect Gmail.
- [ ] No Gmail write permissions are required.

**Deliverable:** Secure, read-only Gmail integration.

---

# Phase 5 — Email Synchronization & AI Pipeline


**Status:** Not Started

## Objective

Connect Gmail retrieval, email storage, AI analysis, and database persistence into one working pipeline.

## Learning Goals

- Understand service orchestration.
- Learn data transformation pipelines.
- Understand duplicate prevention.
- Learn processing states and retries.
- Understand API rate-limit management.

## Tasks

### 5.1 Email Synchronization

- [ ] Create an email synchronization service.
- [ ] Implement `POST /api/emails/sync`.
- [ ] Retrieve up to 20 recent messages.
- [ ] Normalize Gmail message data.
- [ ] Check for previously stored message IDs.
- [ ] Save only new messages.
- [ ] Return synchronization results.

### 5.2 AI Processing Pipeline

- [ ] Retrieve unprocessed emails.
- [ ] Prepare normalized AI input.
- [ ] Call the AI service.
- [ ] Validate analysis results.
- [ ] Save completed analyses.
- [ ] Record the model identifier.
- [ ] Track pending, processing, completed, and failed states.
- [ ] Prevent accidental duplicate analysis.
- [ ] Allow failed messages to be reanalyzed.

### 5.3 Processing Reliability

- [ ] Limit AI request concurrency.
- [ ] Handle OpenRouter rate limits.
- [ ] Handle partial synchronization failures.
- [ ] Preserve successfully processed messages.
- [ ] Prevent overlapping synchronization requests.
- [ ] Keep processing batches within deployment time limits.
- [ ] Return understandable processing statuses.

### 5.4 Email API Endpoints

- [ ] Implement `GET /api/emails`.
- [ ] Implement `GET /api/emails/{id}`.
- [ ] Implement `POST /api/emails/{id}/analyze`.
- [ ] Implement analysis retrieval endpoint.
- [ ] Add email pagination.
- [ ] Add priority and category filtering.
- [ ] Enforce authenticated user ownership.

## Phase Completion Checklist

- [ ] Gmail messages are synchronized.
- [ ] New messages are analyzed.
- [ ] Analysis results persist in Neon.
- [ ] Duplicate emails are prevented.
- [ ] Failed processing can be retried.
- [ ] API endpoints return expected data.

**Deliverable:** End-to-end Gmail-to-AI analysis pipeline.

---

# Phase 6 — React Frontend Foundation


**Status:** In Progress — Homepage and Sample Interactions Verified; Live API UI and Server State Pending

## Objective

Initialize React and establish the frontend architecture, API communication, and shared UI components.

## Learning Goals

- Understand React application structure.
- Learn TanStack Query for server state.
- Understand client/server separation.
- Learn authenticated API communication.
- Apply reusable component design.

## Tasks

### 6.1 React Setup

- [x] Initialize React with Vite and TypeScript.
- [x] Configure TypeScript strict mode.
- [x] Install Tailwind CSS.
- [x] Configure the Tailwind Vite plugin, global CSS, and semantic design system.
- [x] Configure Biome instead of ESLint for TypeScript 7 compatibility.
- [x] Configure Prettier.
- [x] Configure environment variable support and `.env.example` (local credentials not populated).
- [x] Verify the React development server works.

### 6.1a Global Design System (Authorized Before Phase 2)

- [x] Study the reference site's typography, palette, spacing, layout, controls, and responsive CSS using web research.
- [x] Define independent semantic Tailwind v4 tokens for typography, color, spacing, widths, breakpoints, radii, and shadows.
- [x] Add responsive container, stack, cluster, grid, and sidebar utilities.
- [x] Add reusable button, link, navigation, border, surface, and icon styles without building feature UI.
- [x] Include keyboard focus, 44px controls, reduced-motion, and forced-color support.
- [x] Enable Biome's Tailwind CSS parser and verify lint, formatting, production build, contrast pairs, and responsive utility compilation.
- [x] Document the design rules and usage examples in `docs/DESIGN_SYSTEM.md`.
- [x] Study reference animation CSS and add independent, opt-in motion primitives with shared durations/easing, capped stagger, safe inert exits, keyboard access, and reduced-motion defaults.

### 6.1b First Homepage (Authorized Before Phase 2)

- [x] Build a responsive homepage using the global design and motion system.
- [x] Add navigation, product introduction, walkthrough, details, FAQs, and footer.
- [x] Add fictional inbox data with filters, native email-detail dialog, copy-reply and reviewed-state controls.
- [x] Use Lucide React icons and a locally served Unsplash sample photo.
- [x] Verify browser behavior at 320, 390, 820, 1024, and 1440px, keyboard entry, reduced motion, and demo interactions.
- [x] Review desktop, mobile, and dialog screenshots and run frontend checks.
- [x] Refine copy and icon density using the user's selected direction: direct language, one demo notice, fewer labels/decorations, and Lucide React icons.

### 6.2 Frontend Organization

- [x] Create `components/`.
- [x] Create `pages/`.
- [x] Create `hooks/`.
- [x] Create `services/`.
- [x] Create `types/`.
- [x] Create `utils/`.
- [x] Establish consistent naming conventions in `AGENTS.md` and coding guidelines.

### 6.3 API Integration

- [x] Configure backend API base URL and local Vite proxy.
- [x] Create a reusable fetch wrapper in `src/services/api.ts`.
- [ ] Add HTTP error handling.
- [x] Configure fetch to include cookies (authenticated sessions are not implemented).
- [x] Configure CORS and cookie defaults with Flask (production/session validation pending).
- [ ] Add CSRF protection for state-changing requests.
- [ ] Install TanStack Query.
- [ ] Configure QueryClientProvider.
- [ ] Create reusable data-fetching hooks.

### 6.4 Shared UI Components

- [x] Create homepage application layout (live dashboard layout remains pending).
- [x] Create responsive homepage header/navigation.
- [ ] Create reusable buttons.
- [ ] Create badges.
- [ ] Create loading indicators.
- [ ] Create empty-state components.
- [ ] Create error-state components.
- [x] Establish responsive styling patterns.

## Phase Completion Checklist

- [x] React application runs locally with the homepage and fictional inbox preview.
- [x] Tailwind CSS compiles successfully.
- [x] Local API proxy communication works for the health endpoint.
- [ ] TanStack Query is configured.
- [ ] Shared UI foundation is ready.

**Deliverable:** React frontend foundation connected to Flask.

---

# Phase 7 — Dashboard & Email Management


**Status:** In Progress — Welcome Homepage and Demo Only; Live Dashboard Pending

## Objective

Build the user-facing dashboard for Gmail connection, email browsing, and AI analysis results.

## Learning Goals

- Learn server-state caching.
- Understand loading and error states.
- Learn reusable UI composition.
- Implement filtering and sorting.
- Understand human-AI interaction design.

## Tasks

### 7.1 Welcome & Gmail Connection

- [x] Create welcome homepage with a sample inbox (no live Gmail connection).
- [ ] Add Connect Gmail button.
- [ ] Integrate OAuth redirect flow.
- [ ] Display Gmail connection status.
- [ ] Handle failed connections.
- [ ] Handle disconnected accounts.

### 7.2 Dashboard Overview

- [ ] Create dashboard page.
- [ ] Display connected Gmail account.
- [ ] Display last synchronization time.
- [ ] Display total analyzed emails.
- [ ] Display high-priority count.
- [ ] Display reply-needed count.
- [ ] Display pending-action count.
- [ ] Add Sync Inbox button.

### 7.3 Email List

- [ ] Create EmailCard component.
- [ ] Create EmailList component.
- [ ] Display sender and subject.
- [ ] Display AI-generated summary.
- [ ] Display category and priority.
- [ ] Display received timestamp.
- [ ] Display analysis status.
- [ ] Implement pagination.
- [ ] Add empty and error states.

### 7.4 Email Filtering

- [ ] Filter emails by priority.
- [ ] Filter emails by category.
- [ ] Filter emails requiring replies.
- [ ] Filter emails with pending actions.
- [ ] Add sorting options.
- [ ] Keep filters synchronized with API queries.

### 7.5 Email Detail View

- [ ] Display original email content safely.
- [ ] Display AI summary.
- [ ] Display priority and category.
- [ ] Display detected deadline.
- [ ] Display requested action.
- [ ] Display suggested next action.
- [ ] Display reply-needed status.
- [ ] Display optional draft reply.
- [ ] Add manual reanalysis action.

### 7.6 Settings

- [ ] Display connected Gmail address.
- [ ] Display timezone settings.
- [ ] Add Disconnect Gmail action.
- [ ] Display confirmation before disconnection.
- [ ] Handle expired sessions.

## Phase Completion Checklist

- [ ] User can navigate the application.
- [ ] Gmail connection flow works through the UI.
- [ ] Dashboard displays stored email data.
- [ ] Emails can be filtered and opened.
- [ ] AI analysis is clearly presented.
- [ ] Synchronization can be triggered from the dashboard.

**Deliverable:** Functional inbox dashboard.

---

# Phase 8 — Action Tracking & Reply Drafts


**Status:** Not Started

## Objective

Allow users to manage recommended actions and review AI-generated reply suggestions.

## Learning Goals

- Understand human-in-the-loop workflows.
- Learn frontend mutations.
- Understand action-state management.
- Build approval-controlled interactions.
- Learn safe AI-assisted drafting.

## Tasks

### 8.1 Action Tracking Backend

- [ ] Implement action creation endpoint.
- [ ] Implement action listing endpoint.
- [ ] Implement action status update endpoint.
- [ ] Validate allowed action statuses.
- [ ] Enforce action ownership.
- [ ] Persist status changes.
- [ ] Prevent duplicate action creation where appropriate.

### 8.2 Action Tracker Frontend

- [ ] Create Action Tracker page.
- [ ] Display pending actions.
- [ ] Display associated emails.
- [ ] Display deadlines.
- [ ] Implement Add to Actions functionality.
- [ ] Implement Pending status.
- [ ] Implement In Progress status.
- [ ] Implement Completed status.
- [ ] Implement Dismissed status.
- [ ] Update cached queries after mutations.

### 8.3 Reply Drafts

- [ ] Display AI-generated suggested replies.
- [ ] Allow user to edit reply text.
- [ ] Implement Copy Reply functionality.
- [ ] Prevent automatic email sending.
- [ ] Clearly identify AI-generated text.
- [ ] Avoid unsupported promises in generated replies.

## Phase Completion Checklist

- [ ] Users can create action items.
- [ ] Action statuses persist.
- [ ] Users can review and edit suggested replies.
- [ ] Users can copy reply text.
- [ ] No Gmail write operations occur.

**Deliverable:** Action tracker and editable AI reply suggestions.

---

# Phase 9 — Testing, AI Evaluation & Security


**Status:** In Progress — Setup Checks Only; Feature Tests and Security Review Pending

## Objective

Validate the application's functionality, AI accuracy, reliability, and security before deployment.

## Learning Goals

- Understand unit and integration testing.
- Learn AI evaluation techniques.
- Understand LLM output reliability.
- Learn prompt injection defenses.
- Understand authentication and authorization testing.

## Tasks

### 9.1 Backend Testing

- [x] Test health endpoint.
- [x] Test configured CORS origins and local construction of database, OpenRouter, and Google clients.
- [ ] Test API request validation.
- [ ] Test Gmail normalization.
- [ ] Test OAuth callback handling.
- [ ] Test authentication requirements.
- [ ] Test ownership authorization.
- [ ] Test database operations.
- [ ] Test duplicate prevention.
- [ ] Test AI response validation.
- [x] Test basic API error handling (404, 405, malformed JSON, safe server errors, header preservation, and CORS).
- [ ] Test feature-specific provider and persistence error handling.

### 9.2 Frontend Testing

- [ ] Configure Vitest.
- [ ] Install React Testing Library.
- [ ] Test email list rendering.
- [ ] Test priority and category display.
- [ ] Test loading and empty states.
- [ ] Test filtering interactions.
- [ ] Test action status changes.
- [ ] Test API error handling.

### 9.3 AI Evaluation

- [ ] Create synthetic evaluation emails.
- [ ] Include urgent work requests.
- [ ] Include finance reminders.
- [ ] Include meeting invitations.
- [ ] Include newsletters and promotions.
- [ ] Include emails without actions.
- [ ] Include ambiguous deadlines.
- [ ] Include prompt injection examples.
- [ ] Define expected classifications.
- [ ] Measure category accuracy.
- [ ] Measure priority accuracy.
- [ ] Measure deadline extraction accuracy.
- [ ] Measure reply-needed accuracy.
- [ ] Measure structured-output success rate.
- [ ] Review hallucinations and unsupported claims.
- [ ] Refine prompts based on evaluation results.

### 9.4 Security Review

- [ ] Verify API keys are backend-only.
- [ ] Verify OAuth tokens are encrypted.
- [ ] Verify session cookie security.
- [ ] Verify CSRF protection.
- [x] Verify local CORS allows the configured frontend origin and denies an untrusted origin.
- [ ] Verify user ownership checks.
- [ ] Check logs for sensitive information.
- [ ] Verify emails cannot execute prompt instructions.
- [ ] Verify external write actions are unavailable.
- [ ] Define stored email retention and deletion behavior.
- [ ] Review Google OAuth and AI provider policies.

### 9.5 Code Quality

- [x] Run Biome lint checks.
- [x] Run Prettier checks.
- [x] Run TypeScript type checks and Vite production build.
- [x] Run Ruff checks.
- [x] Run backend setup tests (five passed; feature tests remain pending).
- [ ] Run frontend tests.
- [ ] Fix relevant errors and warnings.
- [x] Update documentation to reflect the current scaffold and Git setup (MVP documentation remains ongoing).

## Phase Completion Checklist

- [ ] Core functionality is tested.
- [ ] AI output quality has been evaluated.
- [ ] Authentication and authorization checks pass.
- [ ] Sensitive information is protected.
- [ ] No unauthorized Gmail operations are possible.
- [ ] Critical issues are resolved.

**Deliverable:** Tested and security-reviewed MVP.

---

# Phase 10 — Deployment & Final Validation


**Status:** Not Started

## Objective

Deploy the application and validate the complete workflow in its hosted environment.

## Learning Goals

- Understand frontend and backend deployment.
- Learn production environment configuration.
- Understand serverless limitations.
- Learn OAuth production configuration.
- Understand application monitoring and troubleshooting.

## Tasks

### 10.1 Deployment Preparation

- [ ] Review environment variables.
- [ ] Configure production secrets.
- [ ] Verify `.gitignore`.
- [ ] Confirm no credentials are committed.
- [ ] Confirm database migrations are ready.
- [ ] Verify local production builds.
- [ ] Verify all required tests pass.

### 10.2 Frontend Deployment

- [ ] Connect GitHub repository to Vercel.
- [ ] Configure frontend project settings.
- [ ] Configure frontend environment variables.
- [ ] Deploy React application.
- [ ] Verify frontend routing.
- [ ] Verify API connectivity.

### 10.3 Backend Deployment

- [ ] Configure Flask deployment for Vercel.
- [ ] Configure backend environment variables.
- [ ] Configure Neon database connections.
- [ ] Deploy Flask backend.
- [ ] Test health endpoint.
- [ ] Verify production logging.
- [ ] Verify serverless request limits are acceptable.

### 10.4 OAuth Production Configuration

- [ ] Configure production OAuth redirect URI.
- [ ] Update authorized origins where required.
- [ ] Verify OAuth consent configuration.
- [ ] Review Google verification requirements.
- [ ] Test authorization using an approved account.
- [ ] Verify token refresh and disconnection behavior.

### 10.5 Database Deployment

- [ ] Confirm production Neon database configuration.
- [ ] Apply reviewed database migrations.
- [ ] Verify production database connectivity.
- [ ] Verify database ownership rules.
- [ ] Confirm credentials are stored securely.

### 10.6 End-to-End Validation

- [ ] Open deployed application.
- [ ] Connect Gmail.
- [ ] Synchronize recent emails.
- [ ] Confirm new emails are stored.
- [ ] Confirm AI analysis completes.
- [ ] Confirm results appear in dashboard.
- [ ] Test email filtering.
- [ ] Test email detail view.
- [ ] Test suggested reply editing.
- [ ] Test action tracking.
- [ ] Test disconnect flow.
- [ ] Verify no emails are sent or modified automatically.

### 10.7 Final Documentation

- [ ] Update `README.md` with setup instructions.
- [ ] Document required environment variables.
- [ ] Document local development commands.
- [ ] Document testing commands.
- [ ] Document deployment configuration.
- [ ] Update architecture decisions where necessary.
- [ ] Record known limitations.

## Phase Completion Checklist

- [ ] Frontend is deployed.
- [ ] Backend is deployed.
- [ ] Database is connected.
- [ ] Gmail OAuth works in the deployed environment.
- [ ] AI analysis works.
- [ ] Dashboard displays results.
- [ ] Action tracking works.
- [ ] Core end-to-end workflow passes.
- [ ] Documentation is up to date.

**Deliverable:** Deployed Mailkind MVP.

---

# Post-MVP Development Backlog

These tasks are optional and should only begin after the MVP is stable.

## Phase 11 — Automation & Daily Digest

- [ ] Design scheduled email synchronization.
- [ ] Select a suitable background job system.
- [ ] Implement scheduled email retrieval.
- [ ] Implement automatic AI analysis for new messages.
- [ ] Generate daily inbox summaries.
- [ ] Display daily digest in the dashboard.
- [ ] Add notification preferences.
- [ ] Prevent duplicate scheduled processing.

## Phase 12 — Personalized AI Agent

- [ ] Add user-defined priority rules.
- [ ] Add preferred sender rules.
- [ ] Add reply tone preferences.
- [ ] Implement preference storage.
- [ ] Introduce agent tool calling.
- [ ] Allow the agent to retrieve relevant stored context.
- [ ] Add thread-aware analysis.
- [ ] Evaluate agent tool-use reliability.

## Phase 13 — Advanced Integrations

- [ ] Explore Google Calendar integration.
- [ ] Add meeting availability checking.
- [ ] Implement user-approved Gmail draft creation.
- [ ] Implement explicit approval workflows.
- [ ] Add approval audit records.
- [ ] Explore multiple Gmail account support.
- [ ] Evaluate production readiness for additional users.

---

# MVP Definition of Done

The MVP is considered complete when all of the following are satisfied.

### Core Functionality

- [ ] Gmail connection works securely.
- [ ] Emails can be synchronized without manual text entry.
- [ ] AI successfully analyzes email content.
- [ ] Summaries and classifications are displayed.
- [ ] Deadlines and requested actions are extracted.
- [ ] Suggested replies are available when appropriate.
- [ ] Action tracking works.
- [ ] Data persists in Neon PostgreSQL.

### Security

- [ ] OAuth credentials are protected.
- [ ] API keys are not exposed to the frontend.
- [ ] Protected endpoints enforce authentication.
- [ ] Database operations enforce user ownership.
- [ ] Emails are treated as untrusted AI input.
- [ ] No unauthorized email write operations are possible.

### Quality

- [ ] Core tests pass.
- [ ] AI evaluation results are reviewed.
- [ ] Important failures are handled.
- [ ] Code follows project coding guidelines.
- [ ] Documentation reflects the implementation.

### Deployment

- [ ] Application runs locally.
- [ ] Frontend is deployed.
- [ ] Backend is deployed.
- [ ] Database is accessible.
- [ ] Gmail OAuth works in the deployed environment.
- [ ] Complete user flow works end to end.

---

## Development History

All milestones below were recorded on November 16, 2026. Detailed implementation
rules remain in the shared references; phase-specific verification is recorded below.

- **Phase 0:** Initialized the React/Flask stack, locked dependencies, environment
  examples, contributor guide, and editor configuration. Configured the personal Git
  identity and SSH key without changing work/global settings.
- **Phase 1:** Completed health/CORS checks and safe JSON error handling, preserving
  HTTP status codes and headers. Corrected the Windows interpreter path for Pylance.
- **Design and homepage:** Added the global design/motion system, responsive fictional
  inbox demo, Lucide icons, direct copy, and Mailkind branding. Verified responsive
  layouts and local demo interactions.
- **Initial Phase 2 evaluation:** Two approved free-router batches used 20 synthetic
  requests. Both matched 6/8 expected cases but failed manual review; drafts made
  commitments and some outputs were incomplete or malformed. Tightened the prompt,
  summary limits, and source-deadline validation.
- **Phase 2 acceptance:** Fixed `baidu/ernie-5.5-flash-preview:free` passed all eight
  synthetic cases and manual review in nine requests, including one rate limit.
  Configured the model locally; all 80 backend tests and required checks passed.
  The user also confirmed manual testing passed. See the
  [Phase 2 guide](#phase-2-analysis-and-testing-guide) for full findings and limitations.
- **Phase 3:** Added five SQLAlchemy models and ownership-scoped repositories; reviewed and
  applied migration `0001` to Neon. All 88 tests passed, including six explicitly enabled
  rollback-only Neon tests. Alembic reports no schema drift; no test rows remain.
- **Documentation:** Consolidated all phase checklists, the Phase 2 testing guide,
  and milestone history in this file. Preserved all 554 original checklist entries
  and statuses; shared architecture, requirements, coding, and design references
  remain at the top level.

---

# Project Completion Summary

**Total MVP Phases:** 11 (Phase 0–10)  
**Current Phase:** Phase 4 — Google OAuth & Gmail Integration (next)\
**Current Status:** Phases 0 through 3 Complete; Neon Persistence Verified; Gmail, Live Processing Pipeline, and Dashboard Features Pending

**Project Milestone:** Build a fully functional AI-powered Gmail inbox assistant that analyzes messages, prioritizes actions, generates suggested replies, and allows users to manage their inbox more efficiently without sacrificing user control.

---

**Document Version:** 1.9\
**Status:** Active Development Tracker  
**Last Updated:** November 16, 2026
