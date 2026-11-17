import { LoaderCircle } from 'lucide-react'

export function LoadingIndicator({
  label = 'Loading…',
  centered = false,
}: {
  label?: string
  centered?: boolean
}) {
  return (
    <p
      role="status"
      className={
        centered
          ? 'flex min-h-40 w-full flex-1 items-center justify-center text-muted'
          : 'inline-flex items-center gap-2 text-sm text-muted'
      }
    >
      <LoaderCircle
        aria-hidden="true"
        className={`${centered ? 'size-7' : 'size-4'} animate-spin motion-reduce:animate-none`}
      />
      <span className={centered ? 'sr-only' : undefined}>{label}</span>
    </p>
  )
}
