import type { Match, User } from '../types'

export function canDeleteMatch(user: User | null, match: Match): boolean {
  if (!user) return false
  if (user.isAdmin) return true
  if (!user.playerId) return false
  return user.playerId === match.player1Id || user.playerId === match.player2Id
}
