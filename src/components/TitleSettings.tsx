import { useEffect, useState } from 'react'
import { DEFAULT_SITE_TAGLINE, DEFAULT_SITE_TITLE } from '../constants/branding'
import { useBranding } from '../context/BrandingContext'

export function TitleSettings() {
  const { title, tagline, updateBranding } = useBranding()
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftTagline, setDraftTagline] = useState(tagline)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    setDraftTitle(title)
    setDraftTagline(tagline)
  }, [title, tagline])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await updateBranding(draftTitle, draftTagline)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setDraftTitle(DEFAULT_SITE_TITLE)
    setDraftTagline(DEFAULT_SITE_TAGLINE)
  }

  return (
    <form className="card title-settings" onSubmit={handleSubmit}>
      <h3 className="my-profile__title">League title &amp; tagline</h3>
      <p className="section-subtitle title-settings__hint">
        Shown next to the logo in the header and on the login screen.
      </p>

      <div className="form-group">
        <label htmlFor="siteTitle">Title</label>
        <input
          id="siteTitle"
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          maxLength={60}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="siteTagline">Tagline</label>
        <input
          id="siteTagline"
          value={draftTagline}
          onChange={(e) => setDraftTagline(e.target.value)}
          maxLength={120}
          placeholder={DEFAULT_SITE_TAGLINE}
        />
      </div>

      <div className="title-settings__actions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={handleReset}>
          Reset to defaults
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">Branding saved!</p>}
    </form>
  )
}
