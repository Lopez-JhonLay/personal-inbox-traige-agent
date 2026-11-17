import { GmailConnection } from '../components/GmailConnection'
import { useNavigate, useOutletContext } from 'react-router'
import type { AuthNavigationContext } from '../components/AppLayout'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import { useAuthStatus } from '../hooks/useAuth'
import { useInboxOverview } from '../hooks/useEmails'

export default function SettingsPage() {
  const auth = useAuthStatus()
  return auth.data?.user_id ? <Settings userId={auth.data.user_id} /> : null
}

function Settings({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const { setRemovingAccess } = useOutletContext<AuthNavigationContext>()
  const overview = useInboxOverview(userId)
  return (
    <>
      <h1 className="text-heading">Settings</h1>
      <p className="mt-3 text-muted">
        Manage your Gmail connection and review your display settings.
      </p>
      <section
        aria-labelledby="timezone-title"
        className="my-6 rounded-panel border border-line bg-surface p-5"
      >
        <h2 id="timezone-title" className="text-lg">
          Timezone
        </h2>
        {overview.isPending && <LoadingIndicator label="Loading timezone…" />}
        {overview.data && <p className="mt-2">{overview.data.timezone}</p>}
        {overview.isError && (
          <ErrorState
            message="Could not load your timezone."
            onRetry={() => {
              void overview.refetch()
            }}
            retrying={overview.isFetching}
          />
        )}
        <p className="mt-2 text-sm text-muted">
          Email timestamps use this saved timezone. Timezone editing is not
          available yet.
        </p>
      </section>
      <GmailConnection
        onBusyChange={setRemovingAccess}
        onRemoved={(revoked) =>
          navigate(
            `/?gmail=${revoked ? 'removed' : 'removal_warning'}#gmail-connection`,
            { replace: true },
          )
        }
      />
    </>
  )
}
