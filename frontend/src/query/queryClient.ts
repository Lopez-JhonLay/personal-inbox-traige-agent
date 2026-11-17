import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '../services/api'
import type { ConnectionStatus } from '../types/api'
import type { EmailFilters } from '../types/api'

export const authKey = ['auth', 'status'] as const
export const emailKeys = {
  all: (userId: string) => ['emails', userId] as const,
  counts: (userId: string) => ['emails', userId, 'counts'] as const,
  list: (userId: string, status: string) =>
    ['emails', userId, 'list', { status, limit: 20 }] as const,
  overview: (userId: string) => ['emails', userId, 'overview'] as const,
  browse: (userId: string, filters: EmailFilters) =>
    ['emails', userId, 'browse', filters] as const,
  detail: (userId: string, id: string) =>
    ['emails', userId, 'detail', id] as const,
}

export function anonymousStatus(configured = true): ConnectionStatus {
  return {
    configured,
    authenticated: false,
    user_id: null,
    email: null,
    connection_status: 'disconnected',
    csrf_token: null,
    sync_query: '',
  }
}

export async function clearPrivateCache(
  client: QueryClient,
  userId?: string,
): Promise<void> {
  const filters = { queryKey: userId ? emailKeys.all(userId) : ['emails'] }
  await client.cancelQueries(filters)
  client.removeQueries(filters)
  client.getMutationCache().clear()
}

export async function endSession(client: QueryClient): Promise<void> {
  const configured =
    client.getQueryData<ConnectionStatus>(authKey)?.configured ?? true
  // Cancellation takes effect before awaiting it, preventing late auth reads from restoring a session.
  const cancelled = client.cancelQueries({ queryKey: authKey })
  client.setQueryData(authKey, anonymousStatus(configured))
  await cancelled
  await clearPrivateCache(client)
}

export function createQueryClient(): QueryClient {
  let previousUser: string | null | undefined
  function handleError(error: unknown) {
    if (!(error instanceof ApiError)) return
    if (
      error.code === 'AUTH_REQUIRED' ||
      (error.status === 401 && error.code !== 'GMAIL_REAUTH_REQUIRED')
    ) {
      void endSession(client)
    } else if (error.code === 'GMAIL_REAUTH_REQUIRED') {
      const auth = client.getQueryData<ConnectionStatus>(authKey)
      if (auth?.authenticated)
        client.setQueryData(authKey, {
          ...auth,
          connection_status: 'reauthorization_required',
        })
      void client.invalidateQueries({ queryKey: authKey })
    } else if (error.code === 'CSRF_INVALID') {
      void client.invalidateQueries({ queryKey: authKey })
    }
  }
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 300_000,
        retry: false,
        networkMode: 'always',
      },
      mutations: { retry: false, networkMode: 'always' },
    },
    queryCache: new QueryCache({
      onError: handleError,
      onSuccess: (data, query) => {
        if (query.queryKey[0] !== 'auth') return
        const auth = data as ConnectionStatus
        const userId = auth.authenticated ? auth.user_id : null
        if (previousUser && previousUser !== userId)
          void clearPrivateCache(client, previousUser)
        if (!userId) void clearPrivateCache(client)
        previousUser = userId
      },
    }),
    mutationCache: new MutationCache({ onError: handleError }),
  })
  return client
}
