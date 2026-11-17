import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { AppLayout } from '../components/AppLayout'
import { authKey, anonymousStatus, emailKeys } from '../query/queryClient'
import { ApiError } from '../services/api'
import { disconnectGmail, getConnectionStatus, logout } from '../services/auth'
import {
  analyzeStoredEmail,
  browseEmails,
  getEmail,
  getOverview,
  listStoredEmails,
  syncInbox,
} from '../services/emails'
import {
  deferred,
  harness,
  testAnalysis,
  testAuth,
  testSync,
} from '../test/helpers'
import type { EmailDetail, EmailPage, InboxOverview } from '../types/api'
import DashboardPage from './DashboardPage'
import SettingsPage from './SettingsPage'

vi.mock('../services/auth', () => ({
  getConnectionStatus: vi.fn(),
  disconnectGmail: vi.fn(),
  logout: vi.fn(),
  googleConnectUrl: () => '/api/auth/google',
}))
vi.mock('../services/emails', () => ({
  getOverview: vi.fn(),
  browseEmails: vi.fn(),
  getEmail: vi.fn(),
  listStoredEmails: vi.fn(),
  analyzeStoredEmail: vi.fn(),
  syncInbox: vi.fn(),
}))
const overview: InboxOverview = {
  email: testAuth.email ?? '',
  timezone: 'Asia/Manila',
  last_synced_at: null,
  analyzed_count: 5,
  high_priority_count: 2,
  reply_needed_count: 1,
  pending_action_count: 0,
}
const email: EmailDetail = {
  id: 'one',
  sender: 'Synthetic sender',
  subject: 'Review proposal',
  received_at: '2026-11-16T10:00:00Z',
  analysis_status: 'completed',
  body: '<img src=x onerror="alert(1)">Please review this document.',
  latest_completed_analysis: {
    id: 'analysis',
    summary: 'Please review the proposal.',
    priority: 'High',
    category: 'Work',
    deadline: '2026-11-19',
    reply_needed: true,
    draft_reply: 'Thanks for sharing.',
  },
}
const page: EmailPage = { emails: [email], total: 21, limit: 20, offset: 0 }

beforeEach(() => {
  vi.mocked(getConnectionStatus).mockResolvedValue(testAuth)
  vi.mocked(getOverview).mockResolvedValue(overview)
  vi.mocked(browseEmails).mockResolvedValue(page)
  vi.mocked(getEmail).mockResolvedValue(email)
  vi.mocked(listStoredEmails).mockResolvedValue({
    emails: [],
    total: 0,
    limit: 1,
    offset: 0,
  })
  vi.mocked(analyzeStoredEmail).mockResolvedValue(testAnalysis)
})

it('preserves the pending action filter across other filters and pagination, then clears it', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?has_pending_action=true&sort=received_asc')
  await screen.findByText('Review proposal')
  expect(screen.getByRole('combobox', { name: 'Actions' })).toHaveValue('true')
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Category' }),
    'Work',
  )
  await user.click(screen.getByRole('button', { name: 'Next' }))
  await waitFor(() =>
    expect(browseEmails).toHaveBeenLastCalledWith(
      expect.objectContaining({
        offset: 20,
        category: 'Work',
        has_pending_action: true,
      }),
      expect.any(AbortSignal),
    ),
  )
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    'has_pending_action=true',
  )
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/dashboard?sort=received_asc',
  )
  expect(screen.getByRole('combobox', { name: 'Actions' })).toHaveValue('')
})

