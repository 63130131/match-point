export interface Player {
  id: string
  name: string
  photoUrl?: string | null
  isClaimed?: boolean
}

export interface User {
  id: string
  username: string
  playerId: string | null
  isAdmin: boolean
  createdAt: string
}

export interface AuthSession {
  token: string
  user: User
  player: Player | null
}

export interface Season {
  id: string
  name: string
  createdAt: string
}

export interface SetScore {
  player1Games: number
  player2Games: number
}

export interface Match {
  id: string
  seasonId: string
  player1Id: string
  player2Id: string
  sets: SetScore[]
  playedAt: string
  notes?: string
}

export interface AppData {
  players: Player[]
  seasons: Season[]
  matches: Match[]
  activeSeasonId: string | null
}

export interface PlayerStanding {
  playerId: string
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  points: number
  setsWon: number
  setsLost: number
  gamesWon: number
  gamesLost: number
}
