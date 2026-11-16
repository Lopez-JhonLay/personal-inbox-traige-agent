# Personal Inbox Triage Agent

## System Architecture Document

**Version:** 1.0  
**Status:** Proposed  
**Architecture:** Modular Monolith  
**Related Document:** `PRD.md`

### Implementation Status — November 16, 2026

The initial scaffold is implemented; this document otherwise describes the target
architecture. React/Vite/TypeScript/Tailwind and Flask/Pydantic settings are configured
with dependency lockfiles and environment examples. `/api/health`, the local Vite API
proxy, and CORS configuration have been verified. Phase 1 is complete: application-wide
JSON HTTP error handling preserves status codes and protocol headers, and uncaught
exceptions return generic 500 JSON outside debug/testing propagation. All 12 backend
tests pass (five setup and seven error-handling tests). The React root intentionally
renders nothing.

SQLAlchemy/psycopg, Alembic, Google OAuth/Gmail, and OpenRouter client factories are
configured. No live provider requests, database tables, migration revisions, auth flows,
domain schemas, UI features, or deployments have been implemented.

Git is initialized on `main` and connected to the personal GitHub repository with a
repository-local personal SSH key. See `TASKS.md`
for detailed progress and `README.md` for current commands and configuration.

---

## 1. Architecture Overview

The Personal Inbox Triage Agent is a full-stack AI-powered application consisting of a React frontend, Flask backend, PostgreSQL database, Gmail API integration, and an AI model accessed through OpenRouter.

The application connects to Gmail, retrieves messages, analyzes their contents using an LLM, stores the results, and displays actionable insights through a dashboard.

### Architectural Principles

- **Separation of Concerns:** Frontend, backend, AI processing, and data persistence have distinct responsibilities.
- **Modularity:** External integrations are isolated into reusable services.
- **Single-Agent Approach:** Use one AI analysis component rather than multiple specialized agents.
- **Human-in-the-Loop:** Sensitive actions require explicit user approval.
- **Security First:** Authentication credentials and API keys remain on the backend.
- **Cost Efficiency:** Minimize API calls and use free-tier services where practical.
- **Extensibility:** Support future AI tools, integrations, and background processing without major architectural changes.

---

## 2. Technology Stack

| Layer             | Technology        | Purpose                            |
| ----------------- | ----------------- | ---------------------------------- |
| Frontend          | React             | User interface                     |
| Frontend Language | TypeScript        | Type-safe development              |
| Build Tool        | Vite              | Frontend tooling                   |
| Styling           | Tailwind CSS      | UI styling                         |
| Backend           | Python            | Server-side application logic      |
| Backend Framework | Flask             | REST API                           |
| API Validation    | Pydantic          | Request and AI response validation |
| AI SDK            | OpenAI Python SDK | LLM communication                  |
| AI Provider       | OpenRouter        | Access to free AI models           |
| Email Integration | Gmail API         | Email retrieval                    |
| Authentication    | Google OAuth 2.0  | Gmail authorization                |
| Database          | Neon PostgreSQL   | Persistent storage                 |
| ORM               | SQLAlchemy        | Database operations                |
| Migrations        | Alembic           | Database schema versioning         |
| Frontend Hosting  | Vercel            | Frontend deployment                |
| Backend Hosting   | Vercel            | Flask deployment                   |
| Version Control   | Git + GitHub      | Source control                     |

### Technology Decisions

**React + Vite**

Provides a lightweight frontend independent of the Python backend.

**Flask**

A minimal Python web framework suitable for building REST APIs and integrating AI services without unnecessary complexity.

**OpenAI Python SDK + OpenRouter**

The OpenAI SDK communicates with OpenRouter through its OpenAI-compatible API.

This allows different supported models to be selected through configuration without rewriting the core AI service.

**Neon PostgreSQL**

Provides a managed PostgreSQL database suitable for storing users, Gmail connections, email metadata, AI analyses, and action items.

**SQLAlchemy + Alembic**

SQLAlchemy manages database access, while Alembic manages schema migrations.

---

## 3. High-Level System Architecture

