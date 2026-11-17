import { act, renderHook, waitFor } from '@testing-library/react'
import { onlineManager } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api'
import {
  analyzeStoredEmail,
  listStoredEmails,
  syncInbox,
} from '../services/emails'
import {
  deferred,
  harness,
  testAnalysis,
  testAuth,
  testSync,
} from '../test/helpers'
import { authKey, emailKeys } from '../query/queryClient'
import { useInboxProcessing } from './useInboxProcessing'

it('reads the current CSRF token separately for each email', async () => {
  const { client, wrapper } = harness()
  vi.mocked(analyzeStoredEmail).mockImplementationOnce(async () => {
    client.setQueryData(authKey, { ...testAuth, csrf_token: 'rotated' })
    return testAnalysis
  })
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(analyzeStoredEmail).toHaveBeenNthCalledWith(1, 'one', 'synthetic-csrf')
  expect(analyzeStoredEmail).toHaveBeenNthCalledWith(2, 'two', 'rotated')
})

it('stops the batch when the active account changes', async () => {
  const { client, wrapper } = harness()
  vi.mocked(analyzeStoredEmail).mockImplementationOnce(async () => {
    client.setQueryData(authKey, { ...testAuth, user_id: 'user-b' })
    return testAnalysis
  })
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
  expect(client.getQueryData(authKey)).toMatchObject({ user_id: 'user-b' })
})

vi.mock('../services/emails', () => ({
  syncInbox: vi.fn(),
  analyzeStoredEmail: vi.fn(),
  listStoredEmails: vi.fn(),
}))
beforeEach(() => {
  vi.mocked(syncInbox).mockResolvedValue({ ...testSync })
  vi.mocked(analyzeStoredEmail).mockResolvedValue(testAnalysis)
  vi.mocked(listStoredEmails).mockResolvedValue({
    emails: [],
    total: 0,
    limit: 20,
    offset: 0,
  })
})
afterEach(() => {
  onlineManager.setOnline(true)
})

it('counts created tasks and automation warnings without failing successful analyses', async () => {
  const { wrapper } = harness()
  vi.mocked(analyzeStoredEmail)
    .mockResolvedValueOnce({
      ...testAnalysis,
      auto_action: { status: 'created', action_id: 'task' },
    })
    .mockResolvedValueOnce({
      ...testAnalysis,
      auto_action: { status: 'unavailable', error_code: 'AI_TIMEOUT' },
    })
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(result.current.progress).toMatchObject({
    phase: 'finished',
    completed: 2,
    failed: 0,
    tasksCreated: 1,
    automationWarnings: 1,
  })
})

it('preserves the successful analysis and pauses remaining work on a task-stage rate limit', async () => {
  const { wrapper } = harness()
  vi.mocked(analyzeStoredEmail).mockResolvedValueOnce({
    ...testAnalysis,
    auto_action: {
      status: 'unavailable',
      error_code: 'AI_RATE_LIMITED',
      retry_after: '30',
    },
  })
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
  expect(result.current.progress).toMatchObject({
    phase: 'paused',
    completed: 1,
    failed: 0,
    automationWarnings: 1,
    retryAfter: '30',
  })
  expect(result.current.error).toContain('Analysis saved.')
})

it('does no inference on mount and processes confirmed work one request at a time', async () => {
  const { wrapper } = harness()
  const first = deferred<typeof testAnalysis>()
  vi.mocked(analyzeStoredEmail).mockReturnValueOnce(first.promise)
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  expect(syncInbox).not.toHaveBeenCalled()
  expect(result.current.progress.phase).toBe('idle')
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
  let run: Promise<void> | undefined
  await act(async () => {
    run = result.current.run('sync')
    await Promise.resolve()
  })
  await waitFor(() => expect(analyzeStoredEmail).toHaveBeenCalledTimes(1))
  expect(analyzeStoredEmail).toHaveBeenCalledWith('one', 'synthetic-csrf')
  expect(result.current.progress).toMatchObject({
    phase: 'analyzing',
    current: 1,
    total: 2,
    completed: 0,
  })
  await act(async () => {
    first.resolve(testAnalysis)
    await run
  })
  expect(analyzeStoredEmail).toHaveBeenNthCalledWith(2, 'two', 'synthetic-csrf')
  await waitFor(() => expect(result.current.progress.completed).toBe(2))
  expect(result.current.progress).toMatchObject({
    phase: 'finished',
    completed: 2,
    failed: 0,
    total: 2,
  })
})

