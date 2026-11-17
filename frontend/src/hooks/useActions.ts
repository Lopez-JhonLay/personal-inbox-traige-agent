import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authKey, emailKeys } from '../query/queryClient'
import { notify } from '../notifications/toasts'
import { createAction, listActions, updateAction } from '../services/actions'
import type {
  ActionFilters,
  ActionStatus,
  CreateAction,
  ConnectionStatus,
} from '../types/api'
import { requireSession, useAuthStatus } from './useAuth'

export const actionStatuses: ActionStatus[] = [
  'pending',
  'in_progress',
  'completed',
  'dismissed',
]
export const actionLabels: Record<ActionStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  dismissed: 'Dismissed',
}

export function useActions(userId: string, filters: ActionFilters) {
  const auth = useAuthStatus()
  return useQuery({
    queryKey: [...emailKeys.all(userId), 'actions', filters],
    enabled: auth.data?.authenticated === true && auth.data.user_id === userId,
    queryFn: ({ signal }) => listActions(filters, signal),
  })
}

export function useActionMutations(userId: string) {
  const client = useQueryClient()
  const token = () => requireSession(client, userId).csrf_token
  const invalidate = () =>
    client.invalidateQueries({ queryKey: emailKeys.all(userId) })
  const current = () =>
    client.getQueryData<ConnectionStatus>(authKey)?.user_id === userId
  const create = useMutation({
    mutationKey: ['actions', userId, 'create'],
    mutationFn: (payload: CreateAction) => createAction(payload, token()),
    onSuccess: (result) => {
      if (current())
        notify(
          'success',
          result.reused ? 'Already in Actions' : 'Task added',
          result.reused
            ? `Your existing ${actionLabels[result.action.status].toLowerCase()} task was kept unchanged.`
            : 'Your new task is ready in Actions.',
        )
    },
    onSettled: invalidate,
  })
  const update = useMutation({
    mutationKey: ['actions', userId, 'update'],
    mutationFn: ({ id, status }: { id: string; status: ActionStatus }) =>
      updateAction(id, status, token()),
    onSuccess: (result) => {
      if (current())
        notify(
          'success',
          'Task updated',
          `Marked as ${actionLabels[result.status].toLowerCase()}.`,
        )
    },
    onSettled: invalidate,
  })
  return { create, update }
}
