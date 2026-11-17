export interface ConnectionStatus {
  configured: boolean
  authenticated: boolean
  user_id: string | null
  email: string | null
  display_name?: string | null
  picture_url?: string | null
  connection_status: string
  csrf_token: string | null
  sync_query: string
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed'
export interface StoredEmail {
  id: string
  subject: string | null
  analysis_status: AnalysisStatus
  sender?: string | null
  received_at?: string | null
  latest_completed_analysis?: StoredAnalysis | null
}
export interface StoredAnalysis {
  id: string
  summary?: string
  category?: string
  priority?: string
  deadline?: string
  deadline_text?: string
  requested_action?: string
  suggested_action?: string
  reply_needed?: boolean
  draft_reply?: string
}
export interface EmailDetail extends StoredEmail {
  body: string | null
}
export interface EmailFilters {
  offset: number
  priority?: string
  category?: string
  reply_needed?: boolean
  has_pending_action?: boolean
  analysis_status?: AnalysisStatus
  sort: 'received_desc' | 'received_asc' | 'priority_desc'
}
export interface InboxOverview {
  email: string
  timezone: string
  last_synced_at: string | null
  analyzed_count: number
  high_priority_count: number
  reply_needed_count: number
  pending_action_count: number
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
  auto_action?: AutoActionResult
}
export interface AutoActionResult {
  status: 'created' | 'existing' | 'not_needed' | 'unavailable' | 'skipped'
  action_id?: string
  error_code?: string
  retry_after?: string
}
export interface ProcessingCounts {
  pending: number
  completed: number
  failed: number
}

export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'dismissed'
export interface ActionItem {
  id: string
  email_id: string
  description: string
  due_date: string | null
  status: ActionStatus
  created_at: string
  updated_at: string
  email_subject: string | null
  email_sender: string | null
}
export interface ActionFilters {
  status?: ActionStatus
  email_id?: string
  offset: number
}
export interface ActionPage {
  actions: ActionItem[]
  total: number
  limit: number
  offset: number
}
export interface CreateAction {
  email_id: string
  description: string
  due_date: string | null
}
export interface CreateActionResult {
  action: ActionItem
  reused: boolean
}
