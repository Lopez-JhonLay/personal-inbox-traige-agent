import type {
  AnalysisResult,
  AnalysisStatus,
  EmailPage,
  EmailDetail,
  EmailFilters,
  InboxOverview,
  SyncResult,
} from '../types/api'
import { apiRequest } from './api'

export function listStoredEmails(
  status: AnalysisStatus,
  limit = 20,
  signal?: AbortSignal,
): Promise<EmailPage> {
  return apiRequest(`/emails?analysis_status=${status}&limit=${limit}`, {
    signal,
  })
}

export function syncInbox(csrfToken: string): Promise<SyncResult> {
  return apiRequest('/emails/sync', { method: 'POST', csrfToken })
}

export function analyzeStoredEmail(
  id: string,
  csrfToken: string,
  force = false,
): Promise<AnalysisResult> {
  return apiRequest(`/emails/${id}/analyze`, {
    method: 'POST',
    csrfToken,
    ...(force
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        }
      : {}),
  })
}

export function getOverview(signal?: AbortSignal): Promise<InboxOverview> {
  return apiRequest('/emails/overview', { signal })
}

export function getEmail(
  id: string,
  signal?: AbortSignal,
): Promise<EmailDetail> {
  return apiRequest(`/emails/${encodeURIComponent(id)}`, { signal })
}

export function browseEmails(
  filters: EmailFilters,
  signal?: AbortSignal,
): Promise<EmailPage> {
  const params = new URLSearchParams({ limit: '20' })
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value))
  }
  return apiRequest(`/emails?${params}`, { signal })
}