```text
                  USER
                    |
                    v
            +----------------+
            | React Frontend |
            | TypeScript     |
            +----------------+
                    |
                HTTPS/JSON
                    |
                    v
            +----------------+
            | Flask REST API |
            +----------------+
                    |
         +----------+----------+
         |          |          |
         v          v          v
   +-----------+ +----------+ +-----------+
   | Gmail     | | AI       | | Database  |
   | Service   | | Service  | | Service   |
   +-----------+ +----------+ +-----------+
         |          |          |
         v          v          v
   +-----------+ +----------+ +-----------+
   | Gmail API | |OpenRouter| | Neon      |
   | Google    | | LLM      | | PostgreSQL|
   +-----------+ +----------+ +-----------+
```

### Component Responsibilities

#### Frontend

- Display the Gmail connection interface.
- Display synchronized and analyzed emails.
- Show priorities, categories, and suggested actions.
- Display editable AI-generated reply text.
- Manage email filters and action statuses.
- Communicate with the Flask backend.

#### Backend

- Handle OAuth authentication and sessions.
- Retrieve emails through Gmail API.
- Normalize incoming email data.
- Coordinate AI analysis requests.
- Validate AI-generated responses.
- Store and retrieve application data.
- Enforce security and authorization rules.
- Return structured JSON responses.

#### AI Service

- Construct prompts.
- Communicate with OpenRouter.
- Summarize email contents.
- Classify emails.
- Extract deadlines and requested actions.
- Identify whether replies are necessary.
- Generate suggested responses.
- Validate model output before returning results.

#### Database

- Store user information.
- Store encrypted Gmail credentials.
- Store synchronized email records.
- Store AI-generated analyses.
- Store action-tracking information.
- Prevent duplicate records.

---

## 4. Project Directory Structure

The application will use a monorepo containing separate frontend and backend applications.

```text
personal-inbox-triage-agent/
|
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- pages/
|   |   |-- hooks/
|   |   |-- services/
|   |   |-- types/
|   |   |-- utils/
|   |   |-- App.tsx
|   |   |-- main.tsx
|   |-- package.json
|   |-- vite.config.ts
|   |-- .env.example
|
|-- backend/
|   |-- app/
|   |   |-- __init__.py
|   |   |-- config.py
|   |   |
|   |   |-- routes/
|   |   |   |-- auth.py
|   |   |   |-- emails.py
|   |   |   |-- analyses.py
|   |   |   |-- actions.py
|   |   |
|   |   |-- services/
|   |   |   |-- gmail_service.py
|   |   |   |-- ai_service.py
|   |   |   |-- email_service.py
|   |   |   |-- auth_service.py
|   |   |
|   |   |-- models/
|   |   |   |-- user.py
|   |   |   |-- gmail_connection.py
|   |   |   |-- email.py
|   |   |   |-- email_analysis.py
|   |   |   |-- action_item.py
|   |   |
|   |   |-- schemas/
|   |   |   |-- email_schema.py
|   |   |   |-- analysis_schema.py
|   |   |
|   |   |-- repositories/
|   |   |-- utils/
|   |
|   |-- migrations/
|   |-- tests/
|   |-- requirements.txt
|   |-- run.py
|   |-- .env.example
|
|-- docs/
|   |-- PRD.md
|   |-- ARCHITECTURE.md
|
|-- .gitignore
|-- README.md
```

### Folder Responsibilities

| Folder               | Responsibility                   |
| -------------------- | -------------------------------- |
| `components/`        | Reusable React components        |
| `pages/`             | Application pages                |
| `hooks/`             | React custom hooks               |
| `frontend/services/` | Backend API communication        |
| `routes/`            | Flask HTTP endpoints             |
| `backend/services/`  | Business logic and integrations  |
| `models/`            | SQLAlchemy database entities     |
| `schemas/`           | Pydantic validation schemas      |
| `repositories/`      | Database queries and persistence |
| `utils/`             | Shared helper functions          |
| `migrations/`        | Database schema migrations       |
| `tests/`             | Automated backend tests          |

The structure is a proposed starting point and may evolve as features are implemented.

---

## 5. Database Design

### 5.1 Database Overview

The application uses Neon PostgreSQL.

The initial database contains five core tables:

1. `users`
2. `gmail_connections`
3. `emails`
4. `email_analyses`
5. `action_items`

The schema supports one Gmail connection per user during the MVP while remaining extensible for multiple accounts.

