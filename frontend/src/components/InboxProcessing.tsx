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
  const status =
    progress.phase === 'syncing'
      ? 'Syncing inbox...'
      : progress.phase === 'preparing'
        ? 'Preparing emails...'
        : progress.phase === 'analyzing'
          ? `Analyzing ${progress.current} of ${progress.total}`
          : progress.phase === 'paused'
            ? 'Processing paused. Completed results are saved.'
            : progress.phase === 'failed'
              ? 'Could not finish processing. Saved emails are unchanged.'
              : progress.phase === 'finished'
                ? `${progress.completed} analyzed, ${progress.failed} analysis failures in this run.`
                : ''
  return (
    <section aria-label="Inbox controls" className="mb-5">
      <div
        className={`${reading ? 'hidden lg:flex' : 'flex'} flex-wrap items-center justify-between gap-4`}
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
        <Button disabled={busy || disabled} onClick={() => confirm('sync')}>
          <RefreshCw
            className={`size-4 ${busy ? 'motion-safe:animate-spin' : ''}`}
            aria-hidden="true"
          />
          Sync inbox
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
      {(busy || progress.phase === 'paused') && (
        <section
          aria-label="Processing progress"
          aria-busy={busy}
          className="mt-4 rounded-control border border-line bg-accent-soft px-4 py-3 text-sm"
        >
          <p role="status" aria-live="polite">
            {status}
          </p>
          {busy && progress.phase !== 'analyzing' && (
            <LoadingIndicator label="Working..." />
          )}
          {progress.total > 0 && (
            <progress
              aria-label="Analysis progress"
              max={progress.total}
              value={progress.completed + progress.failed}
              className="mt-2 h-2 w-full accent-ink"
            />
          )}
          {(progress.imported > 0 ||
            progress.existing > 0 ||
            progress.importFailed > 0 ||
            progress.deferred > 0) && (
            <p className="mt-2 text-xs text-muted">
              {progress.imported} imported, {progress.existing} already saved,{' '}
              {progress.importFailed} import failures, {progress.deferred}{' '}
              deferred.
            </p>
          )}
          {busy && (
            <p className="mt-2 text-xs text-muted">
              Leaving this page pauses remaining analyses. Completed results
              stay saved.
            </p>
          )}
        </section>
      )}
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
            ? 'Bring in up to 20 matching emails from Gmail, then analyze any that still need it. '
            : action === 'failed'
              ? 'Try again for up to 20 emails we couldn’t analyze before. '
              : 'Pick up where you left off with up to 20 saved emails. '}
          Your email text is shared with our AI service to create summaries and
          suggested replies. Nothing is sent to your contacts. Finished results
          stay saved if you leave this page. Clear requests may automatically
          become Pending tasks in Actions. Existing tasks stay unchanged.
        </p>
        {action === 'sync' && (
          <p className="mt-3 text-sm">
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
