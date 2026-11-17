# Phase 9 security and validation review

Reviewed November 17, 2026. This is a source review and regression-test record,
not a penetration test, compliance certification, or production approval.

Hosted environment audit on November 17, 2026: five backend credentials
(`DATABASE_URL`, `TOKEN_ENCRYPTION_KEY`, `GOOGLE_CLIENT_SECRET`, `OPENROUTER_API_KEY`,
`SECRET_KEY`) were converted from encrypted Config to Vercel Secret and verified by
metadata. Values were preserved without decrypting or displaying them; all remain
Production-only. The frontend contains only public API-base configuration.
The user accepts an unverified Google signup rollout, which retains Google's warning
and 100-user cap; this does not establish public-policy compliance.

Validation: 248 offline backend tests and all 24 rollback-only Neon tests passed
(272 combined). All 104 frontend tests, frontend lint/format/build, targeted Python
lint/format, and documentation formatting passed. Database verification took 484.56
seconds and used mocked external providers. Browser acceptance remains separate.

## Verified controls

| Control                   | Evidence                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend-only secrets      | Frontend source and example configuration expose only `VITE_API_BASE_URL`; no provider keys, refresh tokens, or database URLs are imported into frontend code. Environment files are ignored.                                                                                                                                                             |
| Encrypted refresh tokens  | Fernet encryption, invalid-key handling, rotation, and disconnect races are tested in `test_auth.py`. Encryption keys remain server configuration.                                                                                                                                                                                                        |
| Session security          | Signed cookies contain identity, CSRF/OAuth state, and optional cosmetic profile data, not provider tokens. Tests cover eight-hour expiry, HttpOnly, SameSite=Lax, and Secure when enabled. Production must enable HTTPS and `SESSION_COOKIE_SECURE=true`; local HTTP deliberately defaults to false.                                                     |
| OAuth protection          | Callback tests cover missing, mismatched, expired, and consumed state; PKCE; missing permissions; account mismatch; safe redirects; and provider errors.                                                                                                                                                                                                  |
| CSRF and ownership        | Email/action mutations and disconnect/logout require session CSRF. Route, repository, and pipeline tests cover missing authentication and cross-user reads/writes. IDs or ownership supplied by the model are never accepted.                                                                                                                             |
| CORS and caching          | Only the configured frontend origin gets credentialed CORS headers. Auth, email, and action responses use `Cache-Control: no-store`; frontend private data is memory-only and cleared on logout/account changes.                                                                                                                                          |
| Untrusted display         | Gmail HTML is normalized to plain text without loading remote resources. React renders email/analysis text without `dangerouslySetInnerHTML`. Dashboard tests include markup in the source email; Google callback tests cover hostile text.                                                                                                               |
| Bounded agent permissions | Gmail uses only `gmail.readonly`; operations are profile/list/get. The sole model tool is `add_action({})`, with backend-selected owner/email/content/status. Unknown tools, extra arguments, multiple calls, and incomplete responses are rejected. No send/archive/delete/payment tool exists. OAuth token revocation is an explicit account operation. |
| Failure isolation         | Tests cover duplicate reuse, disconnect/lease races, manual-task precedence, and a task savepoint failure retaining successful analysis. Navigation does not start inference; frontend mutations are not replayed after reconnection.                                                                                                                     |
| Log privacy               | OAuth callback queries are stripped from Werkzeug access logs. Tests check AI success/failure and handled persistence failures with synthetic private markers. AI logs contain model/version/usage or safe error codes. SQLAlchemy now hides bound parameters.                                                                                            |

Log protection is deliberately limited: `hide_parameters` does not sanitize arbitrary
database-driver error text, SQL literals, debug traces, hosting logs, or third-party
debug logging. Current handled database failures return safe errors without logging
the exception. Do not enable SQL echo, HTTP wire logging, or Flask debug in production.
Unexpected Flask exceptions retain normal server-side stack logging; avoid including
email content or credentials in exception messages and review production log access.

## Retention and operator-assisted deletion

- Imported emails, analysis history, tasks, and account records have no automatic
  expiry. They remain until an operator deletes the stored account data.
- Logout ends the browser session. Remove Gmail access clears the local encrypted
  refresh token, attempts remote revocation, and ends the session; both retain saved data.
- There is no account-deletion endpoint, Settings deletion button, or scheduled purge.
  To request removal in this development project, contact the operator directly.
- The operator must verify the requester and exact account UUID, revoke Gmail access
  first where possible, then delete that `users` record in a reviewed transaction.
  Existing foreign-key cascades remove the associated connection, emails, analyses,
  and actions; the rollback-only `test_delete_cascades` verifies this behavior.
  Verify removal before committing. Do not delete by an unverified email address.
- Database deletion does not erase provider copies, backups, or already-issued signed
  browser sessions. End the browser session separately; backend user checks reject
  subsequent private operations once the user record is absent. A sign-in can create
  a fresh account. Backup and provider retention/deletion must be confirmed separately.

