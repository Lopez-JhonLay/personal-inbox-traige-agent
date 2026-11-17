import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ApiError } from '../../services/api'
import {
  clearToasts,
  friendlyError,
  getToasts,
  notify,
  notifyAnalysis,
} from '../../notifications/toasts'

afterEach(() => {
  vi.useRealTimers()
})

it('shows a success at the shared notification region and automatically dismisses it', () => {
  vi.useFakeTimers()
  act(() => notify('success', 'Task updated', 'Marked as completed.'))
  const region = screen.getByRole('region', { name: 'Notifications' })
  expect(within(region).getByRole('status')).toHaveTextContent(
    'Marked as completed.',
  )
  act(() => vi.advanceTimersByTime(4499))
  expect(screen.getByText('Task updated')).toBeVisible()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByText('Task updated')).not.toBeInTheDocument()
})

it('uses a longer error timeout and allows immediate dismissal', () => {
  vi.useFakeTimers()
  act(() => notify('error', 'Please try again', 'Your saved work is safe.'))
  act(() => vi.advanceTimersByTime(5000))
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Your saved work is safe.',
  )
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  act(() => vi.advanceTimersByTime(10000))
  expect(getToasts()).toHaveLength(0)
})

it('pauses the remaining timeout while hovered or keyboard focused', () => {
  vi.useFakeTimers()
  act(() => notify('success', 'Saved'))
  const card = screen.getByRole('status')
  act(() => vi.advanceTimersByTime(1000))
  fireEvent.mouseEnter(card)
  act(() => vi.advanceTimersByTime(10000))
  expect(card).toBeVisible()
  const close = screen.getByRole('button', { name: 'Dismiss notification' })
  act(() => close.focus())
  fireEvent.mouseLeave(card)
  act(() => vi.advanceTimersByTime(10000))
  expect(card).toBeVisible()
  act(() => close.blur())
  act(() => vi.advanceTimersByTime(3499))
  expect(card).toBeVisible()
  act(() => vi.advanceTimersByTime(1))
  expect(screen.queryByText('Saved')).not.toBeInTheDocument()
})

it('deduplicates matching messages, caps the stack, and clears all account notices', () => {
  act(() => {
    notify('success', 'First')
    notify('success', 'First')
    notify('success', 'Second')
    notify('warning', 'Third')
    notify('info', 'Fourth')
  })
  expect(getToasts()).toHaveLength(3)
  expect(screen.queryByText('First')).not.toBeInTheDocument()
  act(() => clearToasts())
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})

it('turns service failures into understandable recovery advice without raw technical text', () => {
  const message = friendlyError(
    new ApiError('The AI service is unavailable.', 'AI_UNAVAILABLE', 503),
  )
  expect(message).toContain('Please try again in a moment')
  expect(message).toContain('saved emails are safe')
  expect(friendlyError(new Error('Stack trace secret'))).not.toContain(
    'Stack trace',
  )
  expect(friendlyError(new ApiError('Try again.', '__proto__'))).toBe(
    'Try again.',
  )
})

it('combines successful analysis and task outcomes into one notification', () => {
  act(() =>
    notifyAnalysis({
      analysis: { id: 'one', status: 'completed', model_identifier: null },
      reused: false,
      auto_action: { status: 'created' },
    }),
  )
  expect(getToasts()).toHaveLength(1)
  expect(screen.getByRole('status')).toHaveTextContent(
    'A new Pending task is ready in Actions.',
  )
})

it('preserves the analysis success in an automation warning', () => {
  act(() =>
    notifyAnalysis({
      analysis: { id: 'one', status: 'completed', model_identifier: null },
      reused: false,
      auto_action: { status: 'unavailable', error_code: 'AI_TIMEOUT' },
    }),
  )
  expect(screen.getByRole('status')).toHaveTextContent('Analysis saved')
  expect(screen.getByRole('status')).toHaveTextContent(
    'you can still use Add to Actions',
  )
})

it('pauses the timeout while the page is hidden', () => {
  vi.useFakeTimers()
  act(() => notify('success', 'Ready'))
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(10000))
  expect(screen.getByText('Ready')).toBeVisible()
  hidden.mockReturnValue(false)
  fireEvent(document, new Event('visibilitychange'))
  act(() => vi.advanceTimersByTime(4500))
  expect(screen.queryByText('Ready')).not.toBeInTheDocument()
  hidden.mockRestore()
})

it('keeps an error toast dismissible within an open dialog and returns it to the page on close', async () => {
  render(
    <dialog open aria-label="Add task">
      <p>Task form</p>
    </dialog>,
  )
  act(() => notify('error', 'Could not save', 'Please try again.'))
  const dialog = screen.getByRole('dialog', { name: 'Add task' })
  await waitFor(() =>
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Please try again.',
    ),
  )
  act(() => dialog.removeAttribute('open'))
  await waitFor(() =>
    expect(screen.getByRole('alert').closest('dialog')).toBeNull(),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
