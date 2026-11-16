import { apiFetch } from './api'

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export interface StoredEmail {
  id: string
  subject: string | null
  analysis_status: AnalysisStatus
}
export interface EmailPage {
  emails: StoredEmail[]
  total: number
  limit: number
  offset: number
}
export interface SyncResult {
  imported: number
  existing: number
  failed: number
  deferred: number
  pending_email_ids: string[]
  errors: { code: string; message: string }[]
}

export class EmailApiError extends Error {
  code: string
  retryAfter: string | null
  constructor(message: string, code: string, retryAfter: string | null = null) {
    super(message)
    this.code = code
    this.retryAfter = retryAfter
  }
}

async function emailRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await apiFetch(`/emails${path}`, init)
  } catch {
    throw new EmailApiError(
      'Could not reach Mailkind. Reload and continue when available.',
      'NETWORK_ERROR',
    )
  }
  const result: { data: T; error?: { code: string; message: string } } =
    await response.json().catch(() => {
      throw new EmailApiError(
        'Could not read the server response. Reload to check saved progress.',
        'NETWORK_ERROR',
      )
    })
  if (!response.ok)
    throw new EmailApiError(
      result.error?.message ?? 'Email processing failed.',
      result.error?.code ?? 'REQUEST_FAILED',
      response.headers.get('Retry-After'),
    )
  return result.data
}

export function listStoredEmails(
  status: AnalysisStatus,
  limit = 20,
): Promise<EmailPage> {
  return emailRequest(`?analysis_status=${status}&limit=${limit}`)
}

export function syncInbox(csrf: string): Promise<SyncResult> {
  return emailRequest('/sync', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
  })
}

export function analyzeStoredEmail(id: string, csrf: string): Promise<unknown> {
  return emailRequest(`/${id}/analyze`, {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrf },
  })
}
