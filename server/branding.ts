import { existsSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import db from './db.js'
import { mimeToExt, uploadsDir } from './players.js'

const LOGO_KEY = 'siteLogo'
const LOGO_PREFIX = 'site-logo'

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