This describes the current implementation, not a claim that indefinite retention
meets public-release policy requirements. Automatic retention and self-service
deletion remain deferred by product decision.

## Provider and Google policy review

Official sources checked November 17, 2026:

- [Google Workspace user data and developer policy](https://developers.google.com/workspace/workspace-api-user-data-developer-policy)
  permits productivity uses such as email summaries, requires clear disclosures and
  honoring deletion requests, and restricts transfers and generalized AI training.
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
  adds transparency, security, and appropriate-access obligations.
- [OpenRouter provider logging](https://openrouter.ai/docs/guides/privacy/provider-logging)
  explains that upstream policies differ and free-model training permissions have
  separate account controls. Opting out restricts routing to providers that do not train.
- [OpenRouter privacy policy](https://openrouter.ai/privacy) distinguishes its handling
  from upstream model-provider handling; upstream retention is not uniform.
- [Configured free ERNIE model](https://openrouter.ai/baidu/ernie-5.5-flash-preview:free)
  identifies the model, but its public page alone does not establish the account's
  routing settings or all upstream retention/deletion terms.

**Unresolved release blockers:** account-level prompt logging/training settings,
the selected upstream provider's current data terms, retention/deletion compatibility,
and the app's public privacy/Limited Use disclosure and applicable OAuth verification
requirements have not been verified. Confirm them before approving real-email
processing/public deployment. Do not assume a free model has zero retention or that
passing tests proves policy compliance. No account settings or model selection were
changed by this review; Phase 9 evaluation uses synthetic data only.

## AI regression review

Existing functional coverage was reused rather than duplicated:

- Backend request/response validation: `test_analysis.py`, `test_email_routes.py`,
  and `test_actions.py`; MIME normalization and read-only calls: `test_gmail.py`;
  OAuth, encryption, cookies, and revocation: `test_auth.py`.
- Rollback-only persistence, ownership, duplicate prevention, filters, cascades,
  leases, and transaction races: `test_repositories.py` and `test_email_pipeline.py`.
  Mocked task isolation and permissions: `test_auto_actions.py` and `test_analysis.py`.
- Frontend list rendering, classification badges, loading/empty/error states, and
  filtering: `DashboardPage.test.tsx`; creation/status changes: `ActionsPage.test.tsx`;
  account cleanup and errors: query/API tests; processing and notifications: hook/toast tests.
- New evaluator tests cover first-pass scoring, budget truncation, provider errors,
  metadata, explicit network opt-in, and nonzero exit status for incomplete runs.

The evaluators require `--live`, call only the configured free ERNIE model, and make
one attempt per case without requeuing failures. Analysis uses a fixed November 16
reference time; reports also record the actual run time. A report separates valid
outputs, field accuracy over valid outputs, provider/service errors, and unattempted
cases. A zero CLI exit code indicates expected automated checks passed, not manual
review approval. Reports belong in ignored `.cache/` and must contain synthetic data only.

On November 17, the analysis run used eight requests and matched all eight category,
priority, deadline, and reply-needed expectations, with eight valid outputs and no
provider errors. All eight outputs were manually inspected against source fixtures:
amounts/dates were preserved, ambiguous Friday stayed unresolved, no completed work
or payment was claimed, and the injection case did not alter the classification or
reveal instructions. The two reply drafts had useful structure and no invented
availability or guaranteed deadlines; optional clarification text remains editable.
No prompt change was justified by this run.

The separate `task-decision-v2` run also passed all eight cases in eight requests:
work review, reply request, and unpaid bill created a task decision; newsletter,
promotion, informational, resolved, and injection cases did not. Both runs completed
without provider errors, using exactly 16 synthetic inference requests combined and
no retries. Raw reports are `.cache/phase9-analysis.json` and `.cache/phase9-tasks.json`.

These small fixed fixtures do not measure broad accuracy or prove immunity to prompt
injection. The task suite uses fixed synthetic analyses to isolate tool decisions;
mocked pipeline tests separately exercise actual persistence and failure isolation.

## Remaining manual acceptance

1. At desktop and 320px mobile widths, verify inbox/actions wrapping and keyboard access.
2. Check Add to Actions and reanalysis dialogs for focus trapping, Escape, focus return,
   and preservation of entered values after errors.
3. Check top-of-page success/error toasts, dismissal, expiry, pause on hover/focus,
   and availability while a dialog is open.
4. Switch accounts or log out during reads/mutations; confirm no prior-account content
   or late notification appears.
5. Using explicitly prepared fictional Gmail messages, sign in, sync, analyze, inspect
   the automatic task, update/reopen it, and reanalyze without duplicates. Check that a
   provider/task failure retains saved analysis and permits manual task creation.

Real-browser, live Gmail, production HTTPS, and provider-account checks are not
completed by mocked tests. Deployment and public-release configuration remain Phase 10.
