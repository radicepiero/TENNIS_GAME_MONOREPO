import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type UserRole = 'admin' | 'member' | 'visitor'

export type AuthUser = {
  nickname: string
  role: UserRole
}

type AuthState = {
  token: string
  user: AuthUser
}

type AuthContextValue = {
  isAuthenticated: boolean
  token: string | null
  user: AuthUser | null
  login: (params: { token: string; user: AuthUser }) => void
  logout: () => void
}

const STORAGE_KEY = 'apartments_auth'

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthState
    if (!parsed?.token || !parsed?.user?.nickname || !parsed?.user?.role) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(() => readStoredAuth())

  useEffect(() => {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    else localStorage.removeItem(STORAGE_KEY)
  }, [state])

  const value = useMemo<AuthContextValue>(() => {
    return {
      isAuthenticated: Boolean(state?.token),
      token: state?.token ?? null,
      user: state?.user ?? null,
      login: (params: { token: string; user: AuthUser }) =>
        setState({ token: params.token, user: params.user }),
      logout: () => setState(null),
    }
  }, [state])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
