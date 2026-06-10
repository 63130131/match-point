import { useState } from 'react'
import { useApp } from '../context/AppContext'

export function PlayerManager() {
  const { data, addPlayer, removePlayer } = useApp()
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await addPlayer(name)
    setName('')
  }

  return (
    <div className="player-manager">
      <div className="page-head">
        <div>
          <h2 className="section-title">Players</h2>
          <p className="section-subtitle">Anyone can play anyone</p>
        </div>
        {data.players.length > 0 && <span className="pill">{data.players.length} total</span>}
      </div>

      <form onSubmit={handleSubmit} className="card player-form">
        <div className="form-group">
          <label htmlFor="playerName">Player name</label>
          <div className="input-with-btn">
            <input
              id="playerName"
              type="text"
              placeholder="e.g. Marko"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="btn btn--primary">
              Add
            </button>
          </div>
        </div>
      </form>

      {data.players.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p>No players yet. Add your friends above.</p>
        </div>
      ) : (
        <ul className="player-list">
          {data.players.map((player) => (
            <li key={player.id} className="player-list__item">
              <span className="player-list__avatar">
                {player.name.charAt(0).toUpperCase()}
              </span>
              <span className="player-list__name">{player.name}</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm btn--danger"
                onClick={async () => {
                  if (confirm(`Remove ${player.name}? Their match history stays.`)) {
                    await removePlayer(player.id)
                  }
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