function Location() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <>
      <output aria-label="Current URL">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate(-1)}>
        Browser back
      </button>
    </>
  )
}
function dashboard(url = '/dashboard', auth = testAuth) {
  const { client, wrapper } = harness(auth)
  render(
    <MemoryRouter initialEntries={[url]}>
      <Location />
      <Routes>
        <Route path="/" element={<p>Welcome to Mailkind</p>} />
        <Route element={<AppLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </MemoryRouter>,
    { wrapper },
  )
  return client
}

it('shows saved email information and overview without starting processing', async () => {
  dashboard()
  expect(await screen.findByText('Review proposal')).toBeInTheDocument()
  expect(screen.getByText('Please review the proposal.')).toBeInTheDocument()
  expect(
    within(screen.getByRole('article')).getByText('High'),
  ).toBeInTheDocument()
  expect(
    within(screen.getByRole('article')).getByText('Needs reply'),
  ).toBeInTheDocument()
  expect(screen.queryByText('completed')).not.toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Select an email' }),
  ).toBeInTheDocument()
  expect(screen.getByText(/No successful sync recorded/)).toBeInTheDocument()
  expect(syncInbox).not.toHaveBeenCalled()
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('synchronizes filters with the URL and resets the page before querying', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?offset=20&sort=received_asc')
  await screen.findByText('Review proposal')
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Reply' }),
    'true',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Priority' }),
    'High',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Category' }),
    'Work',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Analysis status' }),
    'completed',
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Sort' }),
    'priority_desc',
  )
  expect(screen.getByLabelText('Current URL')).not.toHaveTextContent(
    'offset=20',
  )
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    'reply_needed=true',
  )
  await waitFor(() =>
    expect(browseEmails).toHaveBeenLastCalledWith(
      {
        offset: 0,
        priority: 'High',
        category: 'Work',
        sort: 'priority_desc',
        reply_needed: true,
        analysis_status: 'completed',
      },
      expect.any(AbortSignal),
    ),
  )
  expect(syncInbox).not.toHaveBeenCalled()
})

it('paginates using server totals and preserves filters', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?priority=High')
  await screen.findByText('Review proposal')
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(await screen.findByText('Page 2 / 2 (21 emails)')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    'priority=High&offset=20',
  )
})

it('opens text-only details, preserves date-only deadlines, and returns to the list', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?priority=High')
  await user.click(
    await screen.findByRole('button', { name: 'Review proposal' }),
  )
  const detail = screen.getByRole('region', { name: 'Review proposal' })
  await user.click(within(detail).getByText('Original email'))
  expect(await within(detail).findByText(email.body ?? '')).toBeVisible()
  expect(detail.querySelector('img')).toBeNull()
  expect(within(detail).getByText('Nov 19, 2026')).toHaveAttribute(
    'datetime',
    '2026-11-19',
  )
  await user.click(within(detail).getByText('Suggested reply'))
  expect(within(detail).getByText('Thanks for sharing.')).toBeVisible()
  await user.click(
    within(detail).getByRole('button', { name: 'Back to inbox' }),
  )
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/dashboard?priority=High',
  )
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'Review proposal' }),
    ).toHaveFocus(),
  )
})

