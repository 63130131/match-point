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

export function isMatchTie(match: Match): boolean {
  return getMatchWinner(match) === null
}

export function formatScore(sets: SetScore[]): string {
  return sets.map((s) => `${s.player1Games}-${s.player2Games}`).join(', ')
}

function applySetStats(p1Stats: PlayerStanding, p2Stats: PlayerStanding, set: SetScore): void {
  const p1Won = set.player1Games > set.player2Games
  const p2Won = set.player2Games > set.player1Games

  p1Stats.setsWon += p1Won ? 1 : 0
  p1Stats.setsLost += p2Won ? 1 : 0
  p1Stats.gamesWon += set.player1Games
  p1Stats.gamesLost += set.player2Games
  p2Stats.setsWon += p2Won ? 1 : 0
  p2Stats.setsLost += p1Won ? 1 : 0
  p2Stats.gamesWon += set.player2Games
  p2Stats.gamesLost += set.player1Games
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
      draws: 0,
      losses: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      gamesWon: 0,
      gamesLost: 0,
    })
  }

  for (const match of matches) {
    const p1Stats = stats.get(match.player1Id)
    const p2Stats = stats.get(match.player2Id)
    if (!p1Stats || !p2Stats) continue

    const winner = getMatchWinner(match)

    if (!winner) {
      p1Stats.played++
      p2Stats.played++
      p1Stats.draws++
      p2Stats.draws++
      p1Stats.points++
      p2Stats.points++
      for (const set of match.sets) {
        applySetStats(p1Stats, p2Stats, set)
      }
      continue
    }

    const loser = winner === match.player1Id ? match.player2Id : match.player1Id
    const winnerStats = stats.get(winner)
    const loserStats = stats.get(loser)
    if (!winnerStats || !loserStats) continue

    winnerStats.played++
    winnerStats.wins++
    winnerStats.points++
    loserStats.played++
    loserStats.losses++

    for (const set of match.sets) {
      applySetStats(p1Stats, p2Stats, set)
    }
  }

  const standings = Array.from(stats.values()).filter((s) => s.played > 0)

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
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
  for (const set of sets) {
    if (set.player1Games < 0 || set.player2Games < 0) return 'Scores cannot be negative'
    if (set.player1Games === set.player2Games) return 'Each set must have a winner'
  }
  return null
}
