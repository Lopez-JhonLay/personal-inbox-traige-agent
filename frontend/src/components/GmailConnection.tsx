import { useEffect, useRef, useState } from 'react'
import { useAuthStatus, useDisconnectGmail } from '../hooks/useAuth'
import { googleConnectUrl } from '../services/auth'
import { InboxProcessing } from './InboxProcessing'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

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
  const auth = useAuthStatus()
  const status = auth.data
  const disconnect = useDisconnectGmail(status?.user_id ?? null)
  const [processing, setProcessing] = useState(false)
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
  }, [])

  async function confirmDisconnect() {
    try {
      const revoked = await disconnect.mutateAsync()
      setNotice(
        revoked
          ? 'Gmail disconnected.'
          : 'Disconnected locally. Google access could not be revoked; remove Mailkind access in your Google Account.',
      )
      dialog.current?.close()
    } catch {
      /* The mutation error is rendered below; never replay automatically. */
    }
  }
  const connected =
    status?.authenticated && status.connection_status === 'connected'
  const reconnect =
    status?.authenticated &&
    status.connection_status === 'reauthorization_required'
  const disabled = auth.isError || disconnect.isPending || processing
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
            {auth.isPending ? (
              <div className="mt-2">
                <LoadingIndicator label="Checking connection…" />
              </div>
            ) : (
              status && (
                <p className="mt-2 break-words text-sm text-muted">
                  {connected
                    ? `Connected as ${status.email}`
                    : reconnect
                      ? `Reconnect ${status.email} to restore access.`
                      : status.configured
                        ? 'Connect your account with read-only access.'
                        : 'Gmail connection is not available yet.'}
                </p>
              )
            )}
            {connected && (
              <div className="mt-2">
                <Badge tone="success">Connected</Badge>
              </div>
            )}
            {reconnect && (
              <div className="mt-2">
                <Badge tone="warning">Reconnect required</Badge>
              </div>
            )}
          </div>
          {status?.configured && !auth.isError && (
            <div className="cluster gap-3">
              {!connected && (
                <a className="button text-sm" href={googleConnectUrl()}>
                  {reconnect ? 'Reconnect Gmail' : 'Connect Gmail'}
                </a>
              )}
              {status.authenticated && (
                <Button
                  variant="secondary"
                  className="text-sm"
                  disabled={disabled}
                  onClick={() => {
                    disconnect.reset()
                    dialog.current?.showModal()
                  }}
                >
                  Disconnect
                </Button>
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
        {auth.isError && (
          <ErrorState
            message="Gmail connection is unavailable. You can still try the sample inbox."
            onRetry={() => {
              void auth.refetch()
            }}
            retrying={auth.isFetching}
          />
        )}
        {disconnect.isError && (
          <ErrorState message={disconnect.error.message} />
        )}
        {connected && status.user_id && (
          <InboxProcessing
            key={status.user_id}
            userId={status.user_id}
            syncQuery={status.sync_query}
            disabled={auth.isError || disconnect.isPending}
            onBusyChange={setProcessing}
          />
        )}
        <dialog
          ref={dialog}
          aria-labelledby="disconnect-title"
          className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
          onCancel={(event) => {
            if (disconnect.isPending) event.preventDefault()
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
            <Button
              variant="secondary"
              disabled={disconnect.isPending}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button busy={disconnect.isPending} onClick={confirmDisconnect}>
              {disconnect.isPending ? 'Disconnecting…' : 'Disconnect Gmail'}
            </Button>
          </div>
          {disconnect.isError && (
            <ErrorState message={disconnect.error.message} />
          )}
        </dialog>
      </div>
    </section>
  )
}
