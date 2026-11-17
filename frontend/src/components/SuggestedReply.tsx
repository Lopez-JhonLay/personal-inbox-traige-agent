import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function SuggestedReply({ reply }: { reply: string }) {
  const [status, setStatus] = useState<
    'idle' | 'copying' | 'copied' | 'failed'
  >('idle')

  async function copyReply() {
    setStatus('copying')
    try {
      await navigator.clipboard.writeText(reply)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  return (
    <details className="mt-3 rounded-control border border-line">
      <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-semibold">
        Suggested reply
      </summary>
      <div className="relative border-t border-line">
        <button
          type="button"
          aria-label={
            status === 'copied' ? 'Reply copied' : 'Copy suggested reply'
          }
          title={status === 'copied' ? 'Copied!' : 'Copy reply'}
          disabled={status === 'copying'}
          onClick={() => void copyReply()}
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-control text-muted hover:bg-highlight hover:text-ink disabled:opacity-50"
        >
          {status === 'copied' ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
        <p className="whitespace-pre-wrap break-words p-4 pr-14 text-sm leading-relaxed">
          {reply}
        </p>
        <p
          role="status"
          className={
            status === 'failed' ? 'px-4 pb-3 text-xs text-muted' : 'sr-only'
          }
        >
          {status === 'copied' && 'Reply copied to clipboard.'}
          {status === 'failed' &&
            'Couldn’t copy. Please select and copy the reply.'}
        </p>
      </div>
    </details>
  )
}
