export function EmptyState({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div className="mt-3 rounded-control border border-line p-4 text-sm">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-muted">{message}</p>
    </div>
  )
}
