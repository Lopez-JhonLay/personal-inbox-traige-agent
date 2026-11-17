import { Menu, X, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import type { ConnectionStatus } from '../types/api'
import { AccountAvatar } from './AccountAvatar'
import { BrandIdentity } from './BrandIdentity'
import { Button } from './ui/Button'

export function AppNavbar({
  account,
  loggingOut,
  logoutDisabled,
  onLogout,
}: {
  account?: ConnectionStatus
  loggingOut: boolean
  logoutDisabled: boolean
  onLogout: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigation = useRef<HTMLElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()
  const scope = `${account?.user_id ?? ''}:${pathname}`
  const previousScope = useRef(scope)
  useEffect(() => {
    if (previousScope.current === scope) return
    previousScope.current = scope
    setMenuOpen(false)
  }, [scope])
  useEffect(() => {
    if (!menuOpen) return
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !navigation.current?.contains(event.target)
      )
        setMenuOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [menuOpen])
  const name = account?.display_name?.trim()
  return (
    <header className="border-b border-line bg-paper">
      <nav
        ref={navigation}
        aria-label="Application"
        className="page-container flex flex-wrap items-center justify-between gap-x-6 py-3"
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menuOpen) {
            event.preventDefault()
            setMenuOpen(false)
            toggle.current?.focus()
          }
        }}
      >
        <Link
          className="inline-flex shrink-0 no-underline"
          to="/dashboard"
          aria-label="Mailkind inbox"
        >
          <BrandIdentity />
        </Link>
        <button
          ref={toggle}
          type="button"
          className="button button-secondary button-icon ml-auto md:hidden"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="app-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X className="size-5" aria-hidden="true" />
          ) : (
            <Menu className="size-5" aria-hidden="true" />
          )}
        </button>
        <div
          id="app-navigation"
          className={`${menuOpen ? 'flex' : 'hidden'} mt-3 w-full flex-col gap-4 border-t border-line pt-3 md:mt-0 md:flex md:w-auto md:flex-1 md:flex-row md:items-center md:justify-between md:border-0 md:pt-0`}
        >
          <div className="flex flex-col gap-1 md:flex-row md:gap-2">
            <NavLink
              className="nav-link"
              to="/dashboard"
              onClick={() => setMenuOpen(false)}
            >
              Inbox
            </NavLink>
            <NavLink
              className="nav-link"
              to="/actions"
              onClick={() => setMenuOpen(false)}
            >
              Actions
            </NavLink>
            <NavLink
              className="nav-link"
              to="/settings"
              onClick={() => setMenuOpen(false)}
            >
              Settings
            </NavLink>
          </div>
          {account?.authenticated && (
            <section
              aria-label="Signed-in account"
              className="flex min-w-0 flex-col gap-3 border-t border-line pt-4 md:flex-row md:items-center md:border-l md:border-t-0 md:pl-5 md:pt-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AccountAvatar
                  key={account.user_id}
                  name={name}
                  email={account.email}
                  pictureUrl={account.picture_url}
                />
                <div className="min-w-0 md:max-w-40 lg:max-w-56">
                  <p
                    className="truncate text-sm font-semibold"
                    title={name || account.email || undefined}
                  >
                    {name || account.email || 'Google account'}
                  </p>
                  {name && (
                    <p
                      className="truncate text-xs text-muted"
                      title={account.email ?? undefined}
                    >
                      {account.email}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="secondary"
                className="text-sm"
                busy={loggingOut}
                disabled={logoutDisabled}
                onClick={() => {
                  setMenuOpen(false)
                  onLogout()
                }}
              >
                <LogOut aria-hidden="true" className="size-4" />
                {loggingOut ? 'Logging out...' : 'Log out'}
              </Button>
            </section>
          )}
        </div>
      </nav>
    </header>
  )
}
