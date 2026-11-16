import type { ConnectionStatus } from '../types/api'
import { apiRequest, apiUrl } from './api'

export function getConnectionStatus(
  signal?: AbortSignal,
): Promise<ConnectionStatus> {
  return apiRequest('/auth/status', { signal })
}

export async function disconnectGmail(csrfToken: string): Promise<boolean> {
  const result = await apiRequest<{ disconnected: boolean; revoked: boolean }>(
    '/auth/disconnect',
    {
      method: 'POST',
      csrfToken,
    },
  )
  return result.revoked
}

export function googleConnectUrl(): string {
  return apiUrl('/auth/google')
}
