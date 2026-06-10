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
import type { AppData, Match, Player, SetScore } from '../types'

interface AppContextValue {
  data: AppData
  activeSeason: AppData['seasons'][0] | null
  seasonMatches: Match[]
  loading: boolean
  error: string | null
  addPlayer: (name: string) => Promise<void>
  removePlayer: (id: string) => Promise<void>
  addSeason: (name: string) => Promise<void>
  setActiveSeason: (id: string) => Promise<void>
  removeSeason: (id: string) => Promise<void>
  addMatch: (
    player1Id: string,
    player2Id: string,
    sets: SetScore[],
    playedAt: string,
    notes?: string,
  ) => Promise<string | null>
  removeMatch: (id: string) => Promise<void>
  getPlayer: (id: string) => Player | undefined
  refresh: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

const emptyData = (): AppData => ({
  players: [],
  seasons: [],
  matches: [],
  activeSeasonId: null,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await api.fetchData()
      setData(next)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data')
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  const activeSeason = useMemo(
    () => data.seasons.find((s) => s.id === data.activeSeasonId) ?? null,
    [data.seasons, data.activeSeasonId],
  )

  const seasonMatches = useMemo(
    () =>
      data.activeSeasonId
        ? data.matches.filter((m) => m.seasonId === data.activeSeasonId)
        : [],
    [data.matches, data.activeSeasonId],
  )

  const addPlayer = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      await api.createPlayer(trimmed)
      await refresh()
    },
    [refresh],
  )

  const removePlayer = useCallback(
    async (id: string) => {
      await api.deletePlayer(id)
      await refresh()
    },
    [refresh],
  )

  const addSeason = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      await api.createSeason(trimmed)
      await refresh()
    },
    [refresh],
  )

  const setActiveSeasonId = useCallback(
    async (id: string) => {
      await api.setActiveSeason(id)
      await refresh()
    },
    [refresh],
  )

  const removeSeason = useCallback(
    async (id: string) => {
      await api.deleteSeason(id)
      await refresh()
    },
    [refresh],
  )

  const addMatch = useCallback(
    async (
      player1Id: string,
      player2Id: string,
      sets: SetScore[],
      playedAt: string,
      notes?: string,
    ): Promise<string | null> => {
      if (!data.activeSeasonId) return 'Select or create a season first'
      if (player1Id === player2Id) return 'Pick two different players'
      try {
        await api.createMatch(
          data.activeSeasonId,
          player1Id,
          player2Id,
          sets,
          playedAt,
          notes,
        )
        await refresh()
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'Failed to save match'
      }
    },
    [data.activeSeasonId, refresh],
  )

  const removeMatch = useCallback(
    async (id: string) => {
      await api.deleteMatch(id)
      await refresh()
    },
    [refresh],
  )

  const getPlayer = useCallback(
    (id: string) => data.players.find((p) => p.id === id),
    [data.players],
  )

  const value = useMemo(
    () => ({
      data,
      activeSeason,
      seasonMatches,
      loading,
      error,
      addPlayer,
      removePlayer,
      addSeason,
      setActiveSeason: setActiveSeasonId,
      removeSeason,
      addMatch,
      removeMatch,
      getPlayer,
      refresh,
    }),
    [
      data,
      activeSeason,
      seasonMatches,
      loading,
      error,
      addPlayer,
      removePlayer,
      addSeason,
      setActiveSeasonId,
      removeSeason,
      addMatch,
      removeMatch,
      getPlayer,
      refresh,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
