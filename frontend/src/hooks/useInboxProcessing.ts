import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { authKey, emailKeys } from '../query/queryClient'
import { ApiError } from '../services/api'
import { listStoredEmails } from '../services/emails'
import type { AnalysisStatus, ConnectionStatus } from '../types/api'
import { useEmailMutations } from './useEmails'
import { friendlyError, notify } from '../notifications/toasts'

export type ProcessingAction = 'sync' | 'pending' | 'failed'
export interface ProcessingProgress {
  phase:
    | 'idle'
    | 'preparing'
    | 'syncing'
    | 'analyzing'
    | 'finished'
    | 'paused'
    | 'failed'
  total: number
  current: number
  completed: number
  failed: number
  imported: number
  existing: number
  importFailed: number
  deferred: number
  errorCode: string | null
  retryAfter: string | null
  tasksCreated: number
  automationWarnings: number
}
const initialProgress: ProcessingProgress = {
  phase: 'idle',
  total: 0,
  current: 0,
  completed: 0,
  failed: 0,
  imported: 0,
  existing: 0,
  importFailed: 0,
  deferred: 0,
  errorCode: null,
  retryAfter: null,
  tasksCreated: 0,
  automationWarnings: 0,
}
const pauseCodes = new Set([
  'AI_RATE_LIMITED',
  'OPERATION_IN_PROGRESS',
  'OPERATION_EXPIRED',
  'AUTH_REQUIRED',
  'GMAIL_REAUTH_REQUIRED',
  'AI_NOT_CONFIGURED',
  'DATABASE_UNAVAILABLE',
  'NETWORK_ERROR',
  'INVALID_RESPONSE',
  'SESSION_CHANGED',
  'CSRF_INVALID',
])

export function useInboxProcessing(userId: string) {
  const client = useQueryClient()
  const { sync, analyze } = useEmailMutations(userId, true)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState<ProcessingProgress>(initialProgress)
  const active = useRef(true)
  const running = useRef(false)

  function updateProgress(patch: Partial<ProcessingProgress>) {
    if (active.current) setProgress((previous) => ({ ...previous, ...patch }))
  }

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  function stillCurrent() {
    const auth = client.getQueryData<ConnectionStatus>(authKey)
    return (
      active.current &&
      auth?.authenticated &&
      auth.user_id === userId &&
      auth.connection_status === 'connected'
    )
  }

  function list(status: AnalysisStatus) {
    return client.fetchQuery({
      queryKey: emailKeys.list(userId, status),
      staleTime: 0,
      queryFn: ({ signal }) => listStoredEmails(status, 20, signal),
    })
  }

  async function run(action: ProcessingAction) {
    if (running.current || !stillCurrent()) return
    running.current = true
    setIsRunning(true)
    setError('')
    setProgress({ ...initialProgress, phase: 'preparing' })
    let done = 0
    let failed = 0
    let paused = false
    let lastError = ''
    function recordError(message: string) {
      lastError = message
      if (active.current) setError(message)
    }
    let tasksCreated = 0
    let automationWarnings = 0
    try {
      let ids: string[]
      if (action === 'sync') {
        updateProgress({ phase: 'syncing' })
        const result = await sync.mutateAsync()
        if (!stillCurrent()) {
          updateProgress({ phase: 'paused' })
          return
        }
        updateProgress({
          imported: result.imported,
          existing: result.existing,
          importFailed: result.failed,
          deferred: result.deferred,
          errorCode: result.errors[0]?.code ?? null,
        })
        if (result.errors.length) recordError(result.errors[0].message)
        ids = result.errors.some((item) =>
          [
            'GMAIL_RATE_LIMITED',
            'GMAIL_REAUTH_REQUIRED',
            'OPERATION_EXPIRED',
          ].includes(item.code),
        )
          ? []
          : result.pending_email_ids
        paused =
          result.deferred > 0 || (result.errors.length > 0 && ids.length === 0)
      } else if (action === 'failed') {
        ids = (await list('failed')).emails.map((email) => email.id)
      } else {
        const [pending, processing] = await Promise.all([
          list('pending'),
          list('processing'),
        ])
        ids = [
          ...new Set(
            [...processing.emails, ...pending.emails].map((email) => email.id),
          ),
        ].slice(0, 20)
      }
      updateProgress({ total: ids.length })
      for (const [index, id] of ids.entries()) {
        if (!stillCurrent()) {
          paused = true
          break
        }
        updateProgress({ phase: 'analyzing', current: index + 1 })
        try {
          const result = await analyze.mutateAsync(id)
          done++
          if (result.auto_action?.status === 'created') tasksCreated++
          if (result.auto_action?.status === 'unavailable') automationWarnings++
          updateProgress({ completed: done, tasksCreated, automationWarnings })
          if (result.auto_action?.error_code === 'AI_RATE_LIMITED') {
            paused = true
            const retry = result.auto_action.retry_after
            const retryMessage = retry
              ? /^\d+$/.test(retry)
                ? ` Retry in ${retry} seconds.`
                : ` Retry after ${retry}.`
              : ''
            updateProgress({
              errorCode: 'AI_RATE_LIMITED',
              retryAfter: retry ?? null,
            })
            if (active.current)
              recordError(
                `Analysis saved. Automatic task creation is rate limited.${retryMessage} Remaining work is saved.`,
              )
            break
          }
        } catch (cause) {
          failed++
          updateProgress({ failed })
          if (!(cause instanceof ApiError)) throw cause
          if (!active.current) break
          recordError(friendlyError(cause))
          updateProgress({
            errorCode: cause.code,
            retryAfter: cause.retryAfter,
          })
          if (pauseCodes.has(cause.code)) {
            paused = true
            const retry = cause.retryAfter
              ? /^\d+$/.test(cause.retryAfter)
                ? ` Retry in ${cause.retryAfter} seconds.`
                : ` Retry after ${cause.retryAfter}.`
              : ''
            recordError(
              `${friendlyError(cause)}${retry} Remaining work is saved.`,
            )
            break
          }
        }
      }
      updateProgress({ phase: paused ? 'paused' : 'finished' })
    } catch (cause) {
      updateProgress({
        phase: 'failed',
        errorCode: cause instanceof ApiError ? cause.code : null,
        retryAfter: cause instanceof ApiError ? cause.retryAfter : null,
      })
      if (active.current) recordError(friendlyError(cause))
    } finally {
      if (stillCurrent()) {
        const summary =
          done === 0
            ? 'No new emails needed analysis.'
            : `${done} email${done === 1 ? '' : 's'} analyzed. ${tasksCreated} task${tasksCreated === 1 ? '' : 's'} added to Actions.`
        if (lastError)
          notify(
            'error',
            paused ? 'Processing paused' : "Couldn't finish processing",
            lastError,
          )
        else if (failed || automationWarnings || paused)
          notify(
            'warning',
            'Inbox update needs attention',
            `${summary} ${automationWarnings ? "Some tasks couldn't be added automatically; you can add them manually." : 'Some work is still unfinished. You can continue from your inbox.'}`,
          )
        else notify('success', 'Inbox updated', summary)
      }
      running.current = false
      if (active.current) setIsRunning(false)
      // Never start processing from invalidation; only read queries are refreshed.
      void client.invalidateQueries({ queryKey: emailKeys.all(userId) })
    }
  }
  return { run, isRunning, error, progress }
}
