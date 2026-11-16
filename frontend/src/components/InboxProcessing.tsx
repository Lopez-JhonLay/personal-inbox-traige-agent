import { useEffect, useRef, useState } from 'react'
import { useProcessingCounts } from '../hooks/useEmails'
import {
  type ProcessingAction,
  useInboxProcessing,
} from '../hooks/useInboxProcessing'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { EmptyState } from './ui/EmptyState'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

export function InboxProcessing({
  userId,
  syncQuery,
  disabled = false,
  onBusyChange,
}: {
  userId: string
  syncQuery: string
  disabled?: boolean
  onBusyChange: (busy: boolean) => void
}) {
  const counts = useProcessingCounts(userId)
  const processing = useInboxProcessing(userId)
  const [action, setAction] = useState<ProcessingAction>('sync')
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = processing.isRunning
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
  const empty =
    counts.data && Object.values(counts.data).every((count) => count === 0)

  return (
    <div className="mt-6 border-t border-line pt-5" aria-busy={busy}>
      <h3 className="text-lg">Process your inbox</h3>
      <p className="mt-2 text-sm text-muted">
        Sync saves email text in Mailkind and sends pending messages to the
        configured AI provider. The inbox preview above stays fictional.
      </p>
      <p className="mt-2 text-sm text-muted">
        Continue and retry process up to 20 stored emails per run.
      </p>
      <p className="mt-2 text-sm text-muted">
        {syncQuery
          ? `Inbox filter: ${syncQuery}`
          : 'Import scope: recent inbox messages.'}
      </p>
      {counts.isPending && (
        <div className="mt-3">
          <LoadingIndicator label="Loading processing counts…" />
        </div>
      )}
      {counts.data && (
        <section
          className="cluster mt-3 gap-2"
          aria-label="Stored processing counts"
        >
          <Badge>{counts.data.pending} pending</Badge>
          <Badge tone="success">{counts.data.completed} analyzed</Badge>
          <Badge tone={counts.data.failed ? 'warning' : 'neutral'}>
            {counts.data.failed} failed
          </Badge>
        </section>
      )}
      {empty && (
        <EmptyState
          title="No emails imported yet"
          message="Start with Sync Inbox when your test messages are ready."
        />
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
      <div className="cluster mt-4 gap-3">
        <Button
          className="text-sm"
          disabled={busy || disabled}
          onClick={() => confirm('sync')}
        >
          Sync Inbox
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          disabled={busy || disabled || !counts.data?.pending}
          onClick={() => confirm('pending')}
        >
          Continue analysis
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          disabled={busy || disabled || !counts.data?.failed}
          onClick={() => confirm('failed')}
        >
          Retry failed
        </Button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {processing.message}
      </p>
      {processing.error && <ErrorState message={processing.error} />}
      <dialog
        ref={dialog}
        aria-labelledby="processing-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
      >
        <h3 id="processing-title" className="text-xl">
          {action === 'sync'
            ? 'Sync and analyze emails?'
            : 'Analyze stored emails?'}
        </h3>
        <p className="mt-3 text-sm text-muted">
          {action === 'sync'
            ? 'Up to 20 matching inbox messages will be saved in Neon. '
            : ''}
          Email text will be sent to the configured OpenRouter model provider.
          Its data policies apply. Completed work stays saved if you close the
          page.
        </p>
        {action === 'sync' && syncQuery && (
          <p className="mt-3 text-sm">Inbox filter: {syncQuery}</p>
        )}
        <div className="cluster mt-5 gap-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button onClick={start} disabled={disabled || busy}>
            Continue
          </Button>
        </div>
      </dialog>
    </div>
  )
}
