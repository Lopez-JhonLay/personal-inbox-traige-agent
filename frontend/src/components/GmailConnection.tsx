import { useIsMutating } from '@tanstack/react-query'
import { useRef } from 'react'
import { notify } from '../notifications/toasts'
import { useAuthStatus, useDisconnectGmail } from '../hooks/useAuth'
import { googleConnectUrl } from '../services/auth'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

export function GmailConnection({
  onRemoved,
  onBusyChange,
}: {
  onRemoved?: (revoked: boolean) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const auth = useAuthStatus()
  const status = auth.data
  const disconnect = useDisconnectGmail(status?.user_id ?? null)
  const dialog = useRef<HTMLDialogElement>(null)
  const loggingOut = useIsMutating({ mutationKey: ['auth', 'logout'] }) > 0
  const reconnect =
    status?.authenticated && status.connection_status !== 'connected'

  async function confirmRemoval() {
    onBusyChange?.(true)
    try {
      const revoked = await disconnect.mutateAsync()
      if (!onRemoved)
        notify(
          revoked ? 'success' : 'warning',
          'Gmail access removed',
          revoked
            ? 'You are logged out. Your saved emails are still available.'
            : 'You are logged out. To finish removing access, visit your Google Account settings.',
        )
      dialog.current?.close()
      onRemoved?.(revoked)
      // Keep the auth guard waiting until the successful navigation unmounts it.
      if (!onRemoved) onBusyChange?.(false)
    } catch {
      // Render the error below; never replay an access removal automatically.
      onBusyChange?.(false)
    }
  }

  return (
    <section
      aria-labelledby="gmail-title"
      className="mb-8 rounded-panel border-2 border-ink bg-surface p-5 shadow-press sm:p-7"
    >
      <h2 id="gmail-title" className="text-xl">
        Gmail access
      </h2>
      {auth.isPending ? (
        <LoadingIndicator label="Checking connection..." />
      ) : (
        status && (
          <>
            <p className="mt-3 break-words text-sm">
              {status.authenticated
                ? `Signed in as ${status.email}`
                : 'You are logged out.'}
            </p>
            {status.authenticated && (
              <div className="mt-3">
                <Badge tone={reconnect ? 'warning' : 'success'}>
                  {reconnect ? 'Reconnect required' : 'Read-only access'}
                </Badge>
              </div>
            )}
            <div className="cluster mt-4 gap-3">
              {reconnect && !auth.isError && (
                <a className="button text-sm" href={googleConnectUrl(true)}>
                  Reconnect Gmail
                </a>
              )}
              {status.authenticated && (
                <Button
                  variant="secondary"
                  disabled={auth.isError || disconnect.isPending || loggingOut}
                  onClick={() => {
                    disconnect.reset()
                    dialog.current?.showModal()
                  }}
                >
                  Remove Gmail access
                </Button>
              )}
            </div>
          </>
        )
      )}
      <p className="mt-4 text-sm text-muted">
        Remove access only if you want to stop Mailkind from reading your Gmail.
        To end your visit, use Log out. Saved emails remain in Mailkind.
      </p>
      {auth.isError && (
        <ErrorState
          message="Gmail access status is unavailable."
          onRetry={() => {
            void auth.refetch()
          }}
          retrying={auth.isFetching}
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
          Remove Gmail access?
        </h3>
        <p className="mt-3 text-sm text-muted">
          This removes Mailkind's Gmail access and logs you out. Your saved
          emails and actions remain in Mailkind. You will need to approve Gmail
          access again when you return.
        </p>
        <div className="cluster mt-6 gap-3">
          <Button
            variant="secondary"
            disabled={disconnect.isPending || loggingOut}
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </Button>
          <Button
            busy={disconnect.isPending}
            disabled={loggingOut}
            onClick={confirmRemoval}
          >
            {disconnect.isPending
              ? 'Removing access...'
              : 'Remove access and log out'}
          </Button>
        </div>
      </dialog>
    </section>
  )
}
