'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { useEffect } from 'react'
import { getAccessToken, login as apiLogin, logout as apiLogout } from '@/lib/backend-api'

interface AuthContextType {
  user: { email: string } | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Keep server + first client render consistent to avoid hydration mismatches.
  // We only read localStorage after mount.
  const [user, setUser] = useState<{ email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = getAccessToken()
    setUser(token ? { email: 'admin' } : null)
    setIsLoading(false)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true)
    const res = await apiLogin(username, password).catch(() => null)
    setIsLoading(false)
    if (!res) return false
    setUser({ email: username })
    return true
  }, [])

  const logout = useCallback(async () => {
    await apiLogout().catch(() => {})
    setUser(null)
    // Ensure logout always takes the user back to the login screen.
    if (typeof window !== 'undefined') window.location.assign('/login')
  }, [])

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
