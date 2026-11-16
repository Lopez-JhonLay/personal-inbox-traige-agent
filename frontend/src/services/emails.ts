import type {
  AnalysisResult,
  AnalysisStatus,
  EmailPage,
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
): Promise<AnalysisResult> {
  return apiRequest(`/emails/${id}/analyze`, { method: 'POST', csrfToken })
}
