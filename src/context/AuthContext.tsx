import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api'
import type { AuthSession, Player, User } from '../types'

interface AuthContextValue {
  user: User | null
  player: Player | null
  loading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, name: string, playerId?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applySession(
  session: AuthSession,
  setUser: (u: User) => void,
  setPlayer: (p: Player | null) => void,
) {
  api.setToken(session.token)
  setUser(session.user)
  setPlayer(session.player)
}

function clearSession(
  setUser: (u: User | null) => void,
  setPlayer: (p: Player | null) => void,
) {
  api.logout()
  setUser(null)
  setPlayer(null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = useCallback(() => {
    clearSession(setUser, setPlayer)
  }, [])

  useEffect(() => {
    api.setSessionInvalidHandler(() => clearSession(setUser, setPlayer))
    return () => api.setSessionInvalidHandler(null)
  }, [])

  useEffect(() => {
    if (!api.getToken()) {
      clearSession(setUser, setPlayer)
      setLoading(false)
      return
    }
    api
      .fetchSession()
      .then((session) => applySession(session, setUser, setPlayer))
      .catch(() => clearSession(setUser, setPlayer))
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const session = await api.login(username, password)
    applySession(session, setUser, setPlayer)
  }, [])

  const register = useCallback(
    async (username: string, password: string, name: string, playerId?: string) => {
      const session = await api.register(username, password, name, playerId)
      applySession(session, setUser, setPlayer)
    },
    [],
  )

  const isAuthenticated = Boolean(user && api.getToken())

  const value = useMemo(
    () => ({ user, player, loading, isAuthenticated, login, register, logout }),
    [user, player, loading, isAuthenticated, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
