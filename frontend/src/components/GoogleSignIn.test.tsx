import { render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { anonymousStatus } from '../query/queryClient'
import { harness } from '../test/helpers'
import { GoogleSignInNotice, GoogleSignInButton } from './GoogleSignIn'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

it('offers Google sign-in with a decorative Google logo', () => {
  const { wrapper } = harness(anonymousStatus())
  render(<GoogleSignInButton />, { wrapper })
  expect(
    screen.getByRole('link', { name: 'Continue with Google' }),
  ).toHaveAttribute('href', '/api/auth/google')
  const logo = screen
    .getByRole('link', { name: 'Continue with Google' })
    .querySelector('img')
  expect(logo).toHaveAttribute('src', '/images/google-g.png')
  expect(logo).toHaveAttribute('alt', '')
})

it('does not offer another login or a dashboard detour for an active session', () => {
  const { wrapper } = harness()
  render(<GoogleSignInButton />, { wrapper })
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Continue with Google' }),
  ).not.toBeInTheDocument()
})

it('shows sign-in failures and explicitly requests consent when a refresh token is missing', () => {
  window.history.replaceState(
    null,
    '',
    '/?gmail=REFRESH_TOKEN_REQUIRED#gmail-connection',
  )
  const { wrapper } = harness(anonymousStatus())
  render(
    <>
      <GoogleSignInButton />
      <GoogleSignInNotice />
    </>,
    { wrapper },
  )
  expect(screen.getByRole('status')).toHaveTextContent('approve Gmail access')
  expect(
    screen.getByRole('link', { name: 'Continue with Google' }),
  ).toHaveAttribute('href', '/api/auth/google?reconnect=1')
  expect(window.location.search).toBe('')
})

it('preserves removal warnings and never renders a raw callback error as HTML', () => {
  window.history.replaceState(null, '', '/?gmail=removal_warning')
  const { wrapper } = harness(anonymousStatus())
  render(<GoogleSignInNotice />, { wrapper })
  expect(screen.getByRole('status')).toHaveTextContent(
    'Google access could not be revoked',
  )
})

it('does not offer an active sign-in link while auth status is loading', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise(() => {})),
  )
  const { wrapper } = harness(null)
  render(<GoogleSignInButton />, { wrapper })
  expect(
    screen.getByRole('button', { name: 'Checking sign-in…' }),
  ).toBeDisabled()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

it('uses a safe fallback for unknown callback outcomes', () => {
  window.history.replaceState(null, '', '/?gmail=__proto__')
  const { wrapper } = harness(anonymousStatus())
  render(<GoogleSignInNotice />, { wrapper })
  expect(screen.getByRole('status')).toHaveTextContent(
    'Could not complete Google sign-in. Please try again.',
  )
})
