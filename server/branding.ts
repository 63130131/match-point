import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import db from './db.js'
import { mimeToExt, uploadsDir } from './players.js'

const LOGO_KEY = 'siteLogo'
const TITLE_KEY = 'siteTitle'
const TAGLINE_KEY = 'siteTagline'
const LOGO_PREFIX = 'site-logo'

export const DEFAULT_SITE_TITLE = 'Tennis League'
export const DEFAULT_SITE_TAGLINE = 'Shared standings for your crew'

function getSetting(key: string): string | null {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function setSetting(key: string, value: string): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(key, value)
}

function deleteSetting(key: string): void {
  db.prepare('DELETE FROM settings WHERE key = ?').run(key)
}

function deleteLogoFiles(): void {
  for (const file of readdirSync(uploadsDir)) {
    if (file.startsWith(LOGO_PREFIX + '.')) {
      unlinkSync(join(uploadsDir, file))
    }
  }
}

export function getLogoUrl(): string | null {
  const filename = getSetting(LOGO_KEY)
  if (!filename) return null
  const path = join(uploadsDir, filename)
  if (!existsSync(path)) return null
  const v = statSync(path).mtimeMs
  return `/uploads/${filename}?v=${v}`
}

const logoMimeToExt: Record<string, string> = {
  ...mimeToExt,
  'image/svg+xml': 'svg',
}

export function saveLogo(buffer: Buffer, mime: string): string | null {
  const ext = logoMimeToExt[mime]
  if (!ext) return null
  deleteLogoFiles()
  const filename = `${LOGO_PREFIX}.${ext}`
  writeFileSync(join(uploadsDir, filename), buffer)
  setSetting(LOGO_KEY, filename)
  return getLogoUrl()
}

export function removeLogo(): void {
  deleteLogoFiles()
  deleteSetting(LOGO_KEY)
}

export function getSiteTitle(): string {
  const value = getSetting(TITLE_KEY)?.trim()
  return value || DEFAULT_SITE_TITLE
}

export function getSiteTagline(): string {
  const value = getSetting(TAGLINE_KEY)?.trim()
  return value || DEFAULT_SITE_TAGLINE
}

export function getBranding() {
  return {
    logoUrl: getLogoUrl(),
    title: getSiteTitle(),
    tagline: getSiteTagline(),
  }
}

export function saveSiteBranding(title: string, tagline: string) {
  const trimmedTitle = title.trim()
  const trimmedTagline = tagline.trim()
  if (!trimmedTitle) throw new Error('Title is required')
  if (trimmedTitle.length > 60) throw new Error('Title must be 60 characters or less')
  if (trimmedTagline.length > 120) throw new Error('Tagline must be 120 characters or less')

  setSetting(TITLE_KEY, trimmedTitle)
  if (trimmedTagline) {
    setSetting(TAGLINE_KEY, trimmedTagline)
  } else {
    deleteSetting(TAGLINE_KEY)
  }

  return getBranding()
}
