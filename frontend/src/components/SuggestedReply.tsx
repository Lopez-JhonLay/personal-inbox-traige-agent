import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { notify } from '../notifications/toasts'

export function SuggestedReply({ reply }: { reply: string }) {
  const [text, setText] = useState(reply)
  const [status, setStatus] = useState<
    'idle' | 'copying' | 'copied' | 'failed'
  >('idle')

  async function copyReply() {
    setStatus('copying')
    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
      notify('success', 'Reply copied', 'Your edited reply is ready to paste.')
    } catch {
      setStatus('failed')
      notify(
        'error',
        'Couldn’t copy the reply',
        'Please select the reply text and copy it manually.',
      )
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
          disabled={status === 'copying' || !text.trim()}
          onClick={() => void copyReply()}
          className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-control text-muted hover:bg-highlight hover:text-ink disabled:opacity-50"
        >
          {status === 'copied' ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <Copy className="size-4" aria-hidden="true" />
          )}
        </button>
        <label className="grid min-w-0 gap-3 p-4 text-sm">
          <span className="pr-10">AI-generated reply</span>
          <textarea
            value={text}
            rows={10}
            disabled={status === 'copying'}
            className="min-w-0 w-full resize-y rounded-control border border-line bg-paper p-3 leading-relaxed"
            onChange={(event) => {
              setText(event.target.value)
              setStatus('idle')
            }}
          />
        </label>
        <p className="px-4 pb-3 text-xs text-muted">
          Review before using. Edits are temporary and are not saved when you
          leave this email. Nothing is sent.
        </p>
      </div>
    </details>
  )
}
