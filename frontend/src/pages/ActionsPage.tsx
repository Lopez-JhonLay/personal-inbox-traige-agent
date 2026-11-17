import { Link, useSearchParams } from 'react-router'
import { useIsMutating } from '@tanstack/react-query'
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  ListChecks,
} from 'lucide-react'
import { formatDate } from '../utils/dates'
import {
  actionLabels,
  actionStatuses,
  useActions,
  useActionMutations,
} from '../hooks/useActions'
import { useAuthStatus } from '../hooks/useAuth'
import type { ActionItem, ActionStatus } from '../types/api'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'

export default function ActionsPage() {
  const auth = useAuthStatus()
  return auth.data?.user_id ? (
    <Actions key={auth.data.user_id} userId={auth.data.user_id} />
  ) : null
}

function Actions({ userId }: { userId: string }) {
  const [params, setParams] = useSearchParams()
  const status =
    params.get('status') === 'all'
      ? undefined
      : (actionStatuses.find((value) => value === params.get('status')) ??
        'pending')
  const rawOffset = Number(params.get('offset') ?? 0)
  const offset =
    Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0
  const query = useActions(userId, { status, offset })
  function page(next: number) {
    setParams((previous) => {
      const result = new URLSearchParams(previous)
      result.set('offset', String(next))
      return result
    })
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-control border border-line bg-highlight">
            <ListChecks className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-heading">Actions</h1>
            <p className="mt-1 text-sm text-muted">
              Follow-ups from your emails, in one place.
            </p>
          </div>
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-muted">
          Action status
          <select
            className="min-h-11 min-w-40 rounded-control border border-line bg-surface px-3 text-sm text-ink"
            value={status ?? 'all'}
            onChange={(event) => setParams({ status: event.target.value })}
          >
            {actionStatuses.map((value) => (
              <option key={value} value={value}>
                {actionLabels[value]}
              </option>
            ))}
            <option value="all">All statuses</option>
          </select>
        </label>
      </header>
      {query.isPending && <LoadingIndicator label="Loading actions..." />}
      {query.isError && (
        <ErrorState
          message={query.error.message}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )}
      {query.data &&
        (query.data.actions.length ? (
          <ul className="grid min-w-0 gap-2.5">
            {query.data.actions.map((action) => (
              <li key={action.id} className="min-w-0">
                <ActionRow action={action} userId={userId} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No matching actions"
            message="Add a task from an email, or choose another status."
          />
        ))}
      {query.data && (query.data.total > 0 || offset > 0) && (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">
            {query.data.total} {query.data.total === 1 ? 'task' : 'tasks'} ·
            Earliest due first
          </p>
          {(query.data.total > 20 || offset > 0) && (
            <nav
              aria-label="Action pages"
              className="flex flex-wrap items-center gap-3"
            >
              <Button
                variant="secondary"
                className="px-3 text-xs"
                disabled={offset === 0 || query.isFetching}
                onClick={() => page(Math.max(0, offset - 20))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted">
                Page {Math.floor(offset / 20) + 1} /{' '}
                {Math.max(1, Math.ceil(query.data.total / 20))}
              </span>
              <Button
                variant="secondary"
                className="px-3 text-xs"
                disabled={offset + 20 >= query.data.total || query.isFetching}
                onClick={() => page(offset + 20)}
              >
                Next
              </Button>
              {offset > 0 && !query.data.actions.length && (
                <Button variant="secondary" onClick={() => page(0)}>
                  First page
                </Button>
              )}
            </nav>
          )}
        </footer>
      )}
    </div>
  )
}

function ActionRow({ action, userId }: { action: ActionItem; userId: string }) {
  const { update } = useActionMutations(userId)
  const auth = useAuthStatus()
  const authBusy = useIsMutating({ mutationKey: ['auth'] }) > 0
  const busy =
    useIsMutating({
      mutationKey: ['actions', userId, 'update'],
      predicate: (mutation) =>
        (mutation.state.variables as { id?: string } | undefined)?.id ===
        action.id,
    }) > 0
  const closed = action.status === 'completed' || action.status === 'dismissed'
  const statusStyle = {
    pending: 'border-warning/30 bg-warning-soft text-warning',
    in_progress: 'border-accent/30 bg-accent-soft text-accent',
    completed: 'border-success/30 bg-success-soft text-success',
    dismissed: 'border-line bg-surface-muted text-muted',
  }[action.status]
  const disabled = busy || authBusy || auth.isError || !auth.data?.authenticated
  function changeStatus(status: ActionStatus) {
    update.mutate({ id: action.id, status })
  }
  return (
    <article className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 rounded-panel border border-line bg-surface p-4 transition-colors hover:border-line-strong sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:p-5">
      <button
        type="button"
        className="group inline-flex size-11 items-center justify-center rounded-control disabled:cursor-wait disabled:opacity-50"
        aria-label={`${closed ? 'Reopen task' : 'Mark task complete'}: ${action.description}`}
        disabled={disabled}
        onClick={() => changeStatus(closed ? 'pending' : 'completed')}
      >
        <span
          className={`grid size-7 place-items-center rounded-full border-2 transition-colors ${action.status === 'completed' ? 'border-success bg-success text-surface' : 'border-line text-transparent group-hover:border-success group-hover:text-success'}`}
        >
          <Check className="size-4" aria-hidden="true" />
        </span>
      </button>
      <div className="min-w-0 pt-1">
        <p
          className={`whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed ${closed ? 'text-muted' : 'text-ink'} ${action.status === 'completed' ? 'line-through decoration-line' : ''}`}
        >
          {action.description}
        </p>
        <Link
          className="mt-2 inline-flex max-w-full items-center gap-1 text-xs font-medium text-accent hover:underline"
          to={`/dashboard?email=${encodeURIComponent(action.email_id)}`}
        >
          <span className="truncate">
            {action.email_subject || 'Untitled email'}
          </span>
          <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
        </Link>
        <p
          className="mt-1 truncate text-xs text-muted"
          title={action.email_sender ?? undefined}
        >
          {action.email_sender || 'Unknown sender'}
        </p>
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-start-auto sm:flex-col sm:items-end">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Status</span>
          <select
            aria-label={`Status for ${action.description}`}
            value={action.status}
            disabled={disabled}
            className={`min-h-11 appearance-none rounded-pill border py-2 pl-3 pr-9 text-xs font-semibold disabled:opacity-60 ${statusStyle}`}
            onChange={(event) =>
              changeStatus(event.target.value as ActionStatus)
            }
          >
            {actionStatuses.map((value) => (
              <option key={value} value={value}>
                {actionLabels[value]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 size-3.5"
            aria-hidden="true"
          />
        </label>
        <p className="inline-flex items-center gap-1.5 text-xs text-muted">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {action.due_date ? (
            <time dateTime={action.due_date}>
              Due {formatDate(action.due_date)}
            </time>
          ) : (
            'No deadline'
          )}
        </p>
        {busy && (
          <span role="status" className="text-xs text-muted">
            Saving…
          </span>
        )}
      </div>
    </article>
  )
}
