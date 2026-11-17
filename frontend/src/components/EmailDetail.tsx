import { useEffect, useRef } from 'react'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import {
  useEmailAnalyzing,
  useEmailDetail,
  useEmailMutations,
} from '../hooks/useEmails'
import { formatTimestamp } from '../utils/dates'
import { analysisLabels } from '../utils/emailStatus'
import { SuggestedReply } from './SuggestedReply'
import { AddAction } from './AddAction'
import { Badge } from './ui/Badge'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

export function EmailDetail({
  userId,
  id,
  timezone,
  disabled,
  onClose,
}: {
  userId: string
  id: string
  timezone: string
  disabled: boolean
  onClose: () => void
}) {
  const query = useEmailDetail(userId, id)
  const { analyze, reanalyze } = useEmailMutations(userId)
  const heading = useRef<HTMLHeadingElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
    if (window.matchMedia?.('(max-width: 67.999rem)').matches)
      heading.current?.scrollIntoView({ block: 'start' })
  }, [])
  const email = query.data
  const analysis = email?.latest_completed_analysis
  const mutation = analysis ? reanalyze : analyze
  const busy = useEmailAnalyzing(userId, id)
  const actionLabel = analysis ? 'Reanalyze' : 'Analyze email'
  return (
    <section
      className="flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface lg:min-h-0"
      aria-labelledby="email-detail-title"
    >
      <header className="shrink-0 border-b border-line bg-surface p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to inbox
        </button>
        <h2
          ref={heading}
          tabIndex={-1}
          id="email-detail-title"
          className="mt-2 break-words text-xl"
        >
          {email?.subject || 'Email details'}
        </h2>
        {email && (
          <>
            <p className="mt-2 break-words text-sm">
              {email.sender || 'Unknown sender'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatTimestamp(email.received_at, timezone)}
            </p>
            <div className="cluster mt-4 gap-2">
              {analysis?.priority && (
                <Badge
                  tone={analysis.priority === 'High' ? 'warning' : 'neutral'}
                >
                  {analysis.priority} priority
                </Badge>
              )}
              {analysis?.category && <Badge>{analysis.category}</Badge>}
              {analysis?.reply_needed !== undefined && (
                <Badge>
                  {analysis.reply_needed ? 'Reply needed' : 'No reply needed'}
                </Badge>
              )}
              {!busy && email.analysis_status !== 'completed' && (
                <Badge
                  tone={
                    email.analysis_status === 'failed' ? 'warning' : 'neutral'
                  }
                >
                  {analysisLabels[email.analysis_status]}
                </Badge>
              )}
            </div>
          </>
        )}
      </header>
      <div
        className={`theme-scrollbar min-h-0 flex-1 p-5 sm:p-6 lg:overflow-y-auto ${query.isPending ? 'flex flex-col' : ''}`}
      >
        {query.isPending && (
          <LoadingIndicator label="Loading email..." centered />
        )}
        {query.isError && (
          <ErrorState
            message={query.error.message}
            onRetry={() => {
              void query.refetch()
            }}
            retrying={query.isFetching}
          />
        )}
        {email && (
          <>
            {busy && (
              <div
                className="mb-5 rounded-control border border-line bg-accent-soft p-4"
                aria-busy="true"
              >
                <LoadingIndicator label="Analyzing this email…" />
                <p className="mt-2 text-xs text-muted">
                  This may take a moment. You can keep reading while we work.
                </p>
              </div>
            )}
            <h3 className="text-lg">Summary</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
              {analysis?.summary ||
                'No analysis yet. Continue analysis from the inbox, or analyze this email below.'}
            </p>
            {analysis?.deadline && (
              <div className="mt-5 rounded-control border border-line bg-highlight p-4">
                <h3 className="text-sm font-semibold">Deadline</h3>
                <p className="mt-1 text-sm">{analysis.deadline}</p>
                {analysis.deadline_text && (
                  <p className="mt-1 break-words text-xs text-muted">
                    {analysis.deadline_text}
                  </p>
                )}
              </div>
            )}
            {!analysis?.deadline && analysis?.deadline_text && (
              <p className="mt-4 text-sm">
                Deadline mentioned: {analysis.deadline_text}
              </p>
            )}
            {(analysis?.requested_action || analysis?.suggested_action) && (
              <section
                aria-label="Next steps"
                className="mt-5 space-y-4 border-t border-line pt-5"
              >
                {analysis.requested_action && (
                  <div>
                    <h3 className="text-sm font-semibold">
                      Requested by the sender
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {analysis.requested_action}
                    </p>
                  </div>
                )}
                {analysis.suggested_action && (
                  <div>
                    <h3 className="text-sm font-semibold">
                      Suggested next step
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {analysis.suggested_action}
                    </p>
                  </div>
                )}
              </section>
            )}
            <p className="mt-5 text-xs text-muted">
              AI suggestions. Check the original email before acting.
            </p>
            <AddAction
              userId={userId}
              emailId={id}
              description={
                analysis?.suggested_action || analysis?.requested_action || ''
              }
              dueDate={analysis?.deadline}
            />
            <details className="mt-5 rounded-control border border-line">
              <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold">
                Original email
              </summary>
              <p className="whitespace-pre-wrap break-words border-t border-line p-4 text-sm leading-relaxed">
                {email.body || 'No supported text content.'}
              </p>
            </details>
            {analysis?.draft_reply && (
              <SuggestedReply
                key={`${id}:${analysis.id}`}
                reply={analysis.draft_reply}
              />
            )}
            {analysis?.reply_needed && !analysis.draft_reply && !busy && (
              <p className="mt-3 text-sm text-muted">
                A suggested reply isn’t available. Your summary is saved. You
                can try analyzing this email again to request a reply.
              </p>
            )}
            <Button
              variant="secondary"
              className="mt-5 text-xs"
              busy={busy}
              disabled={disabled || busy}
              onClick={() => {
                mutation.reset()
                dialog.current?.showModal()
              }}
            >
              <RotateCcw
                className={`size-3.5 ${busy ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden="true"
              />
              {busy ? 'Analyzing…' : actionLabel}
            </Button>
          </>
        )}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="reanalyze-title"
        className="m-auto w-[calc(100%_-_2rem)] max-w-md rounded-panel border-2 border-ink bg-paper p-6 text-ink backdrop:bg-ink/40"
      >
        <h3 id="reanalyze-title" className="text-xl">
          {analysis ? 'Reanalyze this email?' : 'Analyze this email?'}
        </h3>
        <p className="mt-3 text-sm">
          {analysis
            ? 'Create a fresh summary and suggested reply for this email. Your current results stay available if it doesn’t finish.'
            : 'Get a summary, key details, and a suggested reply when one is needed.'}{' '}
          Your email text is shared with our AI service to do this. Nothing is
          sent to the sender. Clear requests may automatically become Pending
          tasks in Actions. Existing tasks stay unchanged.
        </p>
        <div className="cluster mt-5 gap-3">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </Button>
          <Button
            disabled={disabled || busy}
            onClick={() => {
              dialog.current?.close()
              mutation.mutate(id)
            }}
          >
            {analysis ? 'Reanalyze email' : 'Analyze email'}
          </Button>
        </div>
      </dialog>
    </section>
  )
}
