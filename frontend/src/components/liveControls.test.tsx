import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { authKey, emailKeys, anonymousStatus } from '../query/queryClient'
import { ApiError } from '../services/api'
import { disconnectGmail, getConnectionStatus } from '../services/auth'
import {
  analyzeStoredEmail,
  listStoredEmails,
  syncInbox,
} from '../services/emails'
import { deferred, harness, testAuth, testSync } from '../test/helpers'
import { GmailConnection } from './GmailConnection'
import { GoogleSignInButton } from './GoogleSignIn'
import { InboxProcessing } from './InboxProcessing'
import { Button } from './ui/Button'

vi.mock('../services/auth', () => ({
  getConnectionStatus: vi.fn(),
  disconnectGmail: vi.fn(),
  googleConnectUrl: () => '/api/auth/google',
}))
vi.mock('../services/emails', () => ({
  listStoredEmails: vi.fn(),
  syncInbox: vi.fn(),
  analyzeStoredEmail: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(getConnectionStatus).mockResolvedValue(testAuth)
  vi.mocked(listStoredEmails).mockResolvedValue({
    emails: [],
    total: 0,
    limit: 1,
    offset: 0,
  })
})

it('shows loading before displaying account information', async () => {
  const loading = deferred<typeof testAuth>()
  vi.mocked(getConnectionStatus).mockReturnValue(loading.promise)
  const { wrapper } = harness(null)
  render(<GmailConnection />, { wrapper })
  expect(screen.getByText('Checking connection...')).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Sync inbox' }),
  ).not.toBeInTheDocument()
  await act(async () => {
    loading.resolve(testAuth)
  })
  expect(
    await screen.findByText(`Signed in as ${testAuth.email}`),
  ).toBeInTheDocument()
})

it('offers connection only after an anonymous session is known', () => {
  const { wrapper } = harness(anonymousStatus())
  render(<GoogleSignInButton />, { wrapper })
  expect(
    screen.getByRole('link', { name: 'Continue with Google' }),
  ).toHaveAttribute('href', '/api/auth/google')
  expect(listStoredEmails).not.toHaveBeenCalled()
})

it('shows a retryable auth error without treating a network failure as sign-out', async () => {
  const { client, wrapper } = harness()
  render(<GmailConnection />, { wrapper })
  vi.mocked(getConnectionStatus).mockRejectedValue(
    new ApiError('Unavailable.', 'NETWORK_ERROR'),
  )
  await act(async () => {
    await client.invalidateQueries({ queryKey: authKey })
  })
  expect(
    await screen.findByText('Gmail access status is unavailable.'),
  ).toBeInTheDocument()
  expect(screen.getByText(`Signed in as ${testAuth.email}`)).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Sync inbox' }),
  ).not.toBeInTheDocument()
})

it('hides irrelevant recovery controls and requires confirmation before sync', async () => {
  const user = userEvent.setup()
  const { wrapper } = harness()
  render(
    <InboxProcessing
      userId="user-a"
      syncQuery={testAuth.sync_query}
      onBusyChange={vi.fn()}
    />,
    { wrapper },
  )
  expect(screen.getByRole('button', { name: 'Sync inbox' })).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Continue analysis' }),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sync inbox' }))
  const modal = screen.getByRole('dialog', { name: 'Sync and analyze emails?' })
  expect(
    within(modal).getByText(/Your email text is shared with our AI service/),
  ).toBeInTheDocument()
  expect(syncInbox).not.toHaveBeenCalled()
  await user.click(within(modal).getByRole('button', { name: 'Cancel' }))
  expect(modal).not.toHaveAttribute('open')
  expect(syncInbox).not.toHaveBeenCalled()
})

