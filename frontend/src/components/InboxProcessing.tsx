import { useCallback, useEffect, useRef, useState } from 'react'
import {
  analyzeStoredEmail,
  EmailApiError,
  listStoredEmails,
  syncInbox,
} from '../services/emails'

export function InboxProcessing({
  csrfToken,
  syncQuery,
  onBusyChange,
}: {
  csrfToken: string
  syncQuery: string
  onBusyChange: (busy: boolean) => void
}) {
  const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState({ pending: 0, completed: 0, failed: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [action, setAction] = useState<'sync' | 'pending' | 'failed'>('sync')
  const dialog = useRef<HTMLDialogElement>(null)
  const active = useRef(true)
  const running = useRef(false)

  const refreshCounts = useCallback(async () => {
    const [pending, processing, completed, failed] = await Promise.all([
      listStoredEmails('pending', 1),
      listStoredEmails('processing', 1),
      listStoredEmails('completed', 1),
      listStoredEmails('failed', 1),
    ])
    if (active.current)
      setCounts({
        pending: pending.total + processing.total,
        completed: completed.total,
        failed: failed.total,
      })
  }, [])

  useEffect(() => {
    active.current = true
    refreshCounts().catch(() => {
      if (active.current)
        setError(
          'Could not load stored processing counts. Reload to try again.',
        )
    })
    return () => {
      active.current = false
    }
  }, [refreshCounts])

  function confirm(next: typeof action) {
    setAction(next)
    dialog.current?.showModal()
  }

  async function run() {
    if (running.current) return
    running.current = true
    dialog.current?.close()
    setBusy(true)
    onBusyChange(true)
    setError('')
    setMessage('Preparing emails…')
    try {
      let ids: string[]
      let imported = ''
      if (action === 'sync') {
        const result = await syncInbox(csrfToken)
        imported = `${result.imported} imported, ${result.existing} already stored, ${result.failed} import failures, ${result.deferred} deferred. `
        if (result.errors.length) setError(result.errors[0].message)
        ids = result.pending_email_ids
        if (
          result.errors.some((item) =>
            [
              'GMAIL_RATE_LIMITED',
              'GMAIL_REAUTH_REQUIRED',
              'OPERATION_EXPIRED',
            ].includes(item.code),
          )
        )
          ids = []
      } else if (action === 'failed') {
        ids = (await listStoredEmails('failed')).emails.map((email) => email.id)
      } else {
        const [pending, processing] = await Promise.all([
          listStoredEmails('pending'),
          listStoredEmails('processing'),
        ])
        ids = [
          ...new Set(
            [...processing.emails, ...pending.emails].map((email) => email.id),
          ),
        ].slice(0, 20)
      }
      let done = 0
      let failed = 0
      for (const [index, id] of ids.entries()) {
        if (!active.current) break
        setMessage(`${imported}Analyzing ${index + 1} of ${ids.length}…`)
        try {
          await analyzeStoredEmail(id, csrfToken)
          done++
        } catch (cause) {
          failed++
          if (!(cause instanceof EmailApiError)) throw cause
          setError(cause.message)
          if (
            [
              'AI_RATE_LIMITED',
              'OPERATION_IN_PROGRESS',
              'OPERATION_EXPIRED',
              'AUTH_REQUIRED',
              'GMAIL_REAUTH_REQUIRED',
              'AI_NOT_CONFIGURED',
              'DATABASE_UNAVAILABLE',
              'NETWORK_ERROR',
            ].includes(cause.code)
          ) {
            setError(
              `${cause.message}${cause.retryAfter ? ` Retry after ${cause.retryAfter}.` : ''} Remaining work is saved.`,
            )
            break
          }
        }
      }
      if (active.current)
        setMessage(
          `${imported}${done} analyzed, ${failed} analysis failures in this run. Pending work can be continued below.`,
        )
    } catch (cause) {
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Processing failed. Please try again.',
        )
    } finally {
      running.current = false
      if (active.current) {
        setBusy(false)
        onBusyChange(false)
        await refreshCounts().catch(() =>
          setError('Could not refresh counts. Reload to check saved progress.'),
        )
      }
    }
  }

  return (
    <div className="mt-6 border-t border-line pt-5">
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
      <p className="mt-3 text-sm">
        {counts.pending} pending · {counts.completed} analyzed · {counts.failed}{' '}
        failed
      </p>
      <div className="cluster mt-4 gap-3">
        <button
          type="button"
          className="button text-sm"
          disabled={busy}
          onClick={() => confirm('sync')}
        >
          Sync Inbox
        </button>
        <button
          type="button"
          className="button button-secondary text-sm"
          disabled={busy || counts.pending === 0}
          onClick={() => confirm('pending')}
        >
          Continue analysis
        </button>
        <button
          type="button"
          className="button button-secondary text-sm"
          disabled={busy || counts.failed === 0}
          onClick={() => confirm('failed')}
        >
          Retry failed
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-sm">
        {message}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          {error}
        </p>
      )}
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
          <button
            type="button"
            className="button button-secondary"
            onClick={() => dialog.current?.close()}
          >
            Cancel
          </button>
          <button type="button" className="button" onClick={run}>
            Continue
          </button>
        </div>
      </dialog>
    </div>
  )
}
