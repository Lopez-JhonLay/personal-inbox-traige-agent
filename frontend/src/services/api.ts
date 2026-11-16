const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(
  /\/$/,
  '',
)

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${apiBaseUrl}/${path.replace(/^\//, '')}`, {
    credentials: 'include',
    ...init,
  })
}
