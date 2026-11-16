import { LoaderCircle } from 'lucide-react'

export function LoadingIndicator({ label = 'Loading…' }: { label?: string }) {
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 text-sm text-muted"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-4 animate-spin motion-reduce:animate-none"
      />
      {label}
    </p>
  )
}
