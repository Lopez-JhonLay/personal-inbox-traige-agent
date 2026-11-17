import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { ApiError } from '../services/api'
import { disconnectGmail, getConnectionStatus, logout } from '../services/auth'
import { authKey, endSession } from '../query/queryClient'
import type { ConnectionStatus } from '../types/api'

export function useAuthStatus() {
  return useQuery({
    queryKey: authKey,
    queryFn: ({ signal }) => getConnectionStatus(signal),
  })
}

export function requireSession(
  client: QueryClient,
  userId: string,
): ConnectionStatus & { csrf_token: string } {
  const auth = client.getQueryData<ConnectionStatus>(authKey)
  if (auth?.authenticated && auth.user_id !== userId)
    throw new ApiError(
      'The account changed. Reload to continue.',
      'SESSION_CHANGED',
      409,
    )
  if (!auth?.authenticated || auth.user_id !== userId)
    throw new ApiError('Connect Gmail to continue.', 'AUTH_REQUIRED', 401)
  if (!auth.csrf_token)
    throw new ApiError('Reload the page and try again.', 'CSRF_INVALID', 403)
  return { ...auth, csrf_token: auth.csrf_token }
}

export function useDisconnectGmail(userId: string | null) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['auth', 'disconnect'],
    mutationFn: () =>
      disconnectGmail(requireSession(client, userId ?? '').csrf_token),
    onSuccess: async () => {
      await endSession(client)
    },
  })
}

export function useLogout(userId: string | null) {
  const client = useQueryClient()
  return useMutation({
    mutationKey: ['auth', 'logout'],
    mutationFn: () => logout(requireSession(client, userId ?? '').csrf_token),
    onSuccess: async () => {
      await endSession(client)
    },
  })
}
