import { render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import App from '../App'

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

it.each([
  ['/privacy', 'Privacy policy'],
  ['/terms', 'Terms of service'],
])('serves %s without authentication or API requests', (path, title) => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  window.history.replaceState(null, '', path)
  // No QueryClient/auth provider: public policy routes must not require either.
  render(<App />)
  expect(
    screen.getByRole('heading', { level: 1, name: title }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', { name: 'jhonlaylopez000@gmail.com' }),
  ).toHaveAttribute('href', 'mailto:jhonlaylopez000@gmail.com')
  const links = within(screen.getByRole('navigation', { name: 'Legal' }))
  expect(links.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute(
    'href',
    '/privacy',
  )
  expect(links.getByRole('link', { name: 'Terms of service' })).toHaveAttribute(
    'href',
    '/terms',
  )
  expect(fetch).not.toHaveBeenCalled()
})
