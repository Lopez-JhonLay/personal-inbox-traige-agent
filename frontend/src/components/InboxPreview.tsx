import { Check, ChevronRight, CircleCheck, Copy, Reply, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { demoMessages } from '../services/demoInbox'
import type { DemoMessage } from '../types/demo'

type Filter = 'all' | 'priority' | 'reply'
const filters: { id: Filter; label: string; count: number }[] = [
  { id: 'all', label: 'All mail', count: demoMessages.length },
  {
    id: 'priority',
    label: 'Priority',
    count: demoMessages.filter((message) => message.priority === 'High').length,
  },
  {
    id: 'reply',
    label: 'Reply needed',
    count: demoMessages.filter((message) => message.needsReply).length,
  },
]
const avatarColors = {
  Work: 'bg-accent-soft text-accent',
  Finance: 'bg-warning-soft text-warning',
  Newsletter: 'bg-success-soft text-success',
}

export function InboxPreview() {
  const [filter, setFilter] = useState<Filter>('all')
  const [selected, setSelected] = useState<DemoMessage>(demoMessages[0])
  const [reviewed, setReviewed] = useState<string[]>([])
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const messages = demoMessages.filter(
    (message) =>
      filter === 'all' ||
      (filter === 'priority'
        ? message.priority === 'High'
        : message.needsReply),
  )

  function openMessage(message: DemoMessage) {
    setSelected(message)
    setCopyStatus('idle')
    dialog.current?.showModal()
  }
  async function copyReply() {
    if (!selected.draft) return
    try {
      await navigator.clipboard.writeText(selected.draft)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  return (
    <div id="sample-inbox" className="scroll-mt-6">
      <p id="demo-notice" className="mb-3 text-xs leading-relaxed text-muted">
        <strong className="font-semibold text-ink">Interactive demo.</strong>{' '}
        Sample emails, no Gmail connection.
      </p>
      <section
        aria-label="Inbox demo"
        aria-describedby="demo-notice"
        className="surface surface-raised overflow-hidden p-0! motion-enter"
      >
        <div className="flex items-center justify-between border-b-2 border-line-strong px-5 py-5 md:px-6">
          <h2 className="text-[1.55rem] tracking-tight">Inbox</h2>
          <span className="text-xs text-muted">
            {demoMessages.length} messages
          </span>
        </div>
        <div className="px-5 md:px-6">
          <fieldset
            className="my-5 flex flex-wrap gap-2"
            aria-label="Filter emails"
          >
            {filters.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-control border px-3 text-xs font-semibold transition-colors motion-reduce:transition-none ${filter === item.id ? 'border-ink bg-ink text-surface' : 'border-line bg-surface text-muted hover:border-ink hover:text-ink'}`}
              >
                {item.label}
                <span
                  className={`grid size-5 place-items-center rounded-full text-[10px] ${filter === item.id ? 'bg-surface/20' : 'bg-surface-muted'}`}
                >
                  {item.count}
                </span>
              </button>
            ))}
          </fieldset>
        </div>
        <div
          className="h-[28rem] overflow-y-auto overscroll-contain px-2 pb-3 [scrollbar-gutter:stable] sm:h-96"
          aria-live="polite"
        >
          {messages.map((message) => (
            <button
              type="button"
              key={message.id}
              onClick={() => openMessage(message)}
              className="group flex w-full items-start gap-3 rounded-control px-3 py-4 text-left transition-colors hover:bg-paper focus-visible:-outline-offset-4 motion-reduce:transition-none md:px-4"
              aria-label={`Open email: ${message.subject}`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-control border border-current/20 text-xs font-bold ${avatarColors[message.category]}`}
              >
                {message.initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold">
                    {message.sender}
                  </span>
                  <span className="shrink-0 text-[10px] text-muted">
                    {message.time}
                  </span>
                </span>
                <span className="mt-1 block text-sm font-bold tracking-tight">
                  {message.subject}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted">
                  {message.preview}
                </span>
                {(message.priority === 'High' ||
                  message.needsReply ||
                  reviewed.includes(message.id)) && (
                  <span className="mt-2.5 flex flex-wrap items-center gap-2">
                    {message.priority === 'High' && (
                      <span className="rounded-md border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                        High priority
                      </span>
                    )}
                    {message.needsReply && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-accent">
                        <Reply aria-hidden="true" className="size-3" />
                        Reply needed
                      </span>
                    )}
                    {reviewed.includes(message.id) && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                        <Check aria-hidden="true" className="size-3" />
                        Reviewed
                      </span>
                    )}
                  </span>
                )}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="mt-1 size-4 text-muted"
              />
            </button>
          ))}
        </div>
      </section>
      <dialog
        ref={dialog}
        aria-labelledby="email-title"
        className="dialog-surface surface fixed inset-0 m-auto max-h-[85svh] w-[calc(100%-2rem)] max-w-[38rem] overflow-y-auto p-6 md:p-8"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-caption font-semibold text-muted">
            {selected.category}
          </span>
          <button
            type="button"
            className="button button-quiet button-icon shrink-0"
            aria-label="Close email"
            onClick={() => dialog.current?.close()}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        <h2 id="email-title" className="text-heading">
          {selected.subject}
        </h2>
        <p className="mt-2 text-caption text-muted">From {selected.sender}</p>
        <div className="mt-6 stack gap-5">
          <section>
            <h3 className="mb-2 text-base font-bold">Summary</h3>
            <p className="text-sm text-muted">{selected.summary}</p>
          </section>
          <section className="rounded-control border border-line bg-paper p-4">
            <h3 className="mb-2 text-base font-bold">Suggested next step</h3>
            <p className="text-sm">{selected.action}</p>
          </section>
          {selected.draft && (
            <section>
              <h3 className="mb-2 text-base font-bold">Suggested reply</h3>
              <p className="select-text rounded-control border border-line p-4 text-sm text-muted">
                {selected.draft}
              </p>
              <button
                type="button"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent underline underline-offset-4"
                onClick={copyReply}
              >
                <Copy aria-hidden="true" className="size-4" />
                Copy reply
              </button>
            </section>
          )}
          <p
            role="status"
            className={
              copyStatus === 'idle'
                ? 'sr-only'
                : `text-caption ${copyStatus === 'copied' ? 'text-success' : 'text-muted'}`
            }
          >
            {copyStatus === 'copied'
              ? 'Reply copied.'
              : copyStatus === 'failed'
                ? 'Couldn’t copy. Select the text to copy it manually.'
                : ''}
          </p>
          <button
            type="button"
            className="button w-full"
            onClick={() =>
              setReviewed((current) =>
                current.includes(selected.id)
                  ? current.filter((id) => id !== selected.id)
                  : [...current, selected.id],
              )
            }
          >
            {reviewed.includes(selected.id) ? (
              <CircleCheck aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {reviewed.includes(selected.id) ? 'Undo review' : 'Mark reviewed'}
          </button>
        </div>
      </dialog>
    </div>
  )
}
