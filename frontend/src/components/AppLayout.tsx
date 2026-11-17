import { useIsMutating } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router'
import { useAuthStatus, useLogout } from '../hooks/useAuth'
import { AppNavbar } from './AppNavbar'
import { ErrorState } from './ui/ErrorState'
import { LoadingIndicator } from './ui/LoadingIndicator'

export interface AuthNavigationContext {
  setRemovingAccess: (busy: boolean) => void
}

export function AppLayout() {
  const auth = useAuthStatus()
  const logout = useLogout(auth.data?.user_id ?? null)
  const navigate = useNavigate()
  const [removing, setRemovingAccess] = useState(false)
  const removingAccess =
    useIsMutating({ mutationKey: ['auth', 'disconnect'] }) > 0
  async function signOut() {
    try {
      await logout.mutateAsync()
      navigate('/', { replace: true })
    } catch {
      /* Keep the current page and display the request error. */
    }
  }
  return (
    <>
      <a href="#app-main" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <AppNavbar
        account={auth.data}
        loggingOut={logout.isPending}
        logoutDisabled={
          auth.isError || removing || removingAccess || logout.isPending
        }
        onLogout={signOut}
      />
      <main id="app-main" className="page-container py-8">
        {auth.isPending ? (
          <LoadingIndicator label="Checking your session…" />
        ) : auth.data?.authenticated && auth.data.user_id ? (
          <Outlet
            key={auth.data.user_id}
            context={{ setRemovingAccess } satisfies AuthNavigationContext}
          />
        ) : removing || logout.isPending ? (
          <LoadingIndicator label="Finishing sign-out…" />
        ) : (
          <Navigate to="/" replace />
        )}
        {auth.isError && (
          <ErrorState
            message="Could not refresh your session. Processing is paused."
            onRetry={() => {
              void auth.refetch()
            }}
            retrying={auth.isFetching}
          />
        )}
      </main>
    </>
  )
}
