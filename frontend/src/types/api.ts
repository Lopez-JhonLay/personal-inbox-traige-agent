export interface ConnectionStatus {
  configured: boolean
  authenticated: boolean
  user_id: string | null
  email: string | null
  connection_status: string
  csrf_token: string | null
  sync_query: string
}

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
export interface AnalysisResult {
  analysis: {
    id: string
    status: AnalysisStatus
    model_identifier: string | null
  }
  reused: boolean
}
export interface ProcessingCounts {
  pending: number
  completed: number
  failed: number
}
