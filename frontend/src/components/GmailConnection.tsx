import { useEffect, useRef, useState } from 'react'
import { InboxProcessing } from './InboxProcessing'
import {
  type ConnectionStatus,
  disconnectGmail,
  getConnectionStatus,
  googleConnectUrl,
} from '../services/auth'

const callbackMessages: Record<string, string> = {
  connected: 'Gmail connected.',
  OAUTH_DENIED: 'Gmail connection was cancelled.',
  OAUTH_STATE_INVALID: 'The connection link expired. Please try again.',
  ACCOUNT_MISMATCH: 'Disconnect your current account before choosing another.',
  REFRESH_TOKEN_REQUIRED: 'Please reconnect Gmail and grant consent again.',
  GMAIL_PERMISSION_DENIED: 'Allow read-only Gmail access to connect.',
  AUTH_NOT_CONFIGURED: 'Gmail connection is not available yet.',
  GOOGLE_UNAVAILABLE:
    'Mailkind could not reach Google. Please try connecting again.',
  OAUTH_FAILED: 'Google authorization failed. Please try connecting again.',
  DATABASE_UNAVAILABLE: 'Could not save the connection. Please try again.',
}

export function GmailConnection() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const outcome = url.searchParams.get('gmail')
    if (outcome) {
      setNotice(
        Object.hasOwn(callbackMessages, outcome)
          ? callbackMessages[outcome]
          : 'Could not connect Gmail. Please try again.',
      )
      url.searchParams.delete('gmail')
      window.history.replaceState(null, '', url)
    }
    let active = true
    getConnectionStatus()
      .then((result) => {
        if (active) setStatus(result)
      })
      .catch(() => {
        if (active)
          setError(
            'Gmail connection is unavailable. You can still try the sample inbox.',
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function disconnect() {
    if (!status?.csrf_token) return
    setBusy(true)
    setError('')
    try {
      const revoked = await disconnectGmail(status.csrf_token)
      setStatus({
        ...status,
        authenticated: false,
        email: null,
        user_id: null,
        connection_status: 'disconnected',
        csrf_token: null,
      })
      setNotice(
        revoked
          ? 'Gmail disconnected.'
          : 'Disconnected locally. Google access could not be revoked; remove Mailkind access in your Google Account.',
      )
      dialog.current?.close()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not disconnect Gmail.',
      )
    } finally {
      setBusy(false)
    }
  }

  const connected =
    status?.authenticated && status.connection_status === 'connected'
  const reconnect =
    status?.authenticated &&
    status.connection_status === 'reauthorization_required'

  return (
    <section
      id="gmail-connection"
      aria-labelledby="gmail-title"
      className="page-container mb-12 scroll-mt-8"
    >
      <div className="rounded-panel border-2 border-ink bg-surface p-5 shadow-press sm:p-7">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full min-w-0 flex-1 sm:w-auto">
            <h2 id="gmail-title" className="text-xl">
              Your Gmail connection
            </h2>
            <p className="mt-2 break-words text-sm text-muted">
              {loading
                ? 'Checking connection…'
                : connected
                  ? `Connected as ${status.email}`
                  : reconnect
                    ? `Reconnect ${status.email} to restore access.`
                    : status?.configured
                      ? 'Connect your account with read-only access.'
                      : 'Gmail connection is not available yet.'}
            </p>
          </div>
          {!loading && status?.configured && (
            <div className="cluster gap-3">
              {!connected && (
                <a className="button text-sm" href={googleConnectUrl()}>
                  {reconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
                </a>
              )}
              {status.authenticated && (
                <button
                  className="button button-secondary text-sm"
                  type="button"
                  disabled={processing}
                  onClick={() => dialog.current?.showModal()}
                >
                  Disconnect
                </button>
              )}
            </div>
          )}
        </div>
        <p className="mt-4 text-sm text-muted">
          The inbox above is a sample. Emails are imported and analyzed only
          when you start processing below.
        </p>
        <p className="mt-3 text-sm" role="status">
          {notice}
        </p>
        {error && (
          <p className="mt-3 text-sm" role="alert">
            {error}
          </p>
        )}
        {connected && status.csrf_token && (
          <InboxProcessing
            csrfToken={status.csrf_token}
            syncQuery={status.sync_query}
            onBusyChange={setProcessing}
          />
        )}
        <dialog
          ref={dialog}
          aria-labelledby="disconnect-title"
          className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
          onCancel={(event) => {
            if (busy) event.preventDefault()
          }}
        >
          <h3 id="disconnect-title" className="text-xl">
            Disconnect Gmail?
          </h3>
          <p className="mt-3 text-sm text-muted">
            This removes Gmail access. Previously saved emails and actions stay
            in Mailkind.
          </p>
          <div className="mt-6 cluster gap-3">
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={disconnect}
            >
              {busy ? 'Disconnecting…' : 'Disconnect Gmail'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm" role="alert">
              {error}
            </p>
          )}
        </dialog>
      </div>
    </section>
  )
}