### 5.2 Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| GMAIL_CONNECTIONS : connects
    GMAIL_CONNECTIONS ||--o{ EMAILS : contains
    EMAILS ||--o{ EMAIL_ANALYSES : analyzed_by
    USERS ||--o{ ACTION_ITEMS : owns
    EMAILS ||--o{ ACTION_ITEMS : generates
```

### 5.3 Table: users

Stores application user information.

| Column       | Type         | Constraints          |
| ------------ | ------------ | -------------------- |
| id           | UUID         | Primary Key          |
| email        | VARCHAR(255) | Unique, Not Null     |
| display_name | VARCHAR(255) | Nullable             |
| timezone     | VARCHAR(100) | Default: Asia/Manila |
| created_at   | TIMESTAMPTZ  | Not Null             |
| updated_at   | TIMESTAMPTZ  | Not Null             |

**Purpose:**

Identify the application user and associate their Gmail data, analyses, and actions with their account.

### 5.4 Table: gmail_connections

Stores Gmail account authorization details.

| Column                  | Type         | Constraints         |
| ----------------------- | ------------ | ------------------- |
| id                      | UUID         | Primary Key         |
| user_id                 | UUID         | Foreign Key, Unique |
| gmail_address           | VARCHAR(255) | Not Null            |
| encrypted_refresh_token | TEXT         | Nullable            |
| scopes                  | JSONB        | Not Null            |
| status                  | VARCHAR(30)  | Not Null            |
| connected_at            | TIMESTAMPTZ  | Not Null            |
| updated_at              | TIMESTAMPTZ  | Not Null            |

**Relationships:**

- One user has zero or one Gmail connection in the MVP.
- One Gmail connection can have many emails.

**Notes:**

- Refresh tokens must be encrypted at rest.
- Access tokens may be short-lived and do not need persistent storage.
- If Google does not issue a refresh token, the application must handle reauthorization.
- Disconnecting the account prevents future synchronization.

### 5.5 Table: emails

Stores synchronized Gmail messages.

| Column              | Type         | Constraints           |
| ------------------- | ------------ | --------------------- |
| id                  | UUID         | Primary Key           |
| gmail_connection_id | UUID         | Foreign Key, Not Null |
| gmail_message_id    | VARCHAR(255) | Not Null              |
| gmail_thread_id     | VARCHAR(255) | Not Null              |
| sender              | TEXT         | Nullable              |
| subject             | TEXT         | Nullable              |
| body                | TEXT         | Nullable              |
| received_at         | TIMESTAMPTZ  | Nullable              |
| created_at          | TIMESTAMPTZ  | Not Null              |

**Unique Constraint:**

`(gmail_connection_id, gmail_message_id)`

**Purpose:**

Store the source messages used by the AI analyzer and prevent duplicate synchronization.

**Notes:**

- Store only data required by the application.
- Email body retention must be configurable or governed by a defined retention policy.
- HTML content should be normalized to safe readable text before AI analysis.
- Gmail message IDs and thread IDs must remain separate.

### 5.6 Table: email_analyses

Stores validated AI analysis results.

| Column           | Type         | Constraints           |
| ---------------- | ------------ | --------------------- |
| id               | UUID         | Primary Key           |
| email_id         | UUID         | Foreign Key, Not Null |
| summary          | TEXT         | Nullable              |
| category         | VARCHAR(30)  | Nullable              |
| priority         | VARCHAR(10)  | Nullable              |
| deadline         | DATE         | Nullable              |
| deadline_text    | TEXT         | Nullable              |
| requested_action | TEXT         | Nullable              |
| suggested_action | TEXT         | Nullable              |
| reply_needed     | BOOLEAN      | Nullable              |
| draft_reply      | TEXT         | Nullable              |
| model_identifier | VARCHAR(255) | Nullable              |
| status           | VARCHAR(30)  | Not Null              |
| error_code       | VARCHAR(100) | Nullable              |
| created_at       | TIMESTAMPTZ  | Not Null              |

**Analysis Statuses:**

- `pending`
- `processing`
- `completed`
- `failed`

**Purpose:**

Store the AI's interpretation of each email.

**Design Decision:**

One email can have multiple analysis records.

This allows future reanalysis using improved prompts or different AI models without overwriting historical results.

The dashboard should use the latest successfully completed analysis by default.

### 5.7 Table: action_items

Stores actions associated with emails.

| Column      | Type        | Constraints           |
| ----------- | ----------- | --------------------- |
| id          | UUID        | Primary Key           |
| user_id     | UUID        | Foreign Key, Not Null |
| email_id    | UUID        | Foreign Key, Not Null |
| description | TEXT        | Not Null              |
| due_date    | DATE        | Nullable              |
| status      | VARCHAR(30) | Not Null              |
| created_at  | TIMESTAMPTZ | Not Null              |
| updated_at  | TIMESTAMPTZ | Not Null              |

**Action Statuses:**

- `pending`
- `in_progress`
- `completed`
- `dismissed`

**Purpose:**

Track tasks that the user chooses to manage after reviewing AI recommendations.

AI-generated suggestions should not automatically become confirmed user tasks.

### 5.8 Database Design Rules

- Use UUIDs for primary keys.
- Store timestamps in UTC using `TIMESTAMPTZ`.
- Convert timestamps to the user's timezone when displaying them.
- Define foreign key constraints.
- Index frequently queried fields such as priority, status, and dates where appropriate.
- Enforce ownership checks in backend queries.
- Avoid saving duplicate Gmail messages.
- Keep AI analysis history separate from source email records.
- Use Alembic for schema changes.
- Do not store plaintext OAuth refresh tokens.

---

## 6. Gmail Integration Architecture

### 6.1 Authentication Flow

The application uses Google OAuth 2.0.

```text
User
  |
  v
React: Connect Gmail
  |
  v
Flask: Start OAuth
  |
  v
Google Authorization Screen
  |
  v
User Grants Permission
  |
  v
Flask: OAuth Callback
  |
  v
Validate State + Exchange Code
  |
  v
Create Authenticated Session
  |
  v
Store Encrypted Refresh Token
  |
  v
Redirect to React Dashboard
```

### 6.2 Gmail Permissions

Initial OAuth scope:

`https://www.googleapis.com/auth/gmail.readonly`

This allows the application to retrieve Gmail messages without modifying them.

The `gmail.readonly` scope is classified by Google as restricted. Public deployment may require additional verification and security assessment.

For the MVP, use an authorized personal Google account in a testing configuration.

### 6.3 Email Retrieval

The Gmail service will use the following Gmail API operations:

| Gmail API             | Purpose                            |
| --------------------- | ---------------------------------- |
| `users.messages.list` | Retrieve message IDs               |
| `users.messages.get`  | Retrieve message details           |
| `users.getProfile`    | Retrieve Gmail account information |

**Initial Synchronization:**

- Retrieve up to 20 recent inbox messages.
- Fetch details for each message.
- Normalize the email content.
- Store new messages.
- Analyze the messages.

**Subsequent Synchronization:**

- Retrieve recent messages.
- Compare Gmail message IDs with stored records.
- Skip already synchronized messages.
- Process only new messages.

The MVP uses manual synchronization. Scheduled synchronization will be implemented later.

### 6.4 Email Normalization

Gmail messages may contain:

- Plain text.
- HTML.
- Multipart MIME content.
- Attachments.
- Encoded payloads.

The email service must convert supported message bodies into consistent text suitable for AI analysis.

**MVP Rules:**

- Prefer the readable `text/plain` body.
- Convert HTML to readable text when necessary.
- Do not process attachment contents.
- Preserve sender, subject, received timestamp, and Gmail identifiers.
- Apply reasonable text-length limits before sending content to the model.

---

## 7. AI Processing Architecture

### 7.1 AI Provider Configuration

The backend uses the OpenAI Python SDK with OpenRouter.

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)
```

The selected model will be configured through environment variables.

The initial model must:

- Be available through OpenRouter's free tier.
- Support text-based email analysis.
- Follow structured-output instructions reliably.
- Be evaluated before processing real email content.

The model identifier will be selected during implementation rather than permanently fixed in the architecture.

### 7.2 AI Analysis Pipeline

```text
Gmail Message
      |
      v
Email Normalization
      |
      v
Input Preparation
      |
      v
Prompt Construction
      |
      v
OpenRouter LLM Request
      |
      v
Parse Model Response
      |
      v
Pydantic Validation
      |
  +---+---+
  |       |
Valid   Invalid
  |       |
  v       v
Save    Limited Retry
Result    |
  |       v
  |     Record Failure
  v
React Dashboard
```

### 7.3 AI Input

The AI receives:

- Email subject.
- Email sender, when available.
- Normalized email body.
- Email received timestamp.
- User timezone.

The email content must be treated as data, not trusted instructions.

### 7.4 AI Output Schema

The initial response follows this structure:

```json
{
  "summary": "The sender requests a progress report.",
  "category": "Work",
  "priority": "High",
  "deadline": null,
  "deadline_text": "Friday",
  "requested_action": "Submit the progress report.",
  "suggested_action": "Prepare and review the report.",
  "reply_needed": true,
  "draft_reply": "Hi, I'll review the request and follow up shortly."
}
```

### 7.5 Validation Strategy

Pydantic will validate AI-generated responses.

Validation must check:

- Required fields.
- Allowed category values.
- Allowed priority values.
- Boolean fields.
- Nullable values.
- Date formatting.
- Response structure.

Schema validation ensures correct formatting but does not guarantee factual accuracy.

Model outputs should also be tested against a dataset of example emails with expected classifications.

### 7.6 Error Handling

Possible failures include:

- Rate limiting.
- Provider downtime.
- Invalid JSON.
- Schema validation errors.
- Request timeouts.
- Missing model responses.

**Strategy:**

1. Use defined request timeouts.
2. Retry only recoverable failures.
3. Limit retry attempts.
4. Record failed analysis status.
5. Preserve successfully synchronized email data.
6. Allow manual reanalysis.

### 7.7 Agent Design

The MVP uses a single LLM analysis component.

It is initially a structured AI workflow, not an autonomous multi-step agent.

Future versions may introduce tool calling for:

- Retrieving previous email context.
- Looking up user preferences.
- Checking existing action items.
- Checking calendar availability.
- Creating Gmail drafts with approval.

Tool execution must always be controlled by backend permissions.

---

## 8. Backend API Design

### 8.1 API Convention

Base path:

`/api`

All API requests and responses use JSON except OAuth redirects.

User-specific endpoints must require an authenticated session.

### 8.2 Authentication Endpoints

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| GET    | `/api/auth/google`          | Start OAuth authentication |
| GET    | `/api/auth/google/callback` | Process OAuth callback     |
| GET    | `/api/auth/status`          | Get connection status      |
| POST   | `/api/auth/disconnect`      | Disconnect Gmail           |

### 8.3 Email Endpoints

| Method | Endpoint                    | Description                       |
| ------ | --------------------------- | --------------------------------- |
| GET    | `/api/emails`               | List synchronized emails          |
| GET    | `/api/emails/{id}`          | Get email details                 |
| POST   | `/api/emails/sync`          | Synchronize recent Gmail messages |
| POST   | `/api/emails/{id}/analyze`  | Analyze or reanalyze an email     |
| GET    | `/api/emails/{id}/analyses` | Get analysis history              |

### 8.4 Action Endpoints

| Method | Endpoint            | Description                      |
| ------ | ------------------- | -------------------------------- |
| GET    | `/api/actions`      | List action items                |
| POST   | `/api/actions`      | Create user-approved action item |
| PATCH  | `/api/actions/{id}` | Update action status             |

### 8.5 System Endpoints

| Method | Endpoint      | Description      |
| ------ | ------------- | ---------------- |
| GET    | `/api/health` | API health check |

### 8.6 Standard API Response

Successful response example:

```json
{
  "success": true,
  "data": {
    "message": "Email analysis completed."
  }
}
```

Error response example:

```json
{
  "success": false,
  "error": {
    "code": "AI_RATE_LIMITED",
    "message": "The AI provider is temporarily unavailable due to rate limits."
  }
}
```

Actual HTTP status codes must reflect the result.

---

## 9. Authentication and Security

### 9.1 Session Management

The backend manages authenticated user sessions after successful Google OAuth authorization.

Recommended approach:

- Use secure, HttpOnly session cookies.
- Enable the `Secure` attribute in production.
- Use an appropriate `SameSite` policy.
- Protect state-changing endpoints against CSRF.
- Restrict CORS to trusted frontend origins.
- Validate user identity and ownership on every protected request.

### 9.2 Token Management

- Store refresh tokens encrypted.
- Keep encryption keys in environment variables.
- Never expose OAuth credentials to the frontend.
- Never log access or refresh tokens.
- Handle revoked and expired tokens.
- Delete stored credentials when disconnecting the account.

### 9.3 AI Security

- Treat email bodies as untrusted input.
- Ignore instructions embedded in emails that attempt to control the agent.
- Validate AI outputs before storing or displaying them.
- Keep all external write operations behind backend authorization.
- Never assume a model-generated instruction grants permission.

### 9.4 Data Privacy

- Minimize stored email content.
- Avoid logging message bodies.
- Review OpenRouter and model-provider data handling policies.
- Define an email retention and deletion policy before processing real Gmail data.
- Protect stored data using authenticated and authorized database access.
- Escape or sanitize displayed email content to prevent XSS.

---

## 10. Deployment Architecture

### 10.1 Initial Deployment

```text
          GitHub Repository
                 |
        +--------+--------+
        |                 |
        v                 v
  Vercel Frontend    Vercel Backend
    React/Vite         Flask API
        |                 |
        +--------+--------+
                 |
           External APIs
                 |
       +---------+---------+
       |         |         |
       v         v         v
     Gmail   OpenRouter   Neon
      API       AI       PostgreSQL
```

### 10.2 Frontend Deployment

Platform: **Vercel**

The React application is built using Vite and deployed as a static frontend.

### 10.3 Backend Deployment

Initial Platform: **Vercel**

The Flask application runs using Vercel's Python runtime.

**Considerations:**

- Serverless request duration limits.
- AI inference latency.
- Gmail synchronization batch size.
- Database connection management.
- Stateless backend execution.

Long-running processing may eventually require a separate backend worker.

### 10.4 Database Connection Strategy

Use Neon PostgreSQL connection strings.

**Pooled Connection:**

Used for regular application traffic, especially serverless requests.

**Direct Connection:**

Used for migrations and administrative operations requiring session-level database behavior.

Database credentials must remain server-side.

### 10.5 Environment Variables

#### Frontend

```env
VITE_API_BASE_URL=
```

#### Backend

```env
SECRET_KEY=
SESSION_COOKIE_SECURE=false

DATABASE_URL=
DIRECT_DATABASE_URL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

OPENROUTER_API_KEY=
OPENROUTER_MODEL=
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

TOKEN_ENCRYPTION_KEY=

FRONTEND_URL=
```

Environment variables must not be committed to Git.

Use the Flask CLI's `--debug` option locally; `FLASK_ENV` was removed in Flask 2.3.
`SESSION_COOKIE_SECURE=false` is a local development value; secure cookies are required
for the planned production environment. Current examples are maintained in
`frontend/.env.example` and `backend/.env.example`.

Separate configurations should be maintained for local development and production.

---

## 11. Error Handling and Reliability

### Gmail API

- Handle expired credentials.
- Handle revoked permissions.
- Respect Google API rate limits.
- Prevent duplicate inserts.
- Preserve previously synchronized emails when retrieval fails.

### OpenRouter

- Handle unavailable models.
- Handle rate limits.
- Validate model output.
- Limit retries.
- Track failed analyses.

### Database

- Use transactions for related writes.
- Enforce unique constraints.
- Handle connection failures.
- Roll back failed transactions.
- Use migrations for schema changes.

### Frontend

- Display loading states.
- Show understandable error messages.
- Preserve existing results during temporary failures.
- Allow users to retry failed operations.

---

## 12. Performance and Cost Optimization

The initial architecture should prioritize low-cost operation.

### Optimization Strategies

1. Fetch only a limited number of recent emails.
2. Analyze only new or explicitly reanalyzed emails.
3. Store completed analyses for reuse.
4. Avoid unnecessary AI requests.
5. Set reasonable email content limits.
6. Use batch processing with controlled concurrency.
7. Use Neon connection pooling for serverless traffic.
8. Track AI request failures and provider rate limits.

### MVP Defaults

| Setting                 | Initial Value           |
| ----------------------- | ----------------------- |
| Initial email fetch     | 20 messages             |
| Synchronization         | Manual                  |
| AI model                | Configurable free model |
| AI concurrency          | 1 request at a time     |
| Retry attempts          | Maximum of 2            |
| Gmail accounts          | 1 per user              |
| Attachment processing   | Disabled                |
| Automated email sending | Disabled                |

These values are configurable and may be adjusted after testing.

For the initial deployment, synchronize emails in small, bounded batches to avoid exceeding serverless execution limits.

---

## 13. Testing Strategy

### Backend Testing

Use `pytest` to test:

- API endpoints.
- Authentication logic.
- Gmail response parsing.
- Database operations.
- Duplicate prevention.
- Authorization rules.
- AI response validation.

### AI Evaluation

Create representative email test cases covering:

- Important work requests.
- Production incidents.
- Financial reminders.
- Meetings.
- Promotional emails.
- Newsletters.
- Ambiguous deadlines.
- Emails requiring replies.
- Emails containing malicious instructions.

Measure:

- Category accuracy.
- Priority accuracy.
- Deadline extraction accuracy.
- Reply-needed accuracy.
- Structured-output success rate.
- Hallucination frequency.

Use mocked Gmail and OpenRouter responses for deterministic automated tests.

Live integration tests should be separate from unit tests.

---

## 14. Future Architecture Enhancements

The architecture should support the following without requiring a complete rewrite:

### Background Processing

Introduce a worker or job queue when scheduled synchronization and larger email batches become necessary.

### Scheduled Inbox Monitoring

Automatically retrieve and analyze new messages on a configured schedule.

### Daily Digest

Aggregate important messages and action items into a daily summary.

### Agent Tool Calling

Allow the AI to request approved tools for retrieving additional context.

### Personalization

Store user-defined rules for priority, preferred senders, and reply style.

### Gmail Write Integration

Introduce separately authorized Gmail scopes for creating drafts or performing approved actions.

### Multi-Account Support

Extend Gmail connections to support multiple accounts per user.

---

## 15. Architectural Decisions Summary

| Decision                 | Choice                                 |
| ------------------------ | -------------------------------------- |
| Application Architecture | Modular Monolith                       |
| Frontend                 | React + TypeScript + Vite              |
| Backend                  | Python + Flask                         |
| API Style                | REST                                   |
| Database                 | Neon PostgreSQL                        |
| ORM                      | SQLAlchemy                             |
| Migrations               | Alembic                                |
| AI Provider              | OpenRouter                             |
| AI SDK                   | OpenAI Python SDK                      |
| AI Design                | Single-Agent / Structured LLM Workflow |
| Gmail Integration        | Gmail API                              |
| Authentication           | Google OAuth 2.0                       |
| Gmail Permissions        | Read-only for MVP                      |
| AI Validation            | Pydantic                               |
| Frontend Deployment      | Vercel                                 |
| Backend Deployment       | Vercel, initially                      |
| Background Jobs          | Post-MVP                               |
| External Write Actions   | Explicit approval required             |

---

## 16. Architecture Goals

The architecture is considered successful when:

- [ ] React communicates securely with Flask.
- [ ] Google OAuth connects a Gmail account.
- [ ] Gmail messages can be retrieved and normalized.
- [ ] The AI service analyzes messages through OpenRouter.
- [ ] Pydantic validates AI-generated results.
- [ ] SQLAlchemy persists application data in Neon.
- [ ] Duplicate Gmail messages are prevented.
- [ ] Users can view email analyses in the dashboard.
- [ ] Users can manage action statuses.
- [ ] Unauthorized access and external write operations are prevented.
- [ ] Errors are handled without losing existing records.
- [ ] The application can be deployed using the selected infrastructure.

---

## 17. References

- Gmail API: https://developers.google.com/workspace/gmail/api
- Google OAuth: https://developers.google.com/identity/protocols/oauth2
- OpenRouter: https://openrouter.ai/docs
- OpenAI Python SDK: https://github.com/openai/openai-python
- Flask: https://flask.palletsprojects.com/
- Pydantic: https://docs.pydantic.dev/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Alembic: https://alembic.sqlalchemy.org/
- Neon: https://neon.com/docs
- Vercel Flask: https://vercel.com/docs/frameworks/backend/flask

---

**Document Version:** 1.0  
**Status:** Proposed Architecture  
**Next Step:** Phase 2 — AI Integration & Email Analysis, when requested; live provider credentials and model evaluation remain pending in `TASKS.md`.
