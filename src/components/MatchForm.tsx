import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { validateSets } from '../utils/match'
import type { SetScore } from '../types'
import { BallIcon, PlusIcon, UsersIcon } from './Icons'

const emptySet = (): SetScore => ({ player1Games: 0, player2Games: 0 })

export function MatchForm() {
  const { data, activeSeason, addMatch, getPlayer } = useApp()
  const [player1Id, setPlayer1Id] = useState('')
  const [player2Id, setPlayer2Id] = useState('')
  const [sets, setSets] = useState<SetScore[]>([emptySet(), emptySet(), emptySet()])
  const [playedAt, setPlayedAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const updateSet = (index: number, field: keyof SetScore, value: number) => {
    setSets((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const addSet = () => setSets((prev) => [...prev, emptySet()])

  const removeSet = (index: number) => {
    if (sets.length <= 1) return
    setSets((prev) => prev.filter((_, i) => i !== index))
  }

  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const filledSets = sets.filter((s) => s.player1Games > 0 || s.player2Games > 0)
    const validationError = validateSets(filledSets)
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    const matchError = await addMatch(player1Id, player2Id, filledSets, playedAt, notes)
    setSaving(false)

    if (matchError) {
      setError(matchError)
      return
    }

    setSuccess(true)
    setSets([emptySet(), emptySet(), emptySet()])
    setNotes('')
    setTimeout(() => setSuccess(false), 2500)
  }

  if (!activeSeason) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <BallIcon />
        </div>
        <h2>Create a season first</h2>
        <p>You need at least one season before logging matches.</p>
      </div>
    )
  }

  if (data.players.length < 2) {
    return (
      <div className="empty-state">
        <div className="empty-state__graphic">
          <UsersIcon />
        </div>
        <h2>Add more players</h2>
        <p>You need at least 2 players to log a match.</p>
      </div>
    )
  }

  const p1Name = getPlayer(player1Id)?.name ?? 'Player 1'
  const p2Name = getPlayer(player2Id)?.name ?? 'Player 2'

  return (
    <div className="match-form">
      <div className="page-head">
        <div>
          <h2 className="section-title">Log a match</h2>
          <p className="section-subtitle">{activeSeason.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-row form-row--2">
          <div className="form-group">
            <label htmlFor="player1">Player 1</label>
            <select
              id="player1"
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              required
            >
              <option value="">Select player</option>
              {data.players.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player2Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="player2">Player 2</label>
            <select
              id="player2"
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              required
            >
              <option value="">Select player</option>
              {data.players.map((p) => (
                <option key={p.id} value={p.id} disabled={p.id === player1Id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Sets (games per set)</label>
          <div className="sets-grid">
            {sets.map((set, i) => (
              <div key={i} className="set-row">
                <span className="set-row__label">Set {i + 1}</span>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={set.player1Games || ''}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(i, 'player1Games', parseInt(e.target.value) || 0)
                  }
                  aria-label={`${p1Name} games set ${i + 1}`}
                />
                <span className="set-row__dash">–</span>
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={set.player2Games || ''}
                  placeholder="0"
                  onChange={(e) =>
                    updateSet(i, 'player2Games', parseInt(e.target.value) || 0)
                  }
                  aria-label={`${p2Name} games set ${i + 1}`}
                />
                {sets.length > 1 && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--icon"
                    onClick={() => removeSet(i)}
                    aria-label={`Remove set ${i + 1}`}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          {sets.length < 5 && (
            <button type="button" className="btn btn--ghost btn--sm btn--with-icon" onClick={addSet}>
              <PlusIcon /> Add set
            </button>
          )}
        </div>

        <div className="form-row form-row--2">
          <div className="form-group">
            <label htmlFor="playedAt">Date played</label>
            <input
              id="playedAt"
              type="date"
              value={playedAt}
              onChange={(e) => setPlayedAt(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="notes">Notes (optional)</label>
            <input
              id="notes"
              type="text"
              placeholder="e.g. tiebreak in 3rd set"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">Match saved!</p>}

        <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
          {saving ? 'Saving…' : 'Save Match'}
        </button>
      </form>
    </div>
  )
}
