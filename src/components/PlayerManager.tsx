import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import type { Player } from '../types'
import { PlayerAvatar } from './PlayerAvatar'
import { PlayerEditModal } from './PlayerEditModal'

export function PlayerManager() {
  const { data, updatePlayer, uploadPlayerPhoto, removePlayerPhoto, deletePlayer } = useApp()
  const { user, player: myPlayer, refreshSession } = useAuth()
  const [editing, setEditing] = useState<Player | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    refreshSession().catch(() => {})
  }, [refreshSession])

  const isAdmin = Boolean(user?.isAdmin)
  const myProfile = myPlayer ? data.players.find((p) => p.id === myPlayer.id) ?? myPlayer : null

  const handleDelete = async (player: Player) => {
    const label = player.isClaimed ? `${player.name} and their login account` : player.name
    if (
      !confirm(
        `Remove ${label}? This also deletes their matches. This cannot be undone.`,
      )
    ) {
      return
    }
    setDeletingId(player.id)
    try {
      await deletePlayer(player.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove player')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="player-manager">
      <div className="page-head">
        <div>
          <h2 className="section-title">Players</h2>
          <p className="section-subtitle">
            {isAdmin
              ? 'As admin you can edit or remove other players. Everyone else can only edit their own profile.'
              : 'You can edit your own profile below. Only the admin can change other players.'}
          </p>
        </div>
        {data.players.length > 0 && <span className="pill">{data.players.length} total</span>}
      </div>

      {myProfile && (
        <div className="card my-profile">
          <h3 className="my-profile__title">My profile</h3>
          <div className="my-profile__row">
            <PlayerAvatar name={myProfile.name} photoUrl={myProfile.photoUrl} size="lg" />
            <div className="my-profile__info">
              <span className="my-profile__name">{myProfile.name}</span>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setEditing(myProfile)}
              >
                Edit photo & name
              </button>
            </div>
          </div>
        </div>
      )}

      {data.players.length === 0 ? (
        <div className="empty-state empty-state--compact">
          <p>No players in the league yet.</p>
        </div>
      ) : (
        <>
          <h3 className="claim-list__title">All players</h3>
          <ul className="player-list">
            {data.players.map((player) => {
              const isMe = player.id === myPlayer?.id
              const canEdit = isAdmin || isMe
              const canDelete = isAdmin && !isMe

              return (
                <li
                  key={player.id}
                  className={`player-list__item ${canEdit ? '' : 'player-list__item--readonly'}`}
                >
                  <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="md" />
                  <span className="player-list__name">{player.name}</span>
                  {isMe && <span className="pill pill--accent">You</span>}
                  {isMe && isAdmin && <span className="pill">Admin</span>}
                  {player.isClaimed === false && <span className="pill">Unclaimed</span>}
                  <div className="player-list__actions">
                    {canEdit && !isMe && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditing(player)}
                      >
                        Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm btn--danger"
                        disabled={deletingId === player.id}
                        onClick={() => handleDelete(player)}
                      >
                        {deletingId === player.id ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {editing && (
        <PlayerEditModal
          player={editing}
          onClose={() => setEditing(null)}
          onSave={async (id, name) => {
            await updatePlayer(id, name)
            setEditing(null)
          }}
          onUploadPhoto={uploadPlayerPhoto}
          onRemovePhoto={removePlayerPhoto}
        />
      )}
    </div>
  )
}
