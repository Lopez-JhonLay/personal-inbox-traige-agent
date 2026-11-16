import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { authKey, emailKeys } from '../query/queryClient'
import { ApiError } from '../services/api'
import { listStoredEmails } from '../services/emails'
import type { AnalysisStatus, ConnectionStatus } from '../types/api'
import { useEmailMutations } from './useEmails'

export type ProcessingAction = 'sync' | 'pending' | 'failed'
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
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const active = useRef(true)
  const running = useRef(false)

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
    setMessage('Preparing emails…')
    let imported = ''
    let done = 0
    let failed = 0
    try {
      let ids: string[]
      if (action === 'sync') {
        const result = await sync.mutateAsync()
        if (!stillCurrent()) return
        imported = `${result.imported} imported, ${result.existing} already stored, ${result.failed} import failures, ${result.deferred} deferred. `
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
      for (const [index, id] of ids.entries()) {
        if (!stillCurrent()) break
        setMessage(`${imported}Analyzing ${index + 1} of ${ids.length}…`)
        try {
          await analyze.mutateAsync(id)
          done++
        } catch (cause) {
          failed++
          if (!(cause instanceof ApiError)) throw cause
          if (!active.current) break
          setError(cause.message)
          if (pauseCodes.has(cause.code)) {
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
      if (active.current)
        setMessage(
          `${imported}${done} analyzed, ${failed} analysis failures in this run. Pending work can be continued below.`,
        )
    } catch (cause) {
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
  return { run, isRunning, message, error }
}
