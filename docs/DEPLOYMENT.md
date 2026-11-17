# Vercel deployment

Phase 10 initially deploys Mailkind for approved Google test users. A reachable
website does not complete public-launch or provider privacy verification.

## Projects and routing

| Project        | Root       | Runtime/build                                        | Stable address                                          |
| -------------- | ---------- | ---------------------------------------------------- | ------------------------------------------------------- |
| `mailkind-web` | `frontend` | Node.js 24, `npm ci`, `npm run build`, output `dist` | https://mailkind-web-lopez-jhonlays-projects.vercel.app |
| `mailkind-api` | `backend`  | Python 3.14, Flask, existing locked dependencies     | https://mailkind-api-lopez-jhonlays-projects.vercel.app |

Both projects belong to `lopez-jhonlays-projects` and use
`Lopez-JhonLay/personal-inbox-traige-agent`, production branch `main`.

- Frontend ID: `prj_AO3f7Uk6We4wlzPf5niV4uetiqCd`.
- Backend ID: `prj_MPXDjam91Nws5ljGWRSFqKw9A7sw`.
- Team ID: `team_y1jokh3hJnhOo8ANGFZTvemV`.

The backend's `tool.vercel.entrypoint` is `run:app`, exporting the existing Flask
factory result. `backend/vercel.json` sets its maximum duration to 120 seconds.
The frontend forwards `/api/:path*` to the backend with the `/api` prefix retained.
Other application paths fall back to `index.html`, preserving React Router deep links.
Existing static assets are served by Vercel. All browser API and OAuth requests use
the frontend origin; cookies remain host-only, HttpOnly, Secure, and SameSite=Lax.

The current 60-second sync budget and bounded per-email analysis calls remain in
place. External rewrites have a 120-second timeout, so increasing function duration
alone would not support longer proxied calls. No background worker or cron is added.
Interrupted operations recover through the existing two-minute operation lease.

## Production environment

Use Vercel MCP to create/update environment variables on the specified project,
targeting **Production only**. Keep secrets encrypted, never in frontend variables
or Git. Configuration changes require a new deployment.

| Project  | Variables                                                       | Value/source                                                                       |
| -------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Frontend | `VITE_API_BASE_URL`                                             | `/api` (public)                                                                    |
| Backend  | `DATABASE_URL`                                                  | Existing pooled Neon URL, with SSL                                                 |
| Backend  | `TOKEN_ENCRYPTION_KEY`                                          | Preserve the existing key for saved refresh tokens                                 |
| Backend  | `SECRET_KEY`                                                    | Separate generated hosted-session secret; keep stable across deployments           |
| Backend  | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                      | Existing Google Web OAuth client                                                   |
| Backend  | `FRONTEND_URL`                                                  | `https://mailkind-web-lopez-jhonlays-projects.vercel.app`                          |
| Backend  | `GOOGLE_REDIRECT_URI`                                           | `https://mailkind-web-lopez-jhonlays-projects.vercel.app/api/auth/google/callback` |
| Backend  | `SESSION_COOKIE_SECURE`                                         | `true`                                                                             |
| Backend  | `ENABLE_DEV_ANALYSIS`                                           | `false`                                                                            |
| Backend  | `GMAIL_SYNC_QUERY`                                              | `label:mailkind-test` for fictional-message acceptance                             |
| Backend  | `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` | Existing configured free ERNIE model and backend credentials                       |

Do not enable Flask debug. Do not provide production backend secrets to preview
deployments. Test OAuth only at the stable frontend production hostname; previews
are not a separate configured authentication environment. Preserve default preview
deployment protection. The production frontend and backend aliases must be reachable
without Vercel authentication so the browser and reverse proxy can access them.

The existing Neon database is shared with local development. A hosted disconnect
affects the same saved Gmail connection used locally; coordinate testing. No schema
changes are needed: head `0003` was verified read-only on November 17, 2026.
Never migrate during Vercel builds or app startup. If a future migration is needed,
review it separately and use the operator's direct Neon URL through Alembic.
`DIRECT_DATABASE_URL` is not installed in the hosted application.

## Google Console handoff

In [Google Cloud credentials](https://console.cloud.google.com/apis/credentials),
open the existing Web application OAuth client and add this exact **Authorized
redirect URI**, retaining local development's redirect:

```text
https://mailkind-web-lopez-jhonlays-projects.vercel.app/api/auth/google/callback
```

This is a server-side OAuth flow, so it does not require adding an Authorized
JavaScript origin. Keep the consent app External/Testing and add each approved
account to Test users. Testing refresh tokens can expire after seven days; reconnect
through the existing flow when required. Vercel MCP cannot make Google Console changes.

## Deployment and acceptance

Prepare and validate changes before pushing deployment configuration to `main`.
Deploy the backend first through Vercel MCP, inspect its build, and check direct
health. Then deploy the frontend and check proxied health, API JSON errors, assets,
and refreshes of `/dashboard`, `/actions`, and `/settings`. Use the Git commit SHA
in deployment metadata to confirm the intended source was deployed.

Before a deployment, run the existing frontend tests/lint/format/build and offline
backend tests/Ruff. Keep the Phase 9 rollback-only integration evidence; a deployment
configuration change does not itself require repeating all live AI evaluations.

Browser acceptance with approved users and fictional Gmail messages:

1. Sign in through the stable frontend URL. Verify redirect, secure cookie flags,
   authenticated status, and CSRF-protected mutations.
2. Sync one or two fictional inbox messages labeled `mailkind-test`. Analyze them,
   inspect results and automatic tasks, edit/copy a reply, and update/reopen a task.
3. Reanalyze without a duplicate task. Check loading/error toasts and mobile layout.
4. Log out, sign in again, then remove Gmail access and reconnect. Confirm account
   cleanup and refresh behavior without sending, archiving, or deleting Gmail mail.
5. Inspect runtime logs without sharing tokens, cookies, email content, or raw
   OAuth query strings. Record only synthetic findings.

## Rollback and public launch

Use Vercel's previous successful deployment and project rollback/promotion controls
to restore code. Keep frontend/backend versions compatible; do not change the stable
API hostname or encryption key during rollback. Environment-variable changes and
database changes are not undone by a code rollback. This first rollout has no earlier
hosted version; if it fails, stop hosted testing and continue locally until fixed.

The [security review](SECURITY_REVIEW.md) lists unresolved public-launch requirements:
provider logging/training and retention terms, privacy/Limited Use disclosures,
owned-domain verification, Google restricted-scope verification and any required
security assessment, and retention/deletion requirements. This non-commercial tester
rollout does not purchase a domain, upgrade a plan, or claim those requirements pass.

Official deployment references: [Flask](https://vercel.com/docs/frameworks/backend/flask),
[Python runtime](https://vercel.com/docs/functions/runtimes/python),
[rewrites](https://vercel.com/docs/routing/rewrites), and
[Google OAuth](https://developers.google.com/identity/protocols/oauth2).
