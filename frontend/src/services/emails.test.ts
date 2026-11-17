import { expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers'
import { analyzeStoredEmail, browseEmails } from './emails'

it('sends forced reanalysis as JSON with the session CSRF token', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(jsonResponse({ success: true, data: {} }))
  vi.stubGlobal('fetch', fetch)
  await analyzeStoredEmail('synthetic-id', 'synthetic-csrf', true)
  const init = fetch.mock.calls[0][1] as RequestInit
  expect(init.method).toBe('POST')
  expect(init.credentials).toBe('include')
  expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('synthetic-csrf')
  expect(JSON.parse(String(init.body))).toEqual({ force: true })
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('encodes combined filters and pagination in a cancelable GET request', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(jsonResponse({ success: true, data: {} }))
  vi.stubGlobal('fetch', fetch)
  const controller = new AbortController()
  await browseEmails(
    {
      offset: 20,
      priority: 'High',
      category: 'Work',
      reply_needed: true,
      has_pending_action: true,
      analysis_status: 'failed',
      sort: 'priority_desc',
    },
    controller.signal,
  )
  const url = new URL(String(fetch.mock.calls[0][0]), 'http://localhost')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    limit: '20',
    offset: '20',
    priority: 'High',
    category: 'Work',
    reply_needed: 'true',
    has_pending_action: 'true',
    analysis_status: 'failed',
    sort: 'priority_desc',
  })
  expect((fetch.mock.calls[0][1] as RequestInit).signal).toBe(controller.signal)
})
