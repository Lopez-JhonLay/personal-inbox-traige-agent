import { expect, it, vi } from 'vitest'
import { jsonResponse } from '../test/helpers'
import { createAction, listActions, updateAction } from './actions'

it('sends filters/cancellation and uses CSRF JSON for creation and status changes', async () => {
  const fetcher = vi
    .mocked(fetch)
    .mockImplementation(async () => jsonResponse({ success: true, data: {} }))
  const controller = new AbortController()
  await listActions(
    { status: 'pending', email_id: 'email', offset: 20 },
    controller.signal,
  )
  const [url, read] = fetcher.mock.calls[0]
  expect(String(url)).toContain('status=pending')
  expect(String(url)).toContain('email_id=email')
  expect(String(url)).toContain('offset=20')
  expect(read?.signal).toBe(controller.signal)
  const payload = { email_id: 'email', description: 'Review', due_date: null }
  await createAction(payload, 'csrf')
  expect(fetcher.mock.calls[1][1]?.method).toBe('POST')
  expect(fetcher.mock.calls[1][1]?.body).toBe(JSON.stringify(payload))
  await updateAction('id', 'completed', 'csrf')
  const update = fetcher.mock.calls[2][1]
  expect(update?.method).toBe('PATCH')
  expect(new Headers(update?.headers).get('X-CSRF-Token')).toBe('csrf')
  expect(update?.body).toBe(JSON.stringify({ status: 'completed' }))
})
