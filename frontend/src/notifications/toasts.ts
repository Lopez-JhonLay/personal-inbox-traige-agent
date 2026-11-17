import { ApiError } from '../services/api'
import type { AnalysisResult } from '../types/api'

export type ToastTone = 'success' | 'error' | 'warning' | 'info'
export interface Toast {
  id: number
  tone: ToastTone
  title: string
  message: string
  duration: number
}

let items: Toast[] = []
let nextId = 0
const listeners = new Set<() => void>()
export const getToasts = () => items
export function subscribeToasts(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function publish(next: Toast[]) {
  items = next
  for (const listener of listeners) listener()
}
export function notify(tone: ToastTone, title: string, message = '') {
  if (
    items.some(
      (item) =>
        item.title === title && item.message === message && item.tone === tone,
    )
  )
    return
  publish(
    [
      ...items,
      {
        id: ++nextId,
        tone,
        title,
        message,
        duration: tone === 'success' ? 4500 : 7000,
      },
    ].slice(-3),
  )
}
export function dismissToast(id: number) {
  publish(items.filter((item) => item.id !== id))
}
export function clearToasts() {
  publish([])
}

const errorMessages: Record<string, string> = {
  AI_UNAVAILABLE:
    'We couldn’t reach the AI service. Please try again in a moment. Your saved emails are safe.',
  AI_TIMEOUT:
    'The AI is taking longer than usual. Please try again in a moment.',
  AI_RATE_LIMITED:
    'The AI service is busy right now. Give it a little time, then try again.',
  AI_INVALID_OUTPUT:
    'We couldn’t finish this analysis. Please try again; your previous results are still available.',
  AI_REFUSED:
    'We couldn’t analyze this email. You can still review it and add a task yourself.',
  AI_NOT_CONFIGURED:
    'AI analysis isn’t available right now. Please try again later.',
  NETWORK_ERROR:
    'We couldn’t connect to Mailkind. Check your connection and try again.',
  DATABASE_UNAVAILABLE:
    'We couldn’t save or load your changes right now. Please try again in a moment.',
  GMAIL_REAUTH_REQUIRED:
    'Your Gmail connection needs refreshing. Reconnect from Settings to continue.',
  AUTH_REQUIRED: 'Your session has ended. Please sign in again to continue.',
  CSRF_INVALID: 'Please refresh the page, then try again.',
  SESSION_CHANGED:
    'The signed-in account changed. Please refresh the page to continue.',
  OPERATION_IN_PROGRESS:
    'Your inbox is already being processed. Please wait for it to finish.',
  OPERATION_EXPIRED:
    'Processing stopped before it could finish. Your saved work is still available; please try again.',
}
export function friendlyError(error: unknown): string {
  if (error instanceof ApiError)
    return Object.hasOwn(errorMessages, error.code)
      ? errorMessages[error.code]
      : error.message
  return 'Something went wrong. Please try again.'
}

export function notifyAnalysis(result: AnalysisResult) {
  const task = result.auto_action
  if (task?.status === 'unavailable') {
    notify(
      'warning',
      'Analysis saved',
      task.error_code === 'AI_RATE_LIMITED'
        ? 'The AI is busy, so we couldn’t add a task automatically. You can add one yourself or try again later.'
        : 'We couldn’t add a task automatically. Your analysis is ready, and you can still use Add to Actions.',
    )
  } else {
    notify(
      'success',
      'Analysis saved',
      task?.status === 'created'
        ? 'A new Pending task is ready in Actions.'
        : task?.status === 'existing'
          ? 'Your existing task was kept unchanged.'
          : 'Your summary and suggested next steps are ready.',
    )
  }
}
