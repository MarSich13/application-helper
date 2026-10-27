export class ApiError extends Error {
  status: number
  fields: Record<string, string>
  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message); this.name = 'ApiError'; this.status = status; this.fields = fields
  }
}
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fields).map(([field, message]) => field + ': ' + message)
    return fields.length ? fields.join(' · ') : error.message
  }
  return error instanceof Error && error.name !== 'TypeError' ? error.message : 'Unable to connect. Please try again.'
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const method = init.method ?? 'GET'
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const tokenResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
    if (!tokenResponse.ok) throw new ApiError('Unable to initialize your session. Refresh and try again.', tokenResponse.status)
    const token: { token: string; headerName: string } = await tokenResponse.json()
    headers.set(token.headerName, token.token)
  }
  const response = await fetch('/api' + path, { ...init, headers, credentials: 'same-origin' })
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}))
    if (response.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired'))
    throw new ApiError(problem.detail ?? (response.status === 413 ? 'This file is too large. Use JSON smaller than 2 MB.' : response.status === 404 ? 'This page could not be found.' : 'Something went wrong. Please try again.'),
      response.status, problem.fields ?? {})
  }
  return response.status === 204 ? undefined as T : response.json()
}
export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, value?: unknown) => request<T>(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value),
  }),
  put: <T>(path: string, value?: unknown) => request<T>(path, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: value === undefined ? undefined : JSON.stringify(value),
  }),
  login: (email: string, password: string) => request<void>('/auth/login', { method: 'POST', body: new URLSearchParams({ email, password }) }),
}
