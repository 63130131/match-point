import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { PlusIcon } from './Icons'

export function SeasonBar() {
  const { data, addSeason, setActiveSeason } = useApp()
  const [newSeasonName, setNewSeasonName] = useState('')
  const [showForm, setShowForm] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSeasonName.trim()) return
    await addSeason(newSeasonName)
    setNewSeasonName('')
    setShowForm(false)
  }

  return (
    <div className="season-bar">
      <div className="season-bar__left">
        <label htmlFor="season-select" className="season-bar__label">
          Season
        </label>
        {data.seasons.length > 0 ? (
          <select
            id="season-select"
            className="season-bar__select"
            value={data.activeSeasonId ?? ''}
            onChange={(e) => void setActiveSeason(e.target.value)}
          >
            {data.seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="season-bar__empty">No seasons yet</span>
        )}
      </div>

      {showForm ? (
        <form className="season-bar__form" onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="e.g. Summer 2026"
            value={newSeasonName}
            onChange={(e) => setNewSeasonName(e.target.value)}
            autoFocus
          />
          <button type="submit" className="btn btn--primary btn--sm">
            Create
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="btn btn--accent btn--sm btn--with-icon"
          onClick={() => setShowForm(true)}
        >
          <PlusIcon /> New season
        </button>
      )}
    </div>
  )
}
