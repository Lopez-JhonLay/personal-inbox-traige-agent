import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { AddAction } from '../components/AddAction'
import { authKey, clearPrivateCache, emailKeys } from '../query/queryClient'
import { createAction, listActions, updateAction } from '../services/actions'
import { getConnectionStatus } from '../services/auth'
import { ApiError } from '../services/api'
import { deferred, harness, testAuth } from '../test/helpers'
import type { ActionItem } from '../types/api'
import ActionsPage from './ActionsPage'

vi.mock('../services/actions', () => ({
  createAction: vi.fn(),
  listActions: vi.fn(),
  updateAction: vi.fn(),
}))
vi.mock('../services/auth', () => ({ getConnectionStatus: vi.fn() }))
const action: ActionItem = {
  id: 'task',
  email_id: 'email',
  description: 'Review proposal',
  due_date: '2026-11-20',
  status: 'pending',
  email_subject: 'Proposal',
  email_sender: 'sender@example.invalid',
  created_at: '2026-11-17T00:00:00Z',
  updated_at: '2026-11-17T00:00:00Z',
}
beforeEach(() => {
  vi.mocked(getConnectionStatus).mockResolvedValue(testAuth)
  vi.mocked(listActions).mockResolvedValue({
    actions: [action],
    total: 21,
    limit: 20,
    offset: 0,
  })
})

function tracker(url = '/actions', auth = testAuth) {
  const { client, wrapper } = harness(auth)
  render(
    <MemoryRouter initialEntries={[url]}>
      <ActionsPage />
    </MemoryRouter>,
    { wrapper },
  )
  return client
}

it('defaults to Pending, displays the associated email and date, and paginates/filters', async () => {
  const user = userEvent.setup()
  tracker()
  expect(await screen.findByText('Review proposal')).toBeVisible()
  expect(screen.getByRole('link', { name: 'Proposal' })).toHaveAttribute(
    'href',
    '/dashboard?email=email',
  )
  expect(screen.getByText(/Due .*2026/)).toBeVisible()
  expect(listActions).toHaveBeenCalledWith(
    { status: 'pending', offset: 0 },
    expect.any(AbortSignal),
  )
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(listActions).toHaveBeenCalledWith(
      { status: 'pending', offset: 20 },
      expect.any(AbortSignal),
    ),
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Action status' }),
    'all',
  )
  await waitFor(() =>
    expect(listActions).toHaveBeenCalledWith(
      { status: undefined, offset: 0 },
      expect.any(AbortSignal),
    ),
  )
})

it('keeps status unchanged on failure and updates it after a successful save', async () => {
  const user = userEvent.setup()
  vi.mocked(updateAction).mockRejectedValueOnce(
    new ApiError('Try again.', 'DATABASE_UNAVAILABLE', 503),
  )
  const client = tracker('/actions?status=all')
  client.setQueryData(emailKeys.overview('user-a'), { pending_action_count: 1 })
  const select = await screen.findByRole('combobox', {
    name: 'Status for Review proposal',
  })
  await user.selectOptions(select, 'completed')
  expect(await screen.findByText(/save or load your changes/)).toBeVisible()
  expect(select).toHaveValue('pending')
  const pending = deferred<ActionItem>()
  vi.mocked(updateAction).mockReturnValueOnce(pending.promise)
  await user.selectOptions(select, 'in_progress')
  expect(select).toBeDisabled()
  vi.mocked(listActions).mockResolvedValue({
    actions: [{ ...action, status: 'in_progress' }],
    total: 1,
    limit: 20,
    offset: 0,
  })
  await act(async () => pending.resolve({ ...action, status: 'in_progress' }))
  expect(await screen.findByText('Marked as in progress.')).toBeVisible()
  expect(select).toHaveValue('in_progress')
  expect(updateAction).toHaveBeenLastCalledWith(
    'task',
    'in_progress',
    'synthetic-csrf',
  )
  expect(
    client.getQueryState(emailKeys.overview('user-a'))?.isInvalidated,
  ).toBe(true)
})

it('allows saved task changes when Gmail needs reconnection and clears private action data', async () => {
  const user = userEvent.setup()
  const client = tracker('/actions', {
    ...testAuth,
    connection_status: 'reauthorization_required',
  })
  vi.mocked(updateAction).mockResolvedValue({ ...action, status: 'dismissed' })
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Status for Review proposal' }),
    'dismissed',
  )
  await waitFor(() => expect(updateAction).toHaveBeenCalled())
  await act(async () => {
    await clearPrivateCache(client, 'user-a')
  })
  expect(client.getQueriesData({ queryKey: emailKeys.all('user-a') })).toEqual(
    [],
  )
})

