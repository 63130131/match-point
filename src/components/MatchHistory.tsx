import { useApp } from '../context/AppContext'
import { formatScore, getMatchWinner } from '../utils/match'
import { BallIcon, ListIcon } from './Icons'

export function MatchHistory() {
  const { seasonMatches, activeSeason, getPlayer, removeMatch } = useApp()

  if (!activeSeason) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <ListIcon />
        </div>
        <h2>No season selected</h2>
        <p>Select or create a season to view match history.</p>
      </div>
    )
  }

  if (seasonMatches.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <BallIcon />
        </div>
        <h2>No matches logged</h2>
        <p>Matches for {activeSeason.name} will appear here.</p>
      </div>
    )
  }

  const sorted = [...seasonMatches].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime(),
  )

  return (
    <div className="match-history">
      <div className="page-head">
        <div>
          <h2 className="section-title">{activeSeason.name}</h2>
          <p className="section-subtitle">Match history</p>
        </div>
        <span className="pill">
          {sorted.length} match{sorted.length !== 1 ? 'es' : ''}
        </span>
      </div>

      <ul className="match-list">
        {sorted.map((match) => {
          const p1 = getPlayer(match.player1Id)
          const p2 = getPlayer(match.player2Id)
          const winnerId = getMatchWinner(match)
          const date = new Date(match.playedAt).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          return (
            <li key={match.id} className="match-card">
              <div className="match-card__header">
                <time dateTime={match.playedAt}>{date}</time>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm btn--danger"
                  onClick={async () => {
                    if (confirm('Delete this match?')) await removeMatch(match.id)
                  }}
                >
                  Delete
                </button>
              </div>
              <div className="match-card__body">
                <div className="match-card__players">
                  <div
                    className={`match-card__player ${winnerId === match.player1Id ? 'match-card__player--winner' : ''}`}
                  >
                    <span className="match-card__avatar">
                      {(p1?.name ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <span>{p1?.name ?? 'Unknown'}</span>
                    {winnerId === match.player1Id && <span className="match-card__badge">W</span>}
                  </div>
                  <span className="match-card__vs">vs</span>
                  <div
                    className={`match-card__player ${winnerId === match.player2Id ? 'match-card__player--winner' : ''}`}
                  >
                    <span className="match-card__avatar">
                      {(p2?.name ?? '?').charAt(0).toUpperCase()}
                    </span>
                    <span>{p2?.name ?? 'Unknown'}</span>
                    {winnerId === match.player2Id && <span className="match-card__badge">W</span>}
                  </div>
                </div>
                <div className="match-card__score">{formatScore(match.sets)}</div>
              </div>
              {match.notes && <p className="match-card__notes">{match.notes}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