it('requires confirmation for forced reanalysis, disables sync, and refreshes results', async () => {
  const user = userEvent.setup()
  const pending = deferred<typeof testAnalysis>()
  vi.mocked(analyzeStoredEmail).mockReturnValue(pending.promise)
  dashboard('/dashboard?email=one')
  await user.click(await screen.findByRole('button', { name: 'Reanalyze' }))
  const modal = screen.getByRole('dialog', { name: 'Reanalyze this email?' })
  expect(
    within(modal).getByText(/Your email text is shared with our AI service/),
  ).toBeInTheDocument()
  expect(modal).not.toHaveTextContent('OpenRouter')
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
  await user.click(within(modal).getByRole('button', { name: 'Cancel' }))
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Reanalyze' }))
  await user.click(
    within(modal).getByRole('button', { name: 'Reanalyze email' }),
  )
  await waitFor(() =>
    expect(analyzeStoredEmail).toHaveBeenCalledWith(
      'one',
      'synthetic-csrf',
      true,
    ),
  )
  expect(screen.getByRole('button', { name: 'Sync inbox' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled()
  expect(screen.getByText('Analyzing this email…')).toBeVisible()
  expect(
    screen.getByRole('region', { name: 'Review proposal' }),
  ).toHaveTextContent('Please review the proposal.')
  await act(async () => {
    pending.resolve(testAnalysis)
  })
  await waitFor(() => expect(getOverview).toHaveBeenCalledTimes(2))
  await waitFor(() => expect(getEmail).toHaveBeenCalledTimes(2))
  await waitFor(() =>
    expect(screen.queryByText('Analyzing this email…')).not.toBeInTheDocument(),
  )
})

it('retains successful results when forced reanalysis fails', async () => {
  const user = userEvent.setup()
  vi.mocked(analyzeStoredEmail).mockRejectedValue(
    new ApiError('Analysis unavailable.', 'AI_INVALID_OUTPUT', 502),
  )
  dashboard('/dashboard?email=one')
  await user.click(await screen.findByRole('button', { name: 'Reanalyze' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Reanalyze email',
    }),
  )
  expect(
    await screen.findByText(
      /Please try again; your previous results are still available/,
    ),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('region', { name: 'Review proposal' }),
  ).toHaveTextContent('Please review the proposal.')
})

it('explains when a completed analysis has no suggested reply', async () => {
  const savedAnalysis = email.latest_completed_analysis
  if (!savedAnalysis) throw new Error('Missing test analysis')
  vi.mocked(getEmail).mockResolvedValue({
    ...email,
    latest_completed_analysis: {
      ...savedAnalysis,
      draft_reply: undefined,
    },
  })
  dashboard('/dashboard?email=one')
  expect(
    await screen.findByText(/A suggested reply isn’t available/),
  ).toBeVisible()
  expect(
    screen.getByRole('region', { name: 'Review proposal' }),
  ).toHaveTextContent('Please review the proposal.')
  expect(
    screen.queryByText('Suggested reply', { selector: 'summary' }),
  ).not.toBeInTheDocument()
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('displays the assembled reply with greeting, body, and closing', async () => {
  const savedAnalysis = email.latest_completed_analysis
  if (!savedAnalysis) throw new Error('Missing test analysis')
  const reply =
    'Hello Maya,\n\nThank you for the project proposal. Which section needs feedback?\n\nBest regards,'
  vi.mocked(getEmail).mockResolvedValue({
    ...email,
    latest_completed_analysis: {
      ...savedAnalysis,
      draft_reply: reply,
    },
  })
  dashboard('/dashboard?email=one')
  await userEvent.click(
    await screen.findByText('Suggested reply', { selector: 'summary' }),
  )
  expect(
    screen.getByRole('textbox', { name: 'AI-generated reply' }),
  ).toHaveValue(reply)
})

it('keeps analysis progress visible after reopening an email and hides the previous failure while working', async () => {
  const user = userEvent.setup()
  const pending = deferred<typeof testAnalysis>()
  vi.mocked(getEmail).mockResolvedValue({ ...email, analysis_status: 'failed' })
  vi.mocked(analyzeStoredEmail).mockReturnValue(pending.promise)
  dashboard('/dashboard?email=one')
  expect(await screen.findByText('Please review the proposal.')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Reanalyze' }))
  await user.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: 'Reanalyze email',
    }),
  )
  expect(await screen.findByText('Analyzing this email…')).toBeVisible()
  expect(
    screen.queryByText(/Your previous summary and reply are still here/),
  ).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Back to inbox' }))
  await user.click(screen.getByRole('button', { name: 'Review proposal' }))
  expect(await screen.findByText('Analyzing this email…')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Analyzing…' })).toBeDisabled()
  vi.mocked(getEmail).mockResolvedValue(email)
  await act(async () => pending.resolve(testAnalysis))
  await waitFor(() =>
    expect(screen.queryByText('Analyzing this email…')).not.toBeInTheDocument(),
  )
  expect(
    screen.queryByText(/Your previous summary and reply are still here/),
  ).not.toBeInTheDocument()
})

it('shows loading, empty, and retryable error states without inference', async () => {
  const pending = deferred<EmailPage>()
  vi.mocked(browseEmails).mockReturnValue(pending.promise)
  const client = dashboard()
  expect(screen.getByText('Loading saved emails...')).toBeInTheDocument()
  await act(async () => {
    pending.resolve({ ...page, emails: [], total: 0 })
  })
  expect(
    await screen.findByText('Your inbox is ready for its first sync'),
  ).toBeInTheDocument()
  vi.mocked(browseEmails).mockRejectedValue(
    new ApiError('List unavailable.', 'NETWORK_ERROR'),
  )
  await act(async () => {
    await client.invalidateQueries({ queryKey: ['emails', 'user-a', 'browse'] })
  })
  expect(await screen.findByText('List unavailable.')).toBeInTheDocument()
  expect(
    screen.getByText('Your inbox is ready for its first sync'),
  ).toBeInTheDocument()
  vi.mocked(browseEmails).mockResolvedValue(page)
  await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('Review proposal')).toBeInTheDocument()
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('keeps browsing available during reauthorization and disables processing', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard', {
    ...testAuth,
    connection_status: 'reauthorization_required',
  })
  expect(
    await screen.findByRole('button', { name: 'Review proposal' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sync inbox' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Review proposal' }))
  expect(
    await screen.findByRole('button', { name: 'Reanalyze' }),
  ).toBeDisabled()
})

it('clears dashboard data when the session ends', async () => {
  const client = dashboard('/dashboard?email=one')
  await screen.findByRole('region', { name: 'Review proposal' })
  vi.mocked(getConnectionStatus).mockResolvedValue(anonymousStatus())
  await act(async () => {
    await client.invalidateQueries({ queryKey: authKey })
  })
  expect(await screen.findByText('Welcome to Mailkind')).toBeInTheDocument()
  expect(
    screen.queryByText('Please review the proposal.'),
  ).not.toBeInTheDocument()
  expect(client.getQueriesData({ queryKey: emailKeys.all('user-a') })).toEqual(
    [],
  )
})

it('shows settings and timezone without exposing sync controls', async () => {
  dashboard('/settings')
  expect(await screen.findByText('Asia/Manila')).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Remove Gmail access' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Sync inbox' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute(
    'href',
    '/dashboard',
  )
})

it('logs out to the homepage and clears private data without removing Gmail access', async () => {
  const user = userEvent.setup()
  vi.mocked(logout).mockResolvedValue(undefined)
  const client = dashboard('/dashboard?email=one')
  await screen.findByRole('region', { name: 'Review proposal' })
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  expect(await screen.findByText('Welcome to Mailkind')).toBeInTheDocument()
  expect(logout).toHaveBeenCalledExactlyOnceWith('synthetic-csrf')
  expect(disconnectGmail).not.toHaveBeenCalled()
  expect(client.getQueriesData({ queryKey: emailKeys.all('user-a') })).toEqual(
    [],
  )
  expect(client.getQueryData(authKey)).toMatchObject({ authenticated: false })
})

it('keeps the dashboard visible when logout fails and never automatically retries it', async () => {
  vi.mocked(logout).mockRejectedValue(
    new ApiError('Logout unavailable.', 'NETWORK_ERROR'),
  )
  dashboard()
  await screen.findByText('Review proposal')
  await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
  expect(
    await screen.findByText(/Check your connection and try again/),
  ).toBeInTheDocument()
  expect(screen.getByText('Review proposal')).toBeInTheDocument()
  expect(logout).toHaveBeenCalledTimes(1)
})

it('preserves the Google revocation warning when returning home after removing access', async () => {
  const user = userEvent.setup()
  vi.mocked(disconnectGmail).mockResolvedValue(false)
  dashboard('/settings')
  await user.click(
    await screen.findByRole('button', { name: 'Remove Gmail access' }),
  )
  const modal = screen.getByRole('dialog', { name: 'Remove Gmail access?' })
  expect(modal).toHaveTextContent('saved emails and actions remain')
  expect(disconnectGmail).not.toHaveBeenCalled()
  await user.click(
    within(modal).getByRole('button', { name: 'Remove access and log out' }),
  )
  await screen.findByText('Welcome to Mailkind')
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/?gmail=removal_warning',
  )
  expect(disconnectGmail).toHaveBeenCalledExactlyOnceWith('synthetic-csrf')
})

it('resets page and selection on filter changes and clears filters while preserving sorting', async () => {
  const user = userEvent.setup()
  dashboard(
    '/dashboard?category=Work&analysis_status=failed&offset=20&email=one&sort=received_asc',
  )
  await screen.findByRole('region', { name: 'Review proposal' })
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Priority' }),
    'High',
  )
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/dashboard?category=Work&analysis_status=failed&sort=received_asc&priority=High',
  )
  expect(
    screen.getByRole('heading', { name: 'Select an email' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/dashboard?sort=received_asc',
  )
  expect(screen.getByRole('combobox', { name: 'Actions' })).toHaveValue('')
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('keeps each filter in one toolbar with one clear control and no duplicate views', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?category=Work&analysis_status=failed')
  await screen.findByText('Review proposal')
  const filters = screen.getByRole('region', { name: 'Filter emails' })
  expect(within(filters).getAllByRole('combobox')).toHaveLength(6)
  expect(within(filters).queryAllByRole('checkbox')).toHaveLength(0)
  expect(
    within(filters).getByRole('combobox', { name: 'Category' }),
  ).toHaveValue('Work')
  expect(
    within(filters).getByRole('combobox', { name: 'Analysis status' }),
  ).toHaveValue('failed')
  expect(
    within(filters).getAllByRole('button', { name: 'Clear filters' }),
  ).toHaveLength(1)
  expect(
    screen.queryByRole('button', { name: 'High priority' }),
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('region', { name: 'Active filters' }),
  ).not.toBeInTheDocument()
  await user.selectOptions(
    within(filters).getByRole('combobox', { name: 'Category' }),
    '',
  )
  expect(screen.getByLabelText('Current URL')).not.toHaveTextContent(
    'category=',
  )
  await user.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getByRole('button', { name: 'Clear filters' })).toBeDisabled()
  await waitFor(() =>
    expect(browseEmails).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'priority_desc', offset: 0 }),
      expect.any(AbortSignal),
    ),
  )
})

