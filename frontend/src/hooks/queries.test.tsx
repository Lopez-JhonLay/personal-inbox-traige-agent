import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { authKey, emailKeys, endSession } from '../query/queryClient'
import { ApiError } from '../services/api'
import { disconnectGmail, getConnectionStatus } from '../services/auth'
import { analyzeStoredEmail, listStoredEmails } from '../services/emails'
import { deferred, harness, testAnalysis, testAuth } from '../test/helpers'
import { useAuthStatus, useDisconnectGmail } from './useAuth'
import { useEmailMutations, useProcessingCounts } from './useEmails'

it('Gmail reauthorization preserves the signed-in user and stored counts', async () => {
  const { client, wrapper } = harness()
  client.setQueryData(emailKeys.counts('user-a'), {
    pending: 0,
    completed: 2,
    failed: 0,
  })
  vi.mocked(getConnectionStatus).mockResolvedValue({
    ...testAuth,
    connection_status: 'reauthorization_required',
  })
  const { result } = renderHook(
    () => ({ auth: useAuthStatus(), ...useEmailMutations('user-a') }),
    { wrapper },
  )
  vi.mocked(analyzeStoredEmail).mockRejectedValue(
    new ApiError('Reconnect.', 'GMAIL_REAUTH_REQUIRED', 401),
  )
  await act(async () => {
    await result.current.analyze.mutateAsync('one').catch(() => {})
  })
  await waitFor(() =>
    expect(result.current.auth.data?.connection_status).toBe(
      'reauthorization_required',
    ),
  )
  expect(client.getQueryData(authKey)).toMatchObject({
    authenticated: true,
    user_id: 'user-a',
  })
  expect(client.getQueryData(emailKeys.counts('user-a'))).toMatchObject({
    completed: 2,
  })
})

