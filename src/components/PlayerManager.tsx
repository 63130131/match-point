import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { PlayerAvatar } from './PlayerAvatar'
import { PlayerEditModal } from './PlayerEditModal'

export function PlayerManager() {
  const { data, updatePlayer, uploadPlayerPhoto, removePlayerPhoto } = useApp()
  const { player: myPlayer } = useAuth()
  const [editing, setEditing] = useState(false)

  const myProfile = myPlayer ? data.players.find((p) => p.id === myPlayer.id) ?? myPlayer : null

  return (
    <div className="player-manager">
      <div className="page-head">
        <div>
          <h2 className="section-title">Players</h2>
          <p className="section-subtitle">You can only edit your own profile</p>
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
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing(true)}>
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
            {data.players.map((player) => (
              <li key={player.id} className="player-list__item player-list__item--readonly">
                <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="md" />
                <span className="player-list__name">{player.name}</span>
                {player.id === myPlayer?.id && <span className="pill pill--accent">You</span>}
                {player.isClaimed === false && <span className="pill">Unclaimed</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && myProfile && (
        <PlayerEditModal
          player={myProfile}
          onClose={() => setEditing(false)}
          onSave={async (id, name) => {
            await updatePlayer(id, name)
            setEditing(false)
          }}
          onUploadPhoto={uploadPlayerPhoto}
          onRemovePhoto={removePlayerPhoto}
        />
      )}
    </div>
  )
}