it('offers recovery only for unfinished work and can browse failed emails without retrying them', async () => {
  vi.mocked(listStoredEmails).mockImplementation(async (status) => ({
    emails: [],
    total: status === 'pending' ? 2 : status === 'failed' ? 1 : 0,
    limit: 1,
    offset: 0,
  }))
  dashboard()
  await screen.findByText('2 unfinished analyses')
  expect(
    screen.getByRole('button', { name: 'Continue analysis' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Retry failed' }),
  ).toBeInTheDocument()
  await userEvent.selectOptions(
    screen.getByRole('combobox', { name: 'Analysis status' }),
    'failed',
  )
  await waitFor(() =>
    expect(browseEmails).toHaveBeenLastCalledWith(
      expect.objectContaining({ analysis_status: 'failed' }),
      expect.any(AbortSignal),
    ),
  )
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('keeps the queue alive while filtering and reading, with real progress and disabled reanalysis', async () => {
  const user = userEvent.setup()
  const first = deferred<typeof testAnalysis>()
  vi.mocked(syncInbox).mockResolvedValue(testSync)
  vi.mocked(analyzeStoredEmail)
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue(testAnalysis)
  dashboard()
  await screen.findByText('Review proposal')
  await user.click(screen.getByRole('button', { name: 'Sync inbox' }))
  const modal = screen.getByRole('dialog', { name: 'Sync and analyze emails?' })
  expect(modal).toHaveTextContent('label:mailkind-test')
  expect(modal).not.toHaveTextContent('Neon')
  expect(syncInbox).not.toHaveBeenCalled()
  await user.click(
    within(modal).getByRole('button', { name: 'Sync and analyze' }),
  )
  expect(
    await screen.findByRole('button', { name: 'Analyzing 1 of 2' }),
  ).toBeDisabled()
  expect(
    screen.queryByRole('region', { name: 'Processing progress' }),
  ).not.toBeInTheDocument()
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Priority' }),
    'High',
  )
  await user.click(
    await screen.findByRole('button', { name: 'Review proposal' }),
  )
  expect(
    await screen.findByRole('button', { name: 'Analyzing…' }),
  ).toBeDisabled()
  expect(screen.getByText('Analyzing this email…')).toBeVisible()
  await act(async () => {
    first.resolve(testAnalysis)
  })
  await screen.findByText('2 emails analyzed. 0 tasks added to Actions.')
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(2)
  expect(syncInbox).toHaveBeenCalledTimes(1)
  expect(
    screen.queryByRole('progressbar', { name: 'Analysis progress' }),
  ).not.toBeInTheDocument()
})

it('restores the filtered list after browser Back and closes the reader when paging', async () => {
  const user = userEvent.setup()
  dashboard('/dashboard?priority=High')
  await user.click(
    await screen.findByRole('button', { name: 'Review proposal' }),
  )
  await screen.findByRole('region', { name: 'Review proposal' })
  await user.click(screen.getByRole('button', { name: 'Browser back' }))
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(
    '/dashboard?priority=High',
  )
  expect(
    screen.getByRole('heading', { name: 'Select an email' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Review proposal' }))
  await user.click(screen.getByRole('button', { name: 'Next' }))
  expect(screen.getByLabelText('Current URL')).not.toHaveTextContent('email=')
})

it('distinguishes no matches from an inbox that has never been imported', async () => {
  vi.mocked(browseEmails).mockResolvedValue({ ...page, emails: [], total: 0 })
  dashboard('/dashboard?priority=High')
  expect(await screen.findByText('No matching emails')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(
    await screen.findByText('Your inbox is ready for its first sync'),
  ).toBeInTheDocument()
})

it('offers a first-page recovery for an empty pagination page', async () => {
  vi.mocked(browseEmails).mockResolvedValue({ ...page, emails: [], offset: 40 })
  dashboard('/dashboard?offset=40')
  expect(await screen.findByText('This page has no emails')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'First page' }))
  expect(screen.getByLabelText('Current URL')).toHaveTextContent('offset=0')
})