it('shows list errors with retry and the empty state', async () => {
  const user = userEvent.setup()
  vi.mocked(listActions).mockRejectedValueOnce(
    new ApiError('Cannot load actions.', 'NETWORK_ERROR'),
  )
  tracker()
  expect(await screen.findByText('Cannot load actions.')).toBeVisible()
  vi.mocked(listActions).mockResolvedValue({
    actions: [],
    total: 0,
    limit: 20,
    offset: 0,
  })
  await user.click(screen.getByRole('button', { name: /retry/i }))
  expect(await screen.findByText('No matching actions')).toBeVisible()
})

it('reviews prefilled actions, retains input on error, then reports an existing completed task', async () => {
  const user = userEvent.setup()
  const { client, wrapper } = harness()
  render(
    <MemoryRouter>
      <AddAction
        userId="user-a"
        emailId="email"
        description="Review proposal"
        dueDate="2026-11-20"
      />
    </MemoryRouter>,
    { wrapper },
  )
  await user.click(screen.getByRole('button', { name: 'Add to Actions' }))
  const description = screen.getByRole('textbox', { name: 'Description' })
  expect(description).toHaveValue('Review proposal')
  expect(screen.getByLabelText('Due date (optional)')).toHaveValue('2026-11-20')
  await user.clear(description)
  await user.type(description, 'Read proposal')
  vi.mocked(createAction).mockRejectedValueOnce(
    new ApiError('Could not save.', 'NETWORK_ERROR'),
  )
  await user.click(screen.getByRole('button', { name: 'Add action' }))
  expect(
    await screen.findByText(/Check your connection and try again/),
  ).toBeVisible()
  expect(description).toHaveValue('Read proposal')
  vi.mocked(createAction).mockResolvedValue({
    action: { ...action, status: 'completed' },
    reused: true,
  })
  client.setQueryData(authKey, { ...testAuth, csrf_token: 'new-csrf' })
  await user.click(screen.getByRole('button', { name: 'Add action' }))
  expect(await screen.findByText('Already in Actions')).toBeVisible()
  expect(
    screen.getByText(/existing completed task was kept unchanged/),
  ).toBeVisible()
  expect(createAction).toHaveBeenLastCalledWith(
    { email_id: 'email', description: 'Read proposal', due_date: '2026-11-20' },
    'new-csrf',
  )
})

it('accepts a manual action without an AI recommendation and reports creation', async () => {
  const user = userEvent.setup()
  const { wrapper } = harness()
  vi.mocked(createAction).mockResolvedValue({ action, reused: false })
  render(
    <MemoryRouter>
      <AddAction userId="user-a" emailId="email" description="" />
    </MemoryRouter>,
    { wrapper },
  )
  await user.click(screen.getByRole('button', { name: 'Add to Actions' }))
  expect(screen.getByRole('button', { name: 'Add action' })).toBeDisabled()
  await user.type(
    screen.getByRole('textbox', { name: 'Description' }),
    'Review proposal',
  )
  await user.click(screen.getByRole('button', { name: 'Add action' }))
  expect(await screen.findByText('Task added')).toBeVisible()
  expect(createAction).toHaveBeenLastCalledWith(
    { email_id: 'email', description: 'Review proposal', due_date: null },
    'synthetic-csrf',
  )
})

it('offers one-click completion and hides pagination for a single page', async () => {
  const user = userEvent.setup()
  vi.mocked(listActions).mockResolvedValue({
    actions: [action],
    total: 1,
    limit: 20,
    offset: 0,
  })
  vi.mocked(updateAction).mockResolvedValue({ ...action, status: 'completed' })
  tracker('/actions?status=all')
  await user.click(
    await screen.findByRole('button', {
      name: 'Mark task complete: Review proposal',
    }),
  )
  await waitFor(() =>
    expect(updateAction).toHaveBeenCalledWith(
      'task',
      'completed',
      'synthetic-csrf',
    ),
  )
  expect(
    screen.queryByRole('navigation', { name: 'Action pages' }),
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Notifications' }),
  ).toHaveTextContent('Task updated')
})

it('drops task notifications on account cleanup and ignores a late success from the old account', async () => {
  const user = userEvent.setup()
  const pending = deferred<ActionItem>()
  vi.mocked(updateAction).mockReturnValueOnce(pending.promise)
  const client = tracker('/actions?status=all')
  await user.selectOptions(
    await screen.findByRole('combobox', { name: 'Status for Review proposal' }),
    'completed',
  )
  await act(async () => {
    client.setQueryData(authKey, { ...testAuth, user_id: 'user-b' })
    await clearPrivateCache(client, 'user-a')
    pending.resolve({ ...action, status: 'completed' })
  })
  expect(screen.queryByText('Task updated')).not.toBeInTheDocument()
})
