import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Check, CircleAlert, Info, X } from 'lucide-react'
import {
  dismissToast,
  getToasts,
  subscribeToasts,
  type Toast,
} from '../../notifications/toasts'

export function ToastViewport() {
  const items = useSyncExternalStore(subscribeToasts, getToasts)
  const region = useRef<HTMLElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement>(document.body)
  useEffect(() => {
    // Keep controls inside the modal's focus boundary, rather than in its inert background.
    const update = () => {
      const dialogs =
        document.querySelectorAll<HTMLDialogElement>('dialog[open]')
      setPortalTarget(dialogs.item(dialogs.length - 1) ?? document.body)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    // A manual popover keeps notifications above native dialogs without trapping focus.
    const element = region.current
    if (!element || element.parentElement !== portalTarget) return
    if (!element.showPopover) element.removeAttribute('popover')
    if (element.showPopover && items.length) {
      element.hidePopover()
      element.showPopover()
    } else if (!items.length) element.hidePopover?.()
  }, [items, portalTarget])
  return createPortal(
    <section
      ref={region}
      popover="manual"
      aria-label="Notifications"
      className="toast-viewport"
    >
      {items.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </section>,
    portalTarget,
  )
}

function ToastCard({ toast }: { toast: Toast }) {
  const card = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(document.hidden)
  const remaining = useRef(toast.duration)
  const paused = hovered || focused || hidden
  useEffect(() => {
    const element = card.current
    if (!element) return
    const enter = () => setHovered(true)
    const leave = () => setHovered(false)
    const focus = () => setFocused(true)
    const blur = (event: FocusEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !element.contains(event.relatedTarget)
      )
        setFocused(false)
    }
    element.addEventListener('mouseenter', enter)
    element.addEventListener('mouseleave', leave)
    element.addEventListener('focusin', focus)
    element.addEventListener('focusout', blur)
    return () => {
      element.removeEventListener('mouseenter', enter)
      element.removeEventListener('mouseleave', leave)
      element.removeEventListener('focusin', focus)
      element.removeEventListener('focusout', blur)
    }
  }, [])
  useEffect(() => {
    const change = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])
  useEffect(() => {
    if (paused) return
    const started = Date.now()
    const timer = window.setTimeout(
      () => dismissToast(toast.id),
      remaining.current,
    )
    return () => {
      window.clearTimeout(timer)
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      )
    }
  }, [paused, toast.id])
  const Icon =
    toast.tone === 'success'
      ? Check
      : toast.tone === 'info'
        ? Info
        : CircleAlert
  return (
    <div
      ref={card}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      className={`toast-card toast-${toast.tone} motion-enter`}
    >
      <span className="toast-icon">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-muted hover:text-ink"
        onClick={() => dismissToast(toast.id)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
      <span
        className="toast-progress"
        aria-hidden="true"
        style={{
          animationDuration: `${toast.duration}ms`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />
    </div>
  )
}