it('keeps cached counts visible on failure, and Retry only refreshes reads', async () => {
  const user = userEvent.setup()
  vi.mocked(listStoredEmails).mockImplementation(async (status) => ({
    emails: [],
    total: status === 'pending' ? 2 : 0,
    limit: 1,
    offset: 0,
  }))
  const { client, wrapper } = harness()
  render(
    <InboxProcessing
      userId="user-a"
      syncQuery={testAuth.sync_query}
      onBusyChange={vi.fn()}
    />,
    { wrapper },
  )
  await screen.findByText('2 unfinished analyses')
  vi.mocked(listStoredEmails).mockRejectedValue(
    new ApiError('Unavailable.', 'NETWORK_ERROR'),
  )
  await act(async () => {
    await client.invalidateQueries({ queryKey: emailKeys.counts('user-a') })
  })
  expect(
    screen.getByRole('region', { name: 'Unfinished analyses' }),
  ).toHaveTextContent('2 unfinished analyses')
  expect(
    await screen.findByText(
      'Could not refresh processing counts. Saved progress is unchanged.',
    ),
  ).toBeInTheDocument()
  vi.mocked(listStoredEmails).mockResolvedValue({
    emails: [],
    total: 0,
    limit: 1,
    offset: 0,
  })
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  await waitFor(() =>
    expect(
      screen.queryByText(
        'Could not refresh processing counts. Saved progress is unchanged.',
      ),
    ).not.toBeInTheDocument(),
  )
  expect(syncInbox).not.toHaveBeenCalled()
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('supports keyboard cancellation of the disconnect confirmation', async () => {
  const user = userEvent.setup()
  const { wrapper } = harness()
  render(<GmailConnection />, { wrapper })
  await user.click(screen.getByRole('button', { name: 'Remove Gmail access' }))
  const modal = screen.getByRole('dialog', { name: 'Remove Gmail access?' })
  expect(within(modal).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(modal).not.toHaveAttribute('open')
  expect(disconnectGmail).not.toHaveBeenCalled()
})

it('disables busy disconnect controls and removes private processing state on success', async () => {
  const user = userEvent.setup()
  const disconnecting = deferred<boolean>()
  vi.mocked(disconnectGmail).mockReturnValue(disconnecting.promise)
  const { wrapper } = harness()
  render(<GmailConnection />, { wrapper })
  expect(screen.getByText(`Signed in as ${testAuth.email}`)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Remove Gmail access' }))
  const modal = screen.getByRole('dialog', { name: 'Remove Gmail access?' })
  await user.click(
    within(modal).getByRole('button', { name: 'Remove access and log out' }),
  )
  expect(
    await within(modal).findByRole('button', { name: 'Removing access...' }),
  ).toBeDisabled()
  expect(within(modal).getByRole('button', { name: 'Cancel' })).toBeDisabled()
  await act(async () => {
    disconnecting.resolve(true)
  })
  expect(
    await screen.findByText('Gmail access removed. You are logged out.'),
  ).toBeInTheDocument()
  expect(screen.queryByText('Process your inbox')).not.toBeInTheDocument()
})

it('reusable buttons are keyboard accessible and expose their busy state', async () => {
  const user = userEvent.setup()
  const clicked = vi.fn()
  render(
    <>
      <Button onClick={clicked}>Ready</Button>
      <Button busy>Working</Button>
    </>,
  )
  await user.tab()
  expect(screen.getByRole('button', { name: 'Ready' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(clicked).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: 'Working' })).toHaveAttribute(
    'aria-busy',
    'true',
  )
})

it('a confirmed sync with no pending IDs does not invoke analysis', async () => {
  const user = userEvent.setup()
  vi.mocked(syncInbox).mockResolvedValue({
    ...testSync,
    imported: 0,
    pending_email_ids: [],
  })
  const { wrapper } = harness()
  render(
    <InboxProcessing
      userId="user-a"
      syncQuery={testAuth.sync_query}
      onBusyChange={vi.fn()}
    />,
    { wrapper },
  )
  await user.click(screen.getByRole('button', { name: 'Sync inbox' }))
  await user.click(
    within(
      screen.getByRole('dialog', { name: 'Sync and analyze emails?' }),
    ).getByRole('button', { name: 'Sync and analyze' }),
  )
  await screen.findByText(/0 analyzed, 0 analysis failures in this run/)
  expect(syncInbox).toHaveBeenCalledTimes(1)
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})