it('pauses on rate limits, saves the failed status refresh, and never automatically retries', async () => {
  const { client, wrapper } = harness()
  client.setQueryData(emailKeys.counts('user-a'), {
    pending: 2,
    completed: 0,
    failed: 0,
  })
  vi.mocked(analyzeStoredEmail).mockRejectedValue(
    new ApiError('Try later.', 'AI_RATE_LIMITED', 429, '15'),
  )
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
  expect(result.current.error).toContain('15 seconds')
  expect(result.current.error).toContain('Remaining work is saved')
  expect(result.current.progress).toMatchObject({
    phase: 'paused',
    failed: 1,
    completed: 0,
    total: 2,
    errorCode: 'AI_RATE_LIMITED',
    retryAfter: '15',
  })
  expect(client.getQueryState(emailKeys.counts('user-a'))?.isInvalidated).toBe(
    true,
  )
})

it('continues after a single invalid output and invalidates stored counts', async () => {
  const { client, wrapper } = harness()
  client.setQueryData(emailKeys.counts('user-a'), {
    pending: 2,
    completed: 0,
    failed: 0,
  })
  vi.mocked(analyzeStoredEmail)
    .mockRejectedValueOnce(
      new ApiError('Invalid output.', 'AI_INVALID_OUTPUT', 502),
    )
    .mockResolvedValue(testAnalysis)
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(2)
  expect(result.current.progress).toMatchObject({
    completed: 1,
    failed: 1,
    phase: 'finished',
  })
  expect(client.getQueryState(emailKeys.counts('user-a'))?.isInvalidated).toBe(
    true,
  )
})

it('unmounting during import prevents all further analysis scheduling', async () => {
  const { wrapper } = harness()
  const importing = deferred<typeof testSync>()
  vi.mocked(syncInbox).mockReturnValue(importing.promise)
  const { result, unmount } = renderHook(() => useInboxProcessing('user-a'), {
    wrapper,
  })
  let run: Promise<void> | undefined
  await act(async () => {
    run = result.current.run('sync')
    await Promise.resolve()
  })
  unmount()
  await act(async () => {
    importing.resolve(testSync)
    await run
  })
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('unmounting during analysis allows its result but never schedules the next email', async () => {
  const { wrapper } = harness()
  const analyzing = deferred<typeof testAnalysis>()
  vi.mocked(analyzeStoredEmail).mockReturnValue(analyzing.promise)
  const { result, unmount } = renderHook(() => useInboxProcessing('user-a'), {
    wrapper,
  })
  let run: Promise<void> | undefined
  await act(async () => {
    run = result.current.run('sync')
    await Promise.resolve()
  })
  await waitFor(() => expect(analyzeStoredEmail).toHaveBeenCalledTimes(1))
  unmount()
  await act(async () => {
    analyzing.resolve(testAnalysis)
    await run
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
})

it('does not queue failed offline mutations to replay after reconnect', async () => {
  onlineManager.setOnline(false)
  vi.mocked(syncInbox).mockRejectedValue(
    new ApiError('Unavailable.', 'NETWORK_ERROR'),
  )
  const { wrapper } = harness()
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('sync')
  })
  expect(syncInbox).toHaveBeenCalledTimes(1)
  await act(async () => {
    onlineManager.setOnline(true)
  })
  expect(syncInbox).toHaveBeenCalledTimes(1)
  expect(analyzeStoredEmail).not.toHaveBeenCalled()
})

it('resumes processing and pending records without duplicates, and retries only failed records', async () => {
  vi.mocked(listStoredEmails).mockImplementation(async (status) => ({
    emails: [
      {
        id: status === 'failed' ? 'failed-one' : 'one',
        subject: 'Synthetic',
        analysis_status: status,
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  }))
  const { wrapper } = harness()
  const { result } = renderHook(() => useInboxProcessing('user-a'), { wrapper })
  await act(async () => {
    await result.current.run('pending')
  })
  expect(analyzeStoredEmail).toHaveBeenCalledTimes(1)
  await act(async () => {
    await result.current.run('failed')
  })
  expect(analyzeStoredEmail).toHaveBeenLastCalledWith(
    'failed-one',
    'synthetic-csrf',
  )
  expect(syncInbox).not.toHaveBeenCalled()
})
