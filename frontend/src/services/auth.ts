import { apiFetch } from './api'

export interface ConnectionStatus {
  configured: boolean
  authenticated: boolean
  user_id: string | null
  email: string | null
  connection_status: string
  csrf_token: string | null
  sync_query: string
}

export async function getConnectionStatus(): Promise<ConnectionStatus> {
  const response = await apiFetch('/auth/status')
  if (!response.ok) throw new Error('Could not check your Gmail connection.')
  const result: { data: ConnectionStatus } = await response.json()
  return result.data
}

export async function disconnectGmail(csrfToken: string): Promise<boolean> {
  const response = await apiFetch('/auth/disconnect', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  })
  if (!response.ok)
    throw new Error('Could not disconnect Gmail. Please try again.')
  const result: { data: { revoked: boolean } } = await response.json()
  return result.data.revoked
}

export function googleConnectUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
  return `${base}/auth/google`
}
