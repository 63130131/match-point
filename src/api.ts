import type { AppData, AuthSession, Match, Player, Season, SetScore } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const TOKEN_KEY = 'tennis-league-token'

let onSessionInvalid: (() => void) | null = null

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export function setSessionInvalidHandler(handler: (() => void) | null): void {
  onSessionInvalid = handler
}

function invalidateSession(path: string, status: number): void {
  if (status !== 401) return
  if (path === '/auth/login' || path === '/auth/register') return
  logout()
  onSessionInvalid?.()
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    invalidateSession(path, res.status)
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function fetchLogo(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/logo`)
  if (!res.ok) return null
  const data = (await res.json()) as { logoUrl?: string | null }
  return data.logoUrl ?? null
}

export async function uploadLogo(file: File): Promise<string> {
  const form = new FormData()
  form.append('logo', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/settings/logo`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    invalidateSession('/settings/logo', res.status)
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  const data = (await res.json()) as { logoUrl: string }
  return data.logoUrl
}

export async function removeLogo(): Promise<void> {
  return request<void>('/settings/logo', { method: 'DELETE' })
}

export async function fetchData(): Promise<AppData> {
  return request<AppData>('/data')
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  setToken(session.token)
  return session
}

export async function register(
  username: string,
  password: string,
  name: string,
  playerId?: string,
): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, name, playerId }),
  })
  setToken(session.token)
  return session
}

export async function fetchSession(): Promise<AuthSession> {
  const session = await request<AuthSession>('/auth/me')
  setToken(session.token)
  return session
}

export async function fetchUnclaimedPlayers(): Promise<Player[]> {
  const data = await request<{ players: Player[] }>('/auth/unclaimed')
  return data.players
}

export function logout(): void {
  setToken(null)
}

export async function updatePlayer(id: string, name: string): Promise<Player> {
  return request<Player>(`/players/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

export async function uploadPlayerPhoto(id: string, file: File): Promise<Player> {
  const form = new FormData()
  form.append('photo', file)
  const token = getToken()
  const res = await fetch(`${API_BASE}/players/${id}/photo`, {
    method: 'POST',
    body: form,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    invalidateSession(`/players/${id}/photo`, res.status)
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return res.json() as Promise<Player>
}

export async function removePlayerPhoto(id: string): Promise<Player> {
  return request<Player>(`/players/${id}/photo`, { method: 'DELETE' })
}

export async function deletePlayer(id: string): Promise<void> {
  return request<void>(`/players/${id}`, { method: 'DELETE' })
}

export async function createSeason(name: string): Promise<Season> {
  return request<Season>('/seasons', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function deleteSeason(id: string): Promise<void> {
  return request<void>(`/seasons/${id}`, { method: 'DELETE' })
}

export async function setActiveSeason(seasonId: string): Promise<void> {
  await request('/active-season', {
    method: 'PUT',
    body: JSON.stringify({ seasonId }),
  })
}

export async function createMatch(
  seasonId: string,
  player1Id: string,
  player2Id: string,
  sets: SetScore[],
  playedAt: string,
  notes?: string,
): Promise<Match> {
  return request<Match>('/matches', {
    method: 'POST',
    body: JSON.stringify({ seasonId, player1Id, player2Id, sets, playedAt, notes }),
  })
}

export async function deleteMatch(id: string): Promise<void> {
  return request<void>(`/matches/${id}`, { method: 'DELETE' })
}
