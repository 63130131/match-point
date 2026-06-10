import { useEffect, useRef, useState } from 'react'
import type { Player } from '../types'
import { PlayerAvatar } from './PlayerAvatar'

interface PlayerEditModalProps {
  player: Player
  onClose: () => void
  onSave: (id: string, name: string) => Promise<void>
  onUploadPhoto: (id: string, file: File) => Promise<void>
  onRemovePhoto: (id: string) => Promise<void>
}

export function PlayerEditModal({
  player,
  onClose,
  onSave,
  onUploadPhoto,
  onRemovePhoto,
}: PlayerEditModalProps) {
  const [name, setName] = useState(player.name)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(player.name)
  }, [player])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(player.id, trimmed)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await onUploadPhoto(player.id, file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-player-title"
      >
        <div className="modal__header">
          <h3 id="edit-player-title" className="modal__title">
            Edit profile
          </h3>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal__photo-section">
          <PlayerAvatar name={name} photoUrl={player.photoUrl} size="lg" />
          <div className="modal__photo-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              id="player-photo"
              onChange={handlePhoto}
            />
            <label htmlFor="player-photo" className="btn btn--ghost btn--sm">
              {uploading ? 'Uploading…' : 'Change photo'}
            </label>
            {player.photoUrl && (
              <button
                type="button"
                className="btn btn--ghost btn--sm btn--danger"
                onClick={async () => {
                  setUploading(true)
                  setError(null)
                  try {
                    await onRemovePhoto(player.id)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to remove photo')
                  } finally {
                    setUploading(false)
                  }
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="edit-player-name">Name</label>
            <input
              id="edit-player-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
