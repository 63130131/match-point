import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const uploadsDir = process.env.UPLOADS_DIR ?? join(__dirname, '..', 'uploads')

if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true })
}

type PlayerRow = { id: string; name: string; photo: string | null; user_id?: string | null }

export function formatPlayer(row: PlayerRow) {
  let photoUrl: string | null = null
  if (row.photo) {
    const path = join(uploadsDir, row.photo)
    const v = existsSync(path) ? statSync(path).mtimeMs : Date.now()
    photoUrl = `/uploads/${row.photo}?v=${v}`
  }
  return {
    id: row.id,
    name: row.name,
    photoUrl,
    isClaimed: Boolean(row.user_id),
  }
}

export function getPlayer(id: string) {
  const row = db.prepare('SELECT id, name, photo, user_id FROM players WHERE id = ?').get(id) as
    | PlayerRow
    | undefined
  return row ? formatPlayer(row) : null
}

export function deletePlayerPhotoFile(photo: string | null | undefined) {
  if (!photo) return
  const path = join(uploadsDir, photo)
  if (existsSync(path)) unlinkSync(path)
}

export const mimeToExt: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
