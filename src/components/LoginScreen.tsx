import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BallIcon } from './Icons'

type Mode = 'login' | 'register'

export function LoginScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register(username.trim(), password, name.trim())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <div className="app__glow app__glow--1" aria-hidden />
      <div className="app__glow app__glow--2" aria-hidden />
      <div className="auth-screen">
        <div className="auth-screen__card auth-screen__card--wide">
          <div className="header__mark auth-screen__logo">
            <BallIcon />
          </div>
          <h1 className="auth-screen__title">Tennis League</h1>
          <p className="auth-screen__subtitle">Sign in to view and manage the league</p>

          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tabs__btn ${mode === 'login' ? 'auth-tabs__btn--active' : ''}`}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-tabs__btn ${mode === 'register' ? 'auth-tabs__btn--active' : ''}`}
              onClick={() => setMode('register')}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="How you appear on the leaderboard"
                  required
                />
              </div>
            )}

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
              {saving ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-screen__hint">
            Only you can edit your own name and photo. Everyone must sign in to use the app.
          </p>
        </div>
      </div>
    </div>
  )
}
