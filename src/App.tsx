import { useState, type ReactNode } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SeasonBar } from './components/SeasonBar'
import { StandingsTable } from './components/StandingsTable'
import { MatchForm } from './components/MatchForm'
import { MatchHistory } from './components/MatchHistory'
import { AdminSettings } from './components/AdminSettings'
import { PlayerManager } from './components/PlayerManager'
import { LoginScreen } from './components/LoginScreen'
import { LeagueLogo } from './components/LeagueLogo'
import { PlayerAvatar } from './components/PlayerAvatar'
import { BallIcon, ListIcon, SettingsIcon, TrophyIcon, UsersIcon } from './components/Icons'
import { BrandingProvider, useBranding } from './context/BrandingContext'

type Tab = 'standings' | 'log' | 'history' | 'players' | 'settings'

const baseTabs: { id: Tab; label: string; icon: ReactNode; adminOnly?: boolean }[] = [
  { id: 'standings', label: 'Standings', icon: <TrophyIcon /> },
  { id: 'log', label: 'Log Match', icon: <BallIcon /> },
  { id: 'history', label: 'History', icon: <ListIcon /> },
  { id: 'players', label: 'Players', icon: <UsersIcon /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon />, adminOnly: true },
]

function AppContent() {
  const [tab, setTab] = useState<Tab>('standings')
  const { loading, error, refresh } = useApp()
  const { player, user, logout, refreshSession } = useAuth()
  const isAdmin = Boolean(user?.isAdmin)
  const { title, tagline } = useBranding()
  const tabs = baseTabs.filter((t) => !t.adminOnly || isAdmin)

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-screen__ball" />
          <p>Loading league…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="app__glow app__glow--1" aria-hidden />
      <div className="app__glow app__glow--2" aria-hidden />

      {error && (
        <div className="banner banner--error">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => refresh()}>
            Retry
          </button>
        </div>
      )}

      <header className="header">
        <div className="header__top">
          <div className="header__brand">
            <div className="header__mark">
              <LeagueLogo />
            </div>
            <div>
              <h1 className="header__title">{title}</h1>
              <p className="header__tagline">{tagline}</p>
            </div>
          </div>
          {player && user && (
            <div className="header__user">
              <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size="sm" />
              <span className="header__user-name">{player.name}</span>
              {isAdmin && <span className="pill pill--accent">Admin</span>}
              <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
                Sign out
              </button>
            </div>
          )}
        </div>
        <SeasonBar />
      </header>

      <nav className="tabs" aria-label="Main navigation">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tabs__btn ${tab === t.id ? 'tabs__btn--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tabs__icon">{t.icon}</span>
            <span className="tabs__label">{t.label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        {tab === 'standings' && <StandingsTable />}
        {tab === 'log' && <MatchForm />}
        {tab === 'history' && <MatchHistory />}
        {tab === 'players' && <PlayerManager />}
        {tab === 'settings' && isAdmin && <AdminSettings />}
      </main>

      <footer className="footer">
        Signed in as {user?.username}
        <button type="button" className="btn btn--ghost btn--sm footer__refresh" onClick={() => refreshSession()}>
          Refresh session
        </button>
      </footer>
    </div>
  )
}

function AppGate() {
  const { loading, isAuthenticated, logout } = useAuth()

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-screen__ball" />
          <p>Loading…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) return <LoginScreen />

  return (
    <AppProvider onUnauthorized={logout}>
      <AppContent />
    </AppProvider>
  )
}

export default function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </BrandingProvider>
  )
}
