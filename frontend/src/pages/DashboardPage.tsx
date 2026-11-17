import { useIsMutating } from '@tanstack/react-query'
import { MailOpen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigationType, useSearchParams } from 'react-router'
import { EmailDetail } from '../components/EmailDetail'
import {
  categories,
  EmailFilters,
  priorities,
  sorts,
} from '../components/EmailFilters'
import { EmailList } from '../components/EmailList'
import { InboxProcessing } from '../components/InboxProcessing'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { LoadingIndicator } from '../components/ui/LoadingIndicator'
import { useAuthStatus } from '../hooks/useAuth'
import { useEmailPage, useInboxOverview } from '../hooks/useEmails'
import type { EmailFilters as Filters } from '../types/api'
import { analysisStatuses } from '../utils/emailStatus'

export default function DashboardPage() {
  const auth = useAuthStatus()
  const userId = auth.data?.user_id
  return userId ? <Dashboard key={userId} userId={userId} /> : null
}

function Dashboard({ userId }: { userId: string }) {
  const auth = useAuthStatus()
  const overview = useInboxOverview(userId)
  const [params, setParams] = useSearchParams()
  const navigationType = useNavigationType()
  const [processing, setProcessing] = useState(false)
  const mutating = useIsMutating({ mutationKey: ['emails', userId] }) > 0
  const authBusy = useIsMutating({ mutationKey: ['auth'] }) > 0
  const listHeading = useRef<HTMLHeadingElement>(null)
  const listPane = useRef<HTMLDivElement>(null)
  const openButton = useRef<HTMLElement | null>(null)
  const listScroll = useRef(0)
  const pageScroll = useRef(0)
  const closeRequested = useRef(false)
  const previousSelection = useRef<string | null>(null)
  const rawOffset = Number(params.get('offset') ?? 0)
  const filters: Filters = {
    offset: Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0,
    sort: sorts.find((sort) => sort === params.get('sort')) ?? 'priority_desc',
    priority: priorities.find((value) => value === params.get('priority')),
    category: categories.find((value) => value === params.get('category')),
    reply_needed: params.get('reply_needed') === 'true' ? true : undefined,
    analysis_status: analysisStatuses.find(
      (value) => value === params.get('analysis_status'),
    ),
  }
  const emails = useEmailPage(userId, filters)
  const selected = params.get('email')
  const timezone = overview.data?.timezone ?? 'Asia/Manila'
  const connected = auth.data?.connection_status === 'connected'
  const disabled =
    !connected || auth.isError || processing || mutating || authBusy
  const filtered = !!(
    filters.priority ||
    filters.category ||
    filters.reply_needed ||
    filters.analysis_status
  )

  useEffect(() => {
    if (
      previousSelection.current &&
      !selected &&
      (closeRequested.current || navigationType === 'POP')
    ) {
      const frame = requestAnimationFrame(() => {
        if (listPane.current) listPane.current.scrollTop = listScroll.current
        if (openButton.current?.isConnected)
          openButton.current.focus({ preventScroll: true })
        else listHeading.current?.focus({ preventScroll: true })
        if (window.matchMedia?.('(max-width: 67.999rem)').matches)
          window.scrollTo({ top: pageScroll.current, behavior: 'auto' })
      })
      previousSelection.current = selected
      closeRequested.current = false
      return () => cancelAnimationFrame(frame)
    }
    previousSelection.current = selected
    closeRequested.current = false
  }, [selected, navigationType])

  function change(key: string, value: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      next.delete('offset')
      next.delete('email')
      next.delete('has_pending_action')
      return next
    })
    if (listPane.current) listPane.current.scrollTop = 0
  }
  function resetFilters() {
    setParams((previous) => {
      const next = new URLSearchParams()
      if (previous.has('sort'))
        next.set('sort', previous.get('sort') ?? 'priority_desc')
      return next
    })
    if (listPane.current) listPane.current.scrollTop = 0
  }
  function page(offset: number) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('offset', String(offset))
      next.delete('email')
      return next
    })
    if (listPane.current) listPane.current.scrollTop = 0
  }
  function openEmail(id: string) {
    openButton.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    listScroll.current = listPane.current?.scrollTop ?? 0
    pageScroll.current = window.scrollY
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('email', id)
      return next
    })
  }
  function closeDetail() {
    closeRequested.current = true
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      next.delete('email')
      return next
    })
  }

  return (
    <>
      <InboxProcessing
        userId={userId}
        syncQuery={auth.data?.sync_query ?? ''}
        disabled={!connected || auth.isError || mutating || authBusy}
        onBusyChange={setProcessing}
        lastSyncedAt={overview.data?.last_synced_at}
        timezone={timezone}
        reading={!!selected}
      >
        {overview.isError && (
          <ErrorState
            message="Could not refresh your inbox overview."
            onRetry={() => {
              void overview.refetch()
            }}
            retrying={overview.isFetching}
          />
        )}
      </InboxProcessing>
      {!connected && (
        <p className="mb-4 rounded-control border border-ink bg-highlight p-3 text-sm">
          Your saved inbox is available.{' '}
          <Link to="/settings" className="underline">
            Reconnect Gmail
          </Link>{' '}
          to sync or analyze emails.
        </p>
      )}
      <div className={selected ? 'hidden lg:block' : ''}>
        <EmailFilters
          value={filters}
          onChange={change}
          onClear={() => resetFilters()}
        />
      </div>
      <div className="grid min-w-0 gap-4 lg:h-[calc(100dvh-19rem)] lg:min-h-[28rem] lg:grid-cols-[minmax(18rem,0.4fr)_minmax(0,0.6fr)]">
        <section
          aria-labelledby="saved-emails-title"
          className={`min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-panel border border-line bg-surface lg:min-h-0 ${selected ? 'hidden lg:flex' : 'flex'}`}
        >
          <h2
            ref={listHeading}
            tabIndex={-1}
            id="saved-emails-title"
            className="sr-only"
          >
            Saved emails
          </h2>
          <div
            ref={listPane}
            className="theme-scrollbar flex min-h-0 flex-1 flex-col lg:overflow-y-auto"
          >
            {emails.isPending && (
              <LoadingIndicator label="Loading saved emails..." centered />
            )}
            {emails.isError && (
              <div className="p-4">
                <ErrorState
                  message={emails.error.message}
                  onRetry={() => {
                    void emails.refetch()
                  }}
                  retrying={emails.isFetching}
                />
              </div>
            )}
            {emails.data &&
              (emails.data.emails.length ? (
                <EmailList
                  emails={emails.data.emails}
                  timezone={timezone}
                  selectedId={selected}
                  onOpen={openEmail}
                />
              ) : (
                <div className="p-5">
                  <EmptyState
                    title={
                      filters.offset > 0
                        ? 'This page has no emails'
                        : filtered
                          ? 'No matching emails'
                          : 'Your inbox is ready for its first sync'
                    }
                    message={
                      filters.offset > 0
                        ? 'Return to the first page to see your saved emails.'
                        : filtered
                          ? 'Change or clear your filters to see more emails.'
                          : 'Use Sync inbox to import and analyze up to 20 matching Gmail messages.'
                    }
                  />
                  {filters.offset > 0 ? (
                    <Button variant="secondary" onClick={() => page(0)}>
                      First page
                    </Button>
                  ) : null}
                </div>
              ))}
          </div>
          {emails.data && (emails.data.total > 0 || filters.offset > 0) && (
            <nav
              aria-label="Email pages"
              className="cluster shrink-0 justify-between gap-2 border-t border-line bg-surface p-3"
            >
              <Button
                variant="secondary"
                className="px-3 text-xs"
                disabled={filters.offset === 0 || emails.isFetching}
                onClick={() => page(Math.max(0, filters.offset - 20))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted">
                Page {Math.floor(filters.offset / 20) + 1} /{' '}
                {Math.max(1, Math.ceil(emails.data.total / 20))} (
                {emails.data.total} emails)
              </span>
              <Button
                variant="secondary"
                className="px-3 text-xs"
                disabled={
                  filters.offset + 20 >= emails.data.total || emails.isFetching
                }
                onClick={() => page(filters.offset + 20)}
              >
                Next
              </Button>
            </nav>
          )}
        </section>
        {selected ? (
          <EmailDetail
            key={selected}
            userId={userId}
            id={selected}
            timezone={timezone}
            disabled={disabled}
            onClose={closeDetail}
          />
        ) : (
          <section
            aria-label="Email reader"
            className="hidden min-w-0 items-center justify-center rounded-panel border border-line bg-surface p-8 text-center lg:flex"
          >
            <div>
              <MailOpen
                className="mx-auto size-9 text-muted"
                aria-hidden="true"
              />
              <h2 className="mt-4 text-xl">Select an email</h2>
              <p className="mt-2 text-sm text-muted">
                Review its summary and original message here.
              </p>
            </div>
          </section>
        )}
      </div>
    </>
  )
}
