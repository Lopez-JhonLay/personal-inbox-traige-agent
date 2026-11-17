import type {
  ActionFilters,
  ActionItem,
  ActionPage,
  ActionStatus,
  CreateAction,
  CreateActionResult,
} from '../types/api'
import { apiRequest } from './api'

export function listActions(
  filters: ActionFilters,
  signal?: AbortSignal,
): Promise<ActionPage> {
  const params = new URLSearchParams({ limit: '20' })
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value))
  }
  return apiRequest(`/actions?${params}`, { signal })
}

export function createAction(
  payload: CreateAction,
  csrfToken: string,
): Promise<CreateActionResult> {
  return apiRequest('/actions', {
    method: 'POST',
    csrfToken,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateAction(
  id: string,
  status: ActionStatus,
  csrfToken: string,
): Promise<ActionItem> {
  return apiRequest(`/actions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    csrfToken,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}
