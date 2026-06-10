import { useRef, useState } from 'react'
import { useBranding } from '../context/BrandingContext'
import { LeagueLogo } from './LeagueLogo'

export function LogoSettings() {
  const { logoUrl, uploadLogo, removeLogo } = useBranding()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setError(null)
    try {
      await uploadLogo(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (!confirm('Remove the custom logo and use the default?')) return
    setUploading(true)
    setError(null)
    try {
      await removeLogo()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card logo-settings">
      <h3 className="my-profile__title">League logo</h3>
      <p className="section-subtitle logo-settings__hint">
        Shown in the header and on the login screen. JPG, PNG, WebP, GIF, or SVG, max 2 MB.
      </p>
      <div className="logo-settings__row">
        <div className="header__mark logo-settings__preview">
          <LeagueLogo />
        </div>
        <div className="logo-settings__actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
          />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
          </button>
          {logoUrl && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={uploading}
              onClick={handleRemove}
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
