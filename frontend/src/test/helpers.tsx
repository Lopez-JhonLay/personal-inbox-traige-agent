import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach } from 'vitest'
import { authKey, createQueryClient } from '../query/queryClient'
import type { ConnectionStatus, SyncResult } from '../types/api'

export const testAuth: ConnectionStatus = {
  configured: true,
  authenticated: true,
  user_id: 'user-a',
  email: 'test@example.invalid',
  connection_status: 'connected',
  csrf_token: 'synthetic-csrf',
  sync_query: 'label:mailkind-test',
}
export const testSync: SyncResult = {
  imported: 2,
  existing: 0,
  failed: 0,
  deferred: 0,
  pending_email_ids: ['one', 'two'],
  errors: [],
}
export const testAnalysis = {
  analysis: {
    id: 'analysis',
    status: 'completed' as const,
    model_identifier: 'synthetic',
  },
  reused: false,
}

const clients: ReturnType<typeof createQueryClient>[] = []
afterEach(() => {
  for (const client of clients.splice(0)) client.clear()
})

export function harness(auth: ConnectionStatus | null = testAuth) {
  const client = createQueryClient()
  clients.push(client)
  if (auth) client.setQueryData(authKey, { ...auth })
  return { client, wrapper: TestProvider.bind(null, client) }
}

function TestProvider(
  client: ReturnType<typeof createQueryClient>,
  { children }: { children: ReactNode },
) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

export function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error('Promise not initialized')
  }
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
