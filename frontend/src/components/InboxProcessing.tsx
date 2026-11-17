import { useEffect, useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useProcessingCounts } from '../hooks/useEmails'
import {
  type ProcessingAction,
  useInboxProcessing,
} from '../hooks/useInboxProcessing'
import { formatTimestamp } from '../utils/dates'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

export function InboxProcessing({
  userId,
  syncQuery,
  disabled = false,
  onBusyChange,
  lastSyncedAt,
  timezone = 'Asia/Manila',
  reading = false,
  children,
}: {
  userId: string
  syncQuery: string
  disabled?: boolean
  onBusyChange: (busy: boolean) => void
  lastSyncedAt?: string | null
  timezone?: string
  reading?: boolean
  children?: ReactNode
}) {
  const counts = useProcessingCounts(userId)
  const processing = useInboxProcessing(userId)
  const [action, setAction] = useState<ProcessingAction>('sync')
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = processing.isRunning
  const progress = processing.progress
  useEffect(() => {
    onBusyChange(busy)
  }, [busy, onBusyChange])

  function confirm(next: ProcessingAction) {
    setAction(next)
    dialog.current?.showModal()
  }
  function start() {
    dialog.current?.close()
    void processing.run(action)
  }
  const buttonLabel = !busy
    ? 'Sync inbox'
    : progress.phase === 'analyzing'
      ? `Analyzing ${progress.current} of ${progress.total}`
      : progress.phase === 'syncing'
        ? 'Syncing...'
        : 'Preparing...'
  return (
    <section aria-label="Inbox controls" className="mb-5">
      <div
        className={`${reading && !busy ? 'hidden lg:flex' : 'flex'} flex-wrap items-center justify-between gap-4`}
      >
        <div>
          <h1 className="text-heading">Inbox</h1>
          <p className="mt-1 text-xs text-muted">
            Last successful sync:{' '}
            {lastSyncedAt
              ? formatTimestamp(lastSyncedAt, timezone)
              : 'No successful sync recorded'}
          </p>
        </div>
        <Button busy={busy} disabled={disabled} onClick={() => confirm('sync')}>
          <RefreshCw
            className={`size-4 ${busy ? 'motion-safe:animate-spin' : ''}`}
            aria-hidden="true"
          />
          {buttonLabel}
        </Button>
      </div>
      {children && (
        <div className={`${reading ? 'hidden lg:block' : ''} mt-4`}>
          {children}
        </div>
      )}
      <div className={reading && !busy ? 'hidden lg:block' : ''}>
        {counts.isPending && (
          <LoadingIndicator label="Loading processing status..." />
        )}
        {counts.data && (counts.data.pending > 0 || counts.data.failed > 0) && (
          <section
            aria-label="Unfinished analyses"
            className="cluster mt-4 gap-x-4 gap-y-2 rounded-control border border-line bg-surface px-4 py-3 text-sm"
          >
            {counts.data.pending > 0 && (
              <>
                <span>{counts.data.pending} unfinished analyses</span>
                <Button
                  variant="secondary"
                  className="text-xs"
                  disabled={busy || disabled}
                  onClick={() => confirm('pending')}
                >
                  Continue analysis
                </Button>
              </>
            )}
            {counts.data.failed > 0 && (
              <>
                <span>{counts.data.failed} failed analyses</span>
                <Button
                  variant="secondary"
                  className="text-xs"
                  disabled={busy || disabled}
                  onClick={() => confirm('failed')}
                >
                  Retry failed
                </Button>
              </>
            )}
          </section>
        )}
        {counts.isError && (
          <ErrorState
            message="Could not refresh processing counts. Saved progress is unchanged."
            onRetry={() => {
              void counts.refetch()
            }}
            retrying={counts.isFetching}
          />
        )}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="processing-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
      >
        <h2 id="processing-title" className="text-xl">
          {action === 'sync'
            ? 'Sync and analyze emails?'
            : action === 'failed'
              ? 'Try these emails again?'
              : 'Continue analyzing emails?'}
        </h2>
        <p className="mt-3 text-sm">
          {action === 'sync'
            ? 'Sync and analyze up to 20 matching Gmail emails. '
            : action === 'failed'
              ? 'Try again for up to 20 emails we couldn’t analyze before. '
              : 'Pick up where you left off with up to 20 saved emails. '}
          Clear requests may become tasks in Actions.
        </p>
        <p className="mt-3 text-sm text-muted">
          Your email text is shared with our AI service. Nothing is sent to your
          contacts.
        </p>
        {action === 'sync' && (
          <p className="mt-3 break-words text-xs text-muted">
            {syncQuery
              ? `Inbox filter: ${syncQuery}`
              : 'Emails to include: recent inbox messages.'}
          </p>
        )}
        <div className="cluster mt-5 gap-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button onClick={start} disabled={disabled || busy}>
            {action === 'sync'
              ? 'Sync and analyze'
              : action === 'failed'
                ? 'Try again'
                : 'Continue analysis'}
          </Button>
        </div>
      </dialog>
    </section>
  )
}
