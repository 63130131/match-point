import { useApp } from '../context/AppContext'
import { computeStandings } from '../utils/match'
import { BallIcon, TrophyIcon } from './Icons'
import { PlayerAvatar } from './PlayerAvatar'

function rankLabel(i: number): string {
  if (i === 0) return '1st'
  if (i === 1) return '2nd'
  if (i === 2) return '3rd'
  return String(i + 1)
}

export function StandingsTable() {
  const { data, seasonMatches, activeSeason, getPlayer } = useApp()

  if (!activeSeason) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <TrophyIcon />
        </div>
        <h2>No season selected</h2>
        <p>Create a season to start tracking standings.</p>
      </div>
    )
  }

  const standings = computeStandings(data.players, seasonMatches)

  if (standings.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <BallIcon />
        </div>
        <h2>No matches yet</h2>
        <p>Log your first match for {activeSeason.name} to see the table.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <div className="page-head">
        <div>
          <h2 className="section-title">{activeSeason.name}</h2>
          <p className="section-subtitle">Season standings</p>
        </div>
        <span className="pill">{standings.length} players</span>
      </div>

      <div className="table-card">
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>Win%</th>
              <th>Sets</th>
              <th>Games</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => (
              <tr
                key={row.playerId}
                className={i < 3 ? `standings-table__podium standings-table__podium--${i + 1}` : ''}
              >
                <td className="standings-table__rank">
                  <span className={`rank-badge ${i < 3 ? `rank-badge--${i + 1}` : ''}`}>
                    {rankLabel(i)}
                  </span>
                </td>
                <td className="standings-table__name">
                  <span className="player-chip">
                    <PlayerAvatar
                      name={row.name}
                      photoUrl={getPlayer(row.playerId)?.photoUrl}
                      size="sm"
                    />
                    {row.name}
                  </span>
                </td>
                <td>{row.played}</td>
                <td className="standings-table__wins">{row.wins}</td>
                <td className="standings-table__losses">{row.losses}</td>
                <td>
                  <span className="win-pill">{row.winRate}%</span>
                </td>
                <td className="standings-table__mono">
                  {row.setsWon}-{row.setsLost}
                </td>
                <td className="standings-table__mono">
                  {row.gamesWon}-{row.gamesLost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-hint">Ranked by wins → set diff → game diff</p>
    </div>
  )
}
