import { Button } from './Button'

export function ErrorState({
  message,
  onRetry,
  retrying = false,
}: {
  message: string
  onRetry?: () => void
  retrying?: boolean
}) {
  return (
    <div role="alert" className="mt-3 text-sm">
      <p>{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          className="mt-2 text-sm"
          onClick={onRetry}
          busy={retrying}
        >
          Retry
        </Button>
      )}
    </div>
  )
}
