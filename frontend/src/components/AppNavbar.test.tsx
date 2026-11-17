import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { testAuth } from '../test/helpers'
import { AppNavbar } from './AppNavbar'

const account = {
  ...testAuth,
  display_name: 'Synthetic Person',
  picture_url: 'https://lh3.googleusercontent.com/synthetic',
}

it('groups branding, navigation, and the Google account with one logout control', () => {
  render(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('link', { name: 'Mailkind inbox' })).toHaveAttribute(
    'href',
    '/dashboard',
  )
  expect(screen.getByRole('link', { name: 'Inbox' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
  const group = screen.getByRole('region', { name: 'Signed-in account' })
  expect(group).toHaveTextContent('Synthetic Person')
  expect(group).toHaveTextContent(testAuth.email ?? '')
  expect(group.querySelector('img')).toHaveAttribute('src', account.picture_url)
  expect(group.querySelector('img')).toHaveAttribute(
    'referrerpolicy',
    'no-referrer',
  )
  expect(
    within(group).getAllByRole('button', { name: 'Log out' }),
  ).toHaveLength(1)
})

it('falls back to initials when the profile photo fails to load', () => {
  render(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  )
  const group = screen.getByRole('region', { name: 'Signed-in account' })
  const photo = group.querySelector('img')
  if (!photo) throw new Error('Expected profile image')
  fireEvent.error(photo)
  expect(group.querySelector('img')).toBeNull()
  expect(group).toHaveTextContent('SP')
})

it('supports existing sessions without profile details', () => {
  render(
    <MemoryRouter>
      <AppNavbar
        account={testAuth}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  )
  const group = screen.getByRole('region', { name: 'Signed-in account' })
  expect(group.querySelector('img')).toBeNull()
  expect(group).toHaveTextContent(testAuth.email ?? '')
})

it('toggles the mobile disclosure and closes with Escape while restoring focus', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={vi.fn()}
      />
    </MemoryRouter>,
  )
  expect(
    screen.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  expect(
    screen.getByRole('button', { name: 'Close navigation' }),
  ).toHaveAttribute('aria-expanded', 'true')
  screen.getByRole('link', { name: 'Settings' }).focus()
  await user.keyboard('{Escape}')
  expect(
    screen.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false')
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveFocus()
})

it('closes navigation after choosing a page and when clicking outside', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={vi.fn()}
      />
      <main>
        <button type="button">Outside content</button>
      </main>
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  await user.click(screen.getByRole('link', { name: 'Settings' }))
  expect(
    screen.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  await user.click(screen.getByRole('button', { name: 'Outside content' }))
  expect(
    screen.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false')
})

it('keeps logout explicit, respects busy state, and closes the menu on logout', async () => {
  const user = userEvent.setup()
  const logout = vi.fn()
  const { rerender } = render(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={true}
        logoutDisabled={true}
        onLogout={logout}
      />
    </MemoryRouter>,
  )
  expect(screen.getByRole('button', { name: 'Logging out...' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Logging out...' }))
  expect(logout).not.toHaveBeenCalled()
  rerender(
    <MemoryRouter>
      <AppNavbar
        account={account}
        loggingOut={false}
        logoutDisabled={false}
        onLogout={logout}
      />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: 'Open navigation' }))
  await user.click(screen.getByRole('button', { name: 'Log out' }))
  expect(logout).toHaveBeenCalledTimes(1)
  expect(
    screen.getByRole('button', { name: 'Open navigation' }),
  ).toHaveAttribute('aria-expanded', 'false')
})
