import { Link } from 'react-router'
import { useEffect, useRef } from 'react'
import { BrandIdentity } from '../components/BrandIdentity'
import { PolicyLinks } from '../components/PolicyLinks'

const operator = 'Jhon Lay Lopez'
const supportEmail = 'jhonlaylopez000@gmail.com'

function Contact() {
  return (
    <p>
      Mailkind is operated by {operator}. For support, privacy questions, or
      account-data deletion, email{' '}
      <a className="break-all underline" href={`mailto:${supportEmail}`}>
        {supportEmail}
      </a>
      . Do not include passwords, access tokens, or private email contents in
      your request.
    </p>
  )
}

export default function PolicyPage({ page }: { page: 'privacy' | 'terms' }) {
  const privacy = page === 'privacy'
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  return (
    <>
      <title>
        {privacy ? 'Privacy policy | Mailkind' : 'Terms of service | Mailkind'}
      </title>
      <header className="border-b border-line bg-paper">
        <div className="page-container flex flex-wrap items-center justify-between gap-3 py-4">
          <Link to="/" aria-label="Mailkind home" className="no-underline">
            <BrandIdentity />
          </Link>
          <PolicyLinks />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
        <h1 ref={heading} tabIndex={-1} className="text-heading">
          {privacy ? 'Privacy policy' : 'Terms of service'}
        </h1>
        <p className="mt-3 text-sm text-muted">Effective November 17, 2026</p>
        <div className="mt-8 space-y-7 text-sm leading-relaxed [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_p+p]:mt-3">
          {privacy ? (
            <>
              <section>
                <h2>What Mailkind accesses</h2>
                <p>
                  When you connect Google, Mailkind receives your Gmail address
                  and, when available, your name and profile photo. We store
                  your account identity, timezone, and an encrypted refresh
                  token to keep your Gmail connection working.
                </p>
                <p>
                  When you choose to sync, we read matching Gmail messages and
                  store their sender, subject, received time, and supported
                  plain-text content. Gmail permission is read-only: Mailkind
                  cannot send, delete, archive, or relabel messages.
                </p>
              </section>
              <section>
                <h2>How your data is used</h2>
                <p>
                  Mailkind uses this information to display your saved inbox,
                  generate summaries, categories, priorities, deadlines and
                  suggested replies, and track tasks. You choose when syncing
                  and analysis begin. Clear requests can automatically become
                  tasks during analysis; this does not carry out the work or
                  change Gmail.
                </p>
                <p>
                  Mailkind does not sell your Google user data, use it for
                  advertising, or train its own AI models on it. Google user
                  data is subject to the{' '}
                  <a href="https://developers.google.com/terms/api-services-user-data-policy">
                    Google API Services User Data Policy
                  </a>
                  , including applicable Limited Use requirements.
                </p>
              </section>
              <section>
                <h2>AI and service providers</h2>
                <p>
                  Analysis sends email text, sender, subject, and date/time
                  context to OpenRouter and the selected upstream AI provider.
                  Automatic task decisions also include the extracted analysis.
                  These services receive content to generate the requested
                  results. Their processing and retention policies vary; review
                  the{' '}
                  <a href="https://openrouter.ai/privacy">
                    OpenRouter privacy policy
                  </a>{' '}
                  and{' '}
                  <a href="https://openrouter.ai/docs/guides/privacy/provider-logging">
                    upstream provider data policies
                  </a>
                  . Mailkind does not promise that every provider has zero data
                  retention.
                </p>
                <p>
                  Vercel hosts the application and Neon hosts the database.
                  These providers process data needed to operate the service.
                  Operational logs may include request metadata, usage counts,
                  and error codes. We do not intentionally log email bodies,
                  reply drafts, or credentials.
                </p>
              </section>
              <section>
                <h2>Storage and deletion</h2>
                <p>
                  Imported messages, analyses, and tasks have no automatic
                  expiry. They remain until your stored account data is deleted.
                  Logging out or removing Gmail access does not delete this
                  saved history.
                </p>
                <p>
                  To request deletion, contact us from the connected account. We
                  verify the request before deleting your active account records
                  and associated messages, analyses, and tasks. There is
                  currently no self-service deletion button. Removal from active
                  storage does not guarantee immediate erasure from backups or
                  copies held by service providers; their retention and deletion
                  rules apply separately.
                </p>
              </section>
              <section>
                <h2>Your controls and security</h2>
                <p>
                  Remove Gmail access in Settings to clear Mailkind's stored
                  connection token and request Google revocation. You can also
                  revoke access in your{' '}
                  <a href="https://myaccount.google.com/connections">
                    Google Account
                  </a>
                  . Mailkind uses essential session cookies for sign-in and
                  request protection. Refresh tokens are encrypted and saved
                  records are scoped to your account. No online service can
                  guarantee complete security.
                </p>
              </section>
              <section>
                <h2>Contact and policy changes</h2>
                <Contact />
                <p>
                  Updates will appear on this page with a revised effective
                  date. Material changes to data use will be disclosed before
                  they take effect, with additional consent where required.
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2>Using Mailkind</h2>
                <p>
                  These terms govern your use of Mailkind, operated by{' '}
                  {operator}. By using the service, you agree to these terms and
                  acknowledge our <Link to="/privacy">privacy policy</Link>.
                </p>
                <p>
                  Connect only accounts you are authorized to use. Keep your
                  Google account secure and follow applicable laws and Google
                  policies. Do not misuse the service, attempt to access another
                  person's data, bypass access controls, or disrupt the
                  application or its providers.
                </p>
              </section>
              <section>
                <h2>AI suggestions and your control</h2>
                <p>
                  AI output can be incorrect or incomplete. Check the original
                  message before relying on a summary, deadline, task, or
                  suggested reply. You remain responsible for decisions and
                  messages you send. Mailkind does not provide professional
                  legal, financial, or medical advice.
                </p>
                <p>
                  Gmail access is read-only. Mailkind does not send replies or
                  change your Gmail messages. Tasks created during analysis only
                  track work; they do not perform it. Reply edits are temporary
                  unless you copy them elsewhere.
                </p>
              </section>
              <section>
                <h2>Availability and third-party services</h2>
                <p>
                  Mailkind is provided as available, without a guarantee of
                  uninterrupted access, accurate AI output, or suitability for a
                  particular purpose. Google, hosting, database, and AI services
                  may impose limits, outages, or separate terms. Your statutory
                  rights are not excluded by these terms.
                </p>
              </section>
              <section>
                <h2>Ending access and changes</h2>
                <p>
                  You can stop using Mailkind and revoke Gmail access at any
                  time. Saved data remains until deletion is requested as
                  described in the privacy policy. We may restrict access for
                  misuse, security concerns, or provider requirements, and may
                  change or discontinue features. Material updates to these
                  terms will be posted here before taking effect.
                </p>
              </section>
              <section>
                <h2>Contact</h2>
                <Contact />
              </section>
            </>
          )}
        </div>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-11 items-center underline"
        >
          Back to Mailkind
        </Link>
      </main>
    </>
  )
}
