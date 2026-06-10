import { useState, type ReactNode } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import { SeasonBar } from './components/SeasonBar'
import { StandingsTable } from './components/StandingsTable'
import { MatchForm } from './components/MatchForm'
import { MatchHistory } from './components/MatchHistory'
import { PlayerManager } from './components/PlayerManager'
import { BallIcon, ListIcon, TrophyIcon, UsersIcon } from './components/Icons'

type Tab = 'standings' | 'log' | 'history' | 'players'

const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'standings', label: 'Standings', icon: <TrophyIcon /> },
  { id: 'log', label: 'Log Match', icon: <BallIcon /> },
  { id: 'history', label: 'History', icon: <ListIcon /> },
  { id: 'players', label: 'Players', icon: <UsersIcon /> },
]

function AppContent() {
  const [tab, setTab] = useState<Tab>('standings')
  const { loading, error, refresh } = useApp()

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
              <BallIcon />
            </div>
            <div>
              <h1 className="header__title">Tennis League</h1>
              <p className="header__tagline">Shared standings for your crew</p>
            </div>
          </div>
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
      </main>

      <footer className="footer">One league for everyone with the link</footer>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}
