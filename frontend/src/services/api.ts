const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

export class ApiError extends Error {
  status: number
  code: string
  retryAfter: string | null

  constructor(
    message: string,
    code: string,
    status = 0,
    retryAfter: string | null = null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

export function apiUrl(path: string): string {
  return `${apiBaseUrl}/${path.replace(/^\//, '')}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export interface ApiRequestOptions extends RequestInit {
  csrfToken?: string | null
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { csrfToken, ...init } = options
  const method = (init.method || 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken)
      throw new ApiError('Reload the page and try again.', 'CSRF_INVALID', 403)
    headers.set('X-CSRF-Token', csrfToken)
  }
  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers,
      credentials: 'include',
    })
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError(
      'Could not reach Mailkind. Please try again.',
      'NETWORK_ERROR',
    )
  }
  let result: unknown
  try {
    result = await response.json()
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw new ApiError(
      'Could not read the server response. Please try again.',
      'INVALID_RESPONSE',
      response.status,
    )
  }
  if (!isObject(result))
    throw new ApiError(
      'Could not read the server response. Please try again.',
      'INVALID_RESPONSE',
      response.status,
    )
  if (!response.ok || result.success === false) {
    const error =
      result.success === false && isObject(result.error)
        ? result.error
        : undefined
    // Only the backend's public error envelope supplies user-facing text.
    const code = typeof error?.code === 'string' ? error.code : 'REQUEST_FAILED'
    const message =
      typeof error?.message === 'string'
        ? error.message
        : 'The request failed. Please try again.'
    throw new ApiError(
      message,
      code,
      response.status,
      response.headers.get('Retry-After'),
    )
  }
  if (result.success !== true || !Object.hasOwn(result, 'data')) {
    throw new ApiError(
      'Could not read the server response. Please try again.',
      'INVALID_RESPONSE',
      response.status,
    )
  }
  return result.data as T
}
