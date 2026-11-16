import type { ComponentProps } from 'react'

export function Button({
  variant = 'primary',
  busy = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary'
  busy?: boolean
}) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={`button ${variant === 'secondary' ? 'button-secondary' : ''} ${className}`}
    />
  )
}
