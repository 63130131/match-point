import type { AppData, Match, Player, Season, SetScore } from './types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function fetchData(): Promise<AppData> {
  return request<AppData>('/data')
}

export async function createPlayer(name: string): Promise<Player> {
  return request<Player>('/players', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
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
