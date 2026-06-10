import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatScore, getMatchWinner, isMatchTie } from '../utils/match'
import { canDeleteMatch } from '../utils/permissions'
import { BallIcon, ListIcon } from './Icons'
import { PlayerAvatar } from './PlayerAvatar'

export function MatchHistory() {
  const { seasonMatches, activeSeason, getPlayer, removeMatch } = useApp()
  const { user } = useAuth()

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
          const isTie = isMatchTie(match)
          const date = new Date(match.playedAt).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })

          const showDelete = canDeleteMatch(user, match)

          return (
            <li key={match.id} className="match-card">
              <div className="match-card__header">
                <time dateTime={match.playedAt}>{date}</time>
                {showDelete && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm btn--danger"
                    onClick={async () => {
                      if (confirm('Delete this match?')) await removeMatch(match.id)
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="match-card__body">
                <div className="match-card__players">
                  <div
                    className={`match-card__player ${winnerId === match.player1Id ? 'match-card__player--winner' : ''} ${isTie ? 'match-card__player--tie' : ''}`}
                  >
                    <PlayerAvatar name={p1?.name ?? '?'} photoUrl={p1?.photoUrl} size="sm" />
                    <span>{p1?.name ?? 'Unknown'}</span>
                    {winnerId === match.player1Id && <span className="match-card__badge">W</span>}
                    {isTie && <span className="match-card__badge match-card__badge--tie">T</span>}
                  </div>
                  <span className="match-card__vs">vs</span>
                  <div
                    className={`match-card__player ${winnerId === match.player2Id ? 'match-card__player--winner' : ''} ${isTie ? 'match-card__player--tie' : ''}`}
                  >
                    <PlayerAvatar name={p2?.name ?? '?'} photoUrl={p2?.photoUrl} size="sm" />
                    <span>{p2?.name ?? 'Unknown'}</span>
                    {winnerId === match.player2Id && <span className="match-card__badge">W</span>}
                    {isTie && <span className="match-card__badge match-card__badge--tie">T</span>}
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
