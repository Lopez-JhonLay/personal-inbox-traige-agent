import { describe, expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers'
import { ApiError, apiRequest } from './api'

describe('shared API client', () => {
  it('unwraps successful data, includes cookies and passes the GET cancellation signal', async () => {
    const controller = new AbortController()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, data: { total: 2 } }),
    )
    expect(await apiRequest('/emails', { signal: controller.signal })).toEqual({
      total: 2,
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/emails',
      expect.objectContaining({
        credentials: 'include',
        signal: controller.signal,
      }),
    )
  })
  it('adds CSRF to mutations and refuses a missing token before sending', async () => {
    await expect(
      apiRequest('/emails/sync', { method: 'POST' }),
    ).rejects.toMatchObject({ code: 'CSRF_INVALID', status: 403 })
    expect(fetch).not.toHaveBeenCalled()
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, data: {} }),
    )
    await apiRequest('/emails/sync', { method: 'POST', csrfToken: 'fresh' })
    const init = vi.mocked(fetch).mock.calls[0][1]
    expect(new Headers(init?.headers).get('X-CSRF-Token')).toBe('fresh')
  })
  it('preserves safe server errors and retry guidance', async () => {
    const response = jsonResponse(
      {
        success: false,
        error: { code: 'AI_RATE_LIMITED', message: 'Try later.' },
      },
      429,
    )
    response.headers.set('Retry-After', '15')
    vi.mocked(fetch).mockResolvedValue(response)
    await expect(apiRequest('/emails')).rejects.toMatchObject({
      code: 'AI_RATE_LIMITED',
      message: 'Try later.',
      status: 429,
      retryAfter: '15',
    })
  })
  it('does not expose raw HTML error bodies', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>private trace</html>', { status: 500 }),
    )
    await expect(apiRequest('/emails')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 500,
    })
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ trace: 'private trace' }, 500),
    )
    await expect(apiRequest('/emails')).rejects.toMatchObject({
      message: 'The request failed. Please try again.',
    })
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: { message: 'private upstream trace' } }, 502),
    )
    await expect(apiRequest('/emails')).rejects.toMatchObject({
      message: 'The request failed. Please try again.',
    })
  })
  it.each([null, [], { success: true }, { data: {} }])(
    'rejects a malformed envelope: %j',
    async (data) => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse(data))
      await expect(apiRequest('/emails')).rejects.toBeInstanceOf(ApiError)
    },
  )
  it('converts network failures into a public error without retrying', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('private transport detail'))
    await expect(apiRequest('/emails')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      message: 'Could not reach Mailkind. Please try again.',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('preserves cancellation instead of treating it as a session or transport failure', async () => {
    const controller = new AbortController()
    const error = new DOMException('Cancelled', 'AbortError')
    controller.abort()
    vi.mocked(fetch).mockRejectedValue(error)
    await expect(
      apiRequest('/emails', { signal: controller.signal }),
    ).rejects.toBe(error)
  })
})
