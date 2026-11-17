import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { authKey, emailKeys } from '../query/queryClient'
import { ApiError } from '../services/api'
import { listStoredEmails } from '../services/emails'
import type { AnalysisStatus, ConnectionStatus } from '../types/api'
import { useEmailMutations } from './useEmails'

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
  const { sync, analyze } = useEmailMutations(userId)
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
        if (result.errors.length) setError(result.errors[0].message)
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
          await analyze.mutateAsync(id)
          done++
          updateProgress({ completed: done })
        } catch (cause) {
          failed++
          updateProgress({ failed })
          if (!(cause instanceof ApiError)) throw cause
          if (!active.current) break
          setError(cause.message)
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
            setError(`${cause.message}${retry} Remaining work is saved.`)
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
      if (active.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Processing failed. Please try again.',
        )
    } finally {
      running.current = false
      if (active.current) setIsRunning(false)
      // Never start processing from invalidation; only read queries are refreshed.
      void client.invalidateQueries({ queryKey: emailKeys.all(userId) })
    }
  }
  return { run, isRunning, error, progress }
}
