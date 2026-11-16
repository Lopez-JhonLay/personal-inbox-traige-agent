import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { emailKeys } from '../query/queryClient'
import { ApiError } from '../services/api'
import {
  analyzeStoredEmail,
  listStoredEmails,
  syncInbox,
} from '../services/emails'
import type { ProcessingCounts } from '../types/api'
import { requireSession, useAuthStatus } from './useAuth'

export function useProcessingCounts(userId: string) {
  const auth = useAuthStatus()
  return useQuery({
    queryKey: emailKeys.counts(userId),
    enabled: auth.data?.authenticated === true && auth.data.user_id === userId,
    queryFn: async ({ signal }): Promise<ProcessingCounts> => {
      const [pending, processing, completed, failed] = await Promise.all([
        listStoredEmails('pending', 1, signal),
        listStoredEmails('processing', 1, signal),
        listStoredEmails('completed', 1, signal),
        listStoredEmails('failed', 1, signal),
      ])
      return {
        pending: pending.total + processing.total,
        completed: completed.total,
        failed: failed.total,
      }
    },
  })
}

export function useEmailMutations(userId: string) {
  const client = useQueryClient()
  function token() {
    const auth = requireSession(client, userId)
    if (auth.connection_status !== 'connected')
      throw new ApiError(
        'Reconnect Gmail to continue.',
        'GMAIL_REAUTH_REQUIRED',
        401,
      )
    return auth.csrf_token
  }
  function invalidate() {
    void client.invalidateQueries({ queryKey: emailKeys.all(userId) })
  }
  const sync = useMutation({
    mutationKey: ['emails', userId, 'sync'],
    mutationFn: () => syncInbox(token()),
    onSettled: invalidate,
  })
  const analyze = useMutation({
    mutationKey: ['emails', userId, 'analyze'],
    mutationFn: (id: string) => analyzeStoredEmail(id, token()),
    onSettled: invalidate,
  })
  return { sync, analyze }
}
