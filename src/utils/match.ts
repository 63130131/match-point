import type { Match, PlayerStanding, Player, SetScore } from '../types'

export function getMatchWinner(match: Match): string | null {
  let p1Sets = 0
  let p2Sets = 0
  for (const set of match.sets) {
    if (set.player1Games > set.player2Games) p1Sets++
    else if (set.player2Games > set.player1Games) p2Sets++
  }
  if (p1Sets === p2Sets) return null
  return p1Sets > p2Sets ? match.player1Id : match.player2Id
}

export function formatScore(sets: SetScore[]): string {
  return sets.map((s) => `${s.player1Games}-${s.player2Games}`).join(', ')
}

export function computeStandings(
  players: Player[],
  matches: Match[],
): PlayerStanding[] {
  const stats = new Map<string, PlayerStanding>()

  for (const player of players) {
    stats.set(player.id, {
      playerId: player.id,
      name: player.name,
      played: 0,
      wins: 0,
      losses: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
      winRate: 0,
    })
  }

  for (const match of matches) {
    const winner = getMatchWinner(match)
    if (!winner) continue

    const loser = winner === match.player1Id ? match.player2Id : match.player1Id
    const winnerStats = stats.get(winner)
    const loserStats = stats.get(loser)
    if (!winnerStats || !loserStats) continue

    winnerStats.played++
    winnerStats.wins++
    loserStats.played++
    loserStats.losses++

    for (const set of match.sets) {
      const p1Won = set.player1Games > set.player2Games
      const p2Won = set.player2Games > set.player1Games

      if (match.player1Id === winner) {
        winnerStats.setsWon += p1Won ? 1 : 0
        winnerStats.setsLost += p2Won ? 1 : 0
        winnerStats.gamesWon += set.player1Games
        winnerStats.gamesLost += set.player2Games
        loserStats.setsWon += p2Won ? 1 : 0
        loserStats.setsLost += p1Won ? 1 : 0
        loserStats.gamesWon += set.player2Games
        loserStats.gamesLost += set.player1Games
      } else {
        winnerStats.setsWon += p2Won ? 1 : 0
        winnerStats.setsLost += p1Won ? 1 : 0
        winnerStats.gamesWon += set.player2Games
        winnerStats.gamesLost += set.player1Games
        loserStats.setsWon += p1Won ? 1 : 0
        loserStats.setsLost += p2Won ? 1 : 0
        loserStats.gamesWon += set.player1Games
        loserStats.gamesLost += set.player2Games
      }
    }
  }

  const standings = Array.from(stats.values())
    .filter((s) => s.played > 0)
    .map((s) => ({
      ...s,
      winRate: s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0,
    }))

  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    const aSetDiff = a.setsWon - a.setsLost
    const bSetDiff = b.setsWon - b.setsLost
    if (bSetDiff !== aSetDiff) return bSetDiff - aSetDiff
    const aGameDiff = a.gamesWon - a.gamesLost
    const bGameDiff = b.gamesWon - b.gamesLost
    return bGameDiff - aGameDiff
  })

  return standings
}

export function validateSets(sets: SetScore[]): string | null {
  if (sets.length === 0) return 'Add at least one set'
  let p1Sets = 0
  let p2Sets = 0
  for (const set of sets) {
    if (set.player1Games < 0 || set.player2Games < 0) return 'Scores cannot be negative'
    if (set.player1Games === set.player2Games) return 'Each set must have a winner'
    if (set.player1Games > set.player2Games) p1Sets++
    else p2Sets++
  }
  if (p1Sets === p2Sets) return 'Match must have an overall winner'
  return null
}
