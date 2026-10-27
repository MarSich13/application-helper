import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, ApiError } from '../lib/api'
import type { User } from '../types/vacancy'

import { AuthContext } from './useAuth'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    api.get<User>('/auth/me', controller.signal).then(setUser).catch((error: unknown) => {
      if (!(error instanceof ApiError && error.status === 401) && !controller.signal.aborted) setUser(null)
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    const expire = () => setUser(null)
    window.addEventListener('session-expired', expire)
    return () => { controller.abort(); window.removeEventListener('session-expired', expire) }
  }, [])
  async function signIn(email: string, password: string) {
    await api.login(email, password)
    setUser(await api.get<User>('/auth/me'))
  }
  async function signOut() { await api.post('/auth/logout'); setUser(null) }
  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}
