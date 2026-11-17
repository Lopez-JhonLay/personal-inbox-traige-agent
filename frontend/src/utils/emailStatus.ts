import type { AnalysisStatus } from '../types/api'

export const analysisStatuses: AnalysisStatus[] = [
  'pending',
  'processing',
  'completed',
  'failed',
]
export const analysisLabels: Record<AnalysisStatus, string> = {
  pending: 'Waiting for analysis',
  processing: 'Analyzing',
  completed: 'Analyzed',
  failed: 'Analysis failed',
}
