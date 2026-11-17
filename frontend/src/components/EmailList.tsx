import type { StoredEmail } from '../types/api'
import { formatTimestamp } from '../utils/dates'
import { analysisLabels } from '../utils/emailStatus'
import { Badge } from './ui/Badge'

export function EmailCard({
  email,
  timezone,
  selected,
  onOpen,
}: {
  email: StoredEmail
  timezone: string
  selected: boolean
  onOpen: () => void
}) {
  const analysis = email.latest_completed_analysis
  return (
    <article
      className={`min-w-0 border-l-4 ${selected ? 'border-ink bg-highlight' : 'border-transparent bg-surface hover:bg-paper'}`}
    >
      <button
        type="button"
        aria-label={email.subject || '(No subject)'}
        aria-current={selected ? 'true' : undefined}
        onClick={onOpen}
        className="block w-full cursor-pointer p-4 text-left"
      >
        <span className="block truncate text-xs text-muted">
          {email.sender || 'Unknown sender'}
        </span>
        <span className="mt-1 block break-words text-sm font-semibold">
          {email.subject || '(No subject)'}
        </span>
        <span className="mt-2 line-clamp-2 text-sm text-muted">
          {analysis?.summary || 'Summary will appear after analysis.'}
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-2">
          {analysis?.priority && (
            <Badge tone={analysis.priority === 'High' ? 'warning' : 'neutral'}>
              {analysis.priority}
            </Badge>
          )}
          {analysis?.reply_needed && <Badge>Needs reply</Badge>}
          {email.analysis_status !== 'completed' && (
            <Badge
              tone={email.analysis_status === 'failed' ? 'warning' : 'neutral'}
            >
              {analysisLabels[email.analysis_status]}
            </Badge>
          )}
        </span>
        <span className="mt-2 block text-xs text-muted">
          {formatTimestamp(email.received_at, timezone)}
        </span>
      </button>
    </article>
  )
}

export function EmailList({
  emails,
  timezone,
  selectedId,
  onOpen,
}: {
  emails: StoredEmail[]
  timezone: string
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  return (
    <div className="divide-y divide-line">
      {emails.map((email) => (
        <EmailCard
          key={email.id}
          email={email}
          timezone={timezone}
          selected={email.id === selectedId}
          onOpen={() => onOpen(email.id)}
        />
      ))}
    </div>
  )
}
