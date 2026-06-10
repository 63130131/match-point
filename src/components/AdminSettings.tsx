import { LogoSettings } from './LogoSettings'

export function AdminSettings() {
  return (
    <div className="admin-settings">
      <div className="page-head">
        <div>
          <h2 className="section-title">Settings</h2>
          <p className="section-subtitle">League branding and admin options</p>
        </div>
        <span className="pill pill--accent">Admin</span>
      </div>
      <LogoSettings />
    </div>
  )
}
