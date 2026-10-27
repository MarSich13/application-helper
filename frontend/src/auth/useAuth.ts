import { createContext, useContext } from 'react'
import type { User } from '../types/vacancy'
export type AuthState = {
  user: User | null; loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthState | null>(null)
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('Auth provider is missing')
  return context
}
