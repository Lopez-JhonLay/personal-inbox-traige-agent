import type { ReactNode } from 'react'

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const colors = {
    neutral: 'bg-paper',
    success: 'bg-success-soft',
    warning: 'bg-highlight',
  }
  return (
    <span
      className={`inline-flex rounded-control border border-line px-2 py-1 text-xs font-semibold text-ink ${colors[tone]}`}
    >
      {children}
    </span>
  )
}
