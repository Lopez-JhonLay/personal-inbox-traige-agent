import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { authKey, anonymousStatus } from '../query/queryClient'
import { deferred, harness, testAuth } from '../test/helpers'
import type { ConnectionStatus } from '../types/api'
import HomePage from './HomePage'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

function landing(auth: ConnectionStatus | null = anonymousStatus()) {
  const { client, wrapper } = harness(auth)
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<h1>Your dashboard</h1>} />
      </Routes>
    </MemoryRouter>,
    { wrapper },
  )
  return client
}

it('has one Google button in the header and the inbox preview', () => {
  landing()
  expect(
    screen.getAllByRole('link', { name: 'Continue with Google' }),
  ).toHaveLength(1)
  expect(
    screen
      .getByRole('link', { name: 'Continue with Google' })
      .closest('header'),
  ).toHaveAttribute('id', 'top')
  expect(screen.queryByText(/Try the demo/i)).not.toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Inbox demo' })).toBeInTheDocument()
  expect(document.querySelector('a[href="#sample-inbox"]')).toBeNull()
})

it('redirects signed-in visitors directly to their dashboard', async () => {
  landing(testAuth)
  expect(
    await screen.findByRole('heading', { name: 'Your dashboard' }),
  ).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Open dashboard' }),
  ).not.toBeInTheDocument()
  expect(screen.queryByText('See what needs')).not.toBeInTheDocument()
})

it('waits for auth before displaying the landing page or redirecting', async () => {
  const response = deferred<Response>()
  vi.stubGlobal(
    'fetch',
    vi.fn(() => response.promise),
  )
  landing(null)
  expect(screen.getByText('Checking your session…')).toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Continue with Google' }),
  ).not.toBeInTheDocument()
  await act(async () => {
    response.resolve(
      new Response(JSON.stringify({ success: true, data: testAuth }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })
  expect(
    await screen.findByRole('heading', { name: 'Your dashboard' }),
  ).toBeInTheDocument()
})

it('redirects when an anonymous landing visitor becomes signed in', async () => {
  const client = landing()
  await act(async () => {
    client.setQueryData(authKey, testAuth)
  })
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: 'Your dashboard' }),
    ).toBeInTheDocument(),
  )
})

it('keeps a single consent retry in the navbar when Google sign-in needs approval', () => {
  window.history.replaceState(
    null,
    '',
    '/?gmail=REFRESH_TOKEN_REQUIRED#gmail-connection',
  )
  landing()
  expect(screen.getByRole('status')).toHaveTextContent('approve Gmail access')
  expect(
    screen.getAllByRole('link', { name: 'Continue with Google' }),
  ).toHaveLength(1)
  expect(
    screen.getByRole('link', { name: 'Continue with Google' }),
  ).toHaveAttribute('href', '/api/auth/google?reconnect=1')
})
