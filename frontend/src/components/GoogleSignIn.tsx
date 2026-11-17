import { useEffect, useState } from 'react'
import { useAuthStatus } from '../hooks/useAuth'
import { googleConnectUrl } from '../services/auth'
import { Button } from './ui/Button'
import { ErrorState } from './ui/ErrorState'
import { notify } from '../notifications/toasts'

const outcomeMessages: Record<string, string> = {
  OAUTH_DENIED:
    'Google sign-in was cancelled. You can try again when you are ready.',
  OAUTH_STATE_INVALID: 'The sign-in link expired. Please try again.',
  ACCOUNT_MISMATCH: 'Log out before choosing a different Google account.',
  REFRESH_TOKEN_REQUIRED:
    'Please continue with Google again and approve Gmail access.',
  GMAIL_PERMISSION_DENIED: 'Allow read-only Gmail access to use Mailkind.',
  AUTH_NOT_CONFIGURED: 'Google sign-in is not available yet.',
  GOOGLE_UNAVAILABLE: 'Mailkind could not reach Google. Please try again.',
  OAUTH_FAILED: 'Google sign-in failed. Please try again.',
  DATABASE_UNAVAILABLE: 'Could not complete sign-in. Please try again.',
  removed:
    'Gmail access removed. You are logged out. Your saved emails remain in Mailkind.',
  removal_warning:
    'You are logged out and Gmail access was removed locally. Google access could not be revoked; remove Mailkind access in your Google Account. Your saved emails remain in Mailkind.',
}

export function GoogleSignInButton() {
  const auth = useAuthStatus()
  const [outcome] = useState(() =>
    new URL(window.location.href).searchParams.get('gmail'),
  )
  const needsConsent =
    outcome === 'REFRESH_TOKEN_REQUIRED' ||
    outcome === 'GMAIL_PERMISSION_DENIED'
  if (auth.isPending) return <Button disabled>Checking sign-in…</Button>
  if (auth.isError)
    return (
      <ErrorState
        message="Could not check your sign-in status."
        onRetry={() => {
          void auth.refetch()
        }}
        retrying={auth.isFetching}
      />
    )
  if (auth.data?.authenticated) return null
  if (!auth.data?.configured)
    return (
      <p className="text-sm text-muted">Google sign-in is not available yet.</p>
    )
  return (
    <a
      className="inline-flex min-h-11 items-center justify-center gap-2.5 whitespace-nowrap rounded-control border border-[#747775] bg-white px-3 py-2 text-sm font-medium text-[#1f1f1f] hover:bg-[#f2f2f2]"
      href={googleConnectUrl(needsConsent)}
    >
      <img
        src="/images/google-g.png"
        width="20"
        height="20"
        alt=""
        aria-hidden="true"
        className="size-5 shrink-0"
      />
      Continue with Google
    </a>
  )
}

export function GoogleSignInNotice() {
  const [outcome] = useState(() =>
    new URL(window.location.href).searchParams.get('gmail'),
  )
  useEffect(() => {
    if (!outcome) return
    notify(
      outcome === 'removed'
        ? 'success'
        : outcome === 'removal_warning'
          ? 'warning'
          : 'error',
      outcome === 'removed' || outcome === 'removal_warning'
        ? 'Gmail access removed'
        : 'Sign-in needs attention',
      Object.hasOwn(outcomeMessages, outcome)
        ? outcomeMessages[outcome]
        : 'Could not complete Google sign-in. Please try again.',
    )
    const url = new URL(window.location.href)
    url.searchParams.delete('gmail')
    window.history.replaceState(null, '', url)
  }, [outcome])
  return null
}