vi.mock('../services/auth', () => ({
  getConnectionStatus: vi.fn(),
  disconnectGmail: vi.fn(),
}))
vi.mock('../services/emails', () => ({
  listStoredEmails: vi.fn(),
  analyzeStoredEmail: vi.fn(),
  syncInbox: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(getConnectionStatus).mockResolvedValue({ ...testAuth })
  vi.mocked(listStoredEmails).mockImplementation(
    async (status, limit = 20) => ({
      emails: [],
      total: status === 'completed' ? 2 : 0,
      limit,
      offset: 0,
    }),
  )
})

it('deduplicates auth reads shared by multiple observers', async () => {
  const { wrapper } = harness(null)
  const first = renderHook(() => useAuthStatus(), { wrapper })
  renderHook(() => useAuthStatus(), { wrapper })
  await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
  expect(getConnectionStatus).toHaveBeenCalledTimes(1)
})

it('does not fetch private counts while anonymous or for a different user', async () => {
  const { client, wrapper } = harness({
    ...testAuth,
    authenticated: false,
    user_id: null,
  })
  const { result } = renderHook(() => useProcessingCounts('user-a'), {
    wrapper,
  })
  await act(async () => {
    await Promise.resolve()
  })
  expect(listStoredEmails).not.toHaveBeenCalled()
  act(() => {
    client.setQueryData(authKey, testAuth)
  })
  await waitFor(() => expect(result.current.data?.completed).toBe(2))
  const other = renderHook(() => useProcessingCounts('user-b'), { wrapper })
  expect(other.result.current.data).toBeUndefined()
  expect(listStoredEmails).toHaveBeenCalledTimes(4)
})

it('preserves cached counts when a refresh fails and supports an explicit read retry', async () => {
  const { client, wrapper } = harness()
  const { result } = renderHook(
    () => {
      const { data, isError, isSuccess, refetch } =
        useProcessingCounts('user-a')
      return { data, isError, isSuccess, refetch }
    },
    {
      wrapper,
    },
  )
  await waitFor(() => expect(result.current.data?.completed).toBe(2))
  vi.mocked(listStoredEmails).mockRejectedValue(
    new ApiError('Unavailable.', 'NETWORK_ERROR'),
  )
  await act(async () => {
    await client.invalidateQueries({ queryKey: emailKeys.counts('user-a') })
  })
  await waitFor(() => expect(result.current.isError).toBe(true))
  expect(result.current.data?.completed).toBe(2)
  expect(client.getQueryData(authKey)).toEqual(testAuth)
  vi.mocked(listStoredEmails).mockResolvedValue({
    emails: [],
    total: 0,
    limit: 1,
    offset: 0,
  })
  await act(async () => {
    await result.current.refetch()
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('disconnect clears private queries and mutation data after the server succeeds', async () => {
  const { client, wrapper } = harness()
  client.setQueryData(emailKeys.counts('user-a'), { completed: 2 })
  vi.mocked(disconnectGmail).mockResolvedValue(true)
  const { result } = renderHook(() => useDisconnectGmail('user-a'), { wrapper })
  await act(async () => {
    await result.current.mutateAsync()
  })
  expect(disconnectGmail).toHaveBeenCalledWith('synthetic-csrf')
  expect(client.getQueryData(emailKeys.counts('user-a'))).toBeUndefined()
  expect(client.getQueryData(authKey)).toMatchObject({
    authenticated: false,
    csrf_token: null,
  })
  expect(client.getMutationCache().getAll()).toHaveLength(0)
})

it('session expiration cancels late reads so private data cannot repopulate', async () => {
  const { client } = harness()
  const late = deferred<{ completed: number }>()
  let signal: AbortSignal | undefined
  const pending = client
    .fetchQuery({
      queryKey: emailKeys.counts('user-a'),
      queryFn: (context) => {
        signal = context.signal
        return late.promise
      },
    })
    .catch(() => null)
  await endSession(client)
  expect(signal?.aborted).toBe(true)
  late.resolve({ completed: 99 })
  await pending
  expect(client.getQueryData(emailKeys.counts('user-a'))).toBeUndefined()
  expect(client.getQueryData(authKey)).toMatchObject({ authenticated: false })
})

it('switching accounts clears the previous account cache', async () => {
  const { client } = harness(null)
  await client.fetchQuery({ queryKey: authKey, queryFn: async () => testAuth })
  client.setQueryData(emailKeys.counts('user-a'), { completed: 2 })
  await client.fetchQuery({
    queryKey: authKey,
    staleTime: 0,
    queryFn: async () => ({ ...testAuth, user_id: 'user-b' }),
  })
  await waitFor(() =>
    expect(client.getQueryData(emailKeys.counts('user-a'))).toBeUndefined(),
  )
  expect(client.getQueryData(authKey)).toMatchObject({ user_id: 'user-b' })
})

it('clears private data on AUTH_REQUIRED, while preserving it on temporary errors', async () => {
  const { client, wrapper } = harness()
  client.setQueryData(emailKeys.counts('user-a'), { completed: 2 })
  const { result } = renderHook(() => useEmailMutations('user-a'), { wrapper })
  vi.mocked(analyzeStoredEmail).mockRejectedValue(
    new ApiError('Unavailable.', 'NETWORK_ERROR'),
  )
  await act(async () => {
    await result.current.analyze.mutateAsync('one').catch(() => {})
  })
  expect(client.getQueryData(authKey)).toMatchObject({ authenticated: true })
  vi.mocked(analyzeStoredEmail).mockRejectedValue(
    new ApiError('Connect again.', 'AUTH_REQUIRED', 401),
  )
  await act(async () => {
    await result.current.analyze.mutateAsync('one').catch(() => {})
  })
  await waitFor(() =>
    expect(client.getQueryData(emailKeys.counts('user-a'))).toBeUndefined(),
  )
  expect(client.getQueryData(authKey)).toMatchObject({ authenticated: false })
})

it('refreshes a rejected CSRF token without replaying the mutation', async () => {
  const { wrapper } = harness()
  const { result } = renderHook(
    () => ({ auth: useAuthStatus(), ...useEmailMutations('user-a') }),
    { wrapper },
  )
  vi.mocked(getConnectionStatus).mockResolvedValue({
    ...testAuth,
    csrf_token: 'new-token',
  })
  vi.mocked(analyzeStoredEmail)
    .mockRejectedValueOnce(new ApiError('Reload.', 'CSRF_INVALID', 403))
    .mockResolvedValue(testAnalysis)
  await act(async () => {
    await result.current.analyze.mutateAsync('one').catch(() => {})
  })
  await waitFor(() =>
    expect(result.current.auth.data?.csrf_token).toBe('new-token'),
  )
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
  await act(async () => {
    await result.current.analyze.mutateAsync('one')
  })
  expect(analyzeStoredEmail).toHaveBeenLastCalledWith('one', 'new-token')
})
