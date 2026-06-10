import './load-env.js'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import { existsSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './db.js'
import {
  assertAdmin,
  assertCanDeleteMatch,
  assertOwnsPlayer,
  authResponse,
  listUnclaimedPlayers,
  loginUser,
  registerUser,
  requireAuth,
} from './auth.js'
import { getBranding, getLogoUrl, removeLogo, saveLogo, saveSiteBranding } from './branding.js'
import {
  deletePlayerCompletely,
  deletePlayerPhotoFile,
  formatPlayer,
  getPlayer,
  mimeToExt,
  uploadsDir,
} from './players.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

const app = express()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
})

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

function uid(): string {
  return crypto.randomUUID()
}

function getActiveSeasonId(): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'activeSeasonId'").get() as
    | { value: string }
    | undefined
  return row?.value ?? null
}

function setActiveSeasonId(id: string | null): void {
  if (id === null) {
    db.prepare("DELETE FROM settings WHERE key = 'activeSeasonId'").run()
    return
  }
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('activeSeasonId', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(id)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, version: 2 })
})

app.get('/api/logo', (_req, res) => {
  res.json(getBranding())
})

app.get('/api/branding', (_req, res) => {
  res.json(getBranding())
})

app.put('/api/settings/branding', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertAdmin(user, res)) return
  const title = String(req.body?.title ?? '')
  const tagline = String(req.body?.tagline ?? '')
  try {
    res.json(saveSiteBranding(title, tagline))
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid branding' })
  }
})

app.post('/api/settings/logo', upload.single('logo'), (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertAdmin(user, res)) return
  if (!req.file) {
    res.status(400).json({ error: 'Logo upload failed' })
    return
  }
  const logoUrl = saveLogo(req.file.buffer, req.file.mimetype)
  if (!logoUrl) {
    res.status(400).json({ error: 'Use JPG, PNG, WebP, GIF, or SVG' })
    return
  }
  res.json({ logoUrl })
})

app.delete('/api/settings/logo', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertAdmin(user, res)) return
  removeLogo()
  res.status(204).end()
})

app.get('/api/data', (req, res) => {
  if (!requireAuth(req, res)) return
  const players = (
    db.prepare('SELECT id, name, photo, user_id FROM players ORDER BY name').all() as {
      id: string
      name: string
      photo: string | null
      user_id: string | null
    }[]
  ).map(formatPlayer)
  const seasons = db
    .prepare('SELECT id, name, created_at AS createdAt FROM seasons ORDER BY created_at DESC')
    .all()
  const matches = db
    .prepare(
      `SELECT id, season_id AS seasonId, player1_id AS player1Id, player2_id AS player2Id,
              sets, played_at AS playedAt, notes FROM matches ORDER BY played_at DESC`,
    )
    .all()
    .map((m) => ({
      ...m,
      sets: JSON.parse((m as { sets: string }).sets),
    }))

  res.json({
    players,
    seasons,
    matches,
    activeSeasonId: getActiveSeasonId(),
  })
})

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body.username ?? '').trim()
  const password = String(req.body.password ?? '')
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  const user = loginUser(username, password, res)
  if (!user) return
  res.json(authResponse(user))
})

app.post('/api/auth/register', (req, res) => {
  const username = String(req.body.username ?? '').trim()
  const password = String(req.body.password ?? '')
  const name = String(req.body.name ?? '').trim()
  const playerId = req.body.playerId ? String(req.body.playerId) : null
  const user = registerUser(username, password, name, playerId, res)
  if (!user) return
  res.status(201).json(authResponse(user))
})

app.get('/api/auth/me', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  res.json(authResponse(user))
})

app.get('/api/auth/unclaimed', (_req, res) => {
  res.json({ players: listUnclaimedPlayers() })
})

app.post('/api/players', (_req, res) => {
  res.status(403).json({ error: 'Use sign in and claim a profile instead' })
})

app.put('/api/players/:id', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertOwnsPlayer(user, req.params.id, res)) return
  const existing = getPlayer(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Player not found' })
    return
  }
  const name = String(req.body.name ?? '').trim()
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  db.prepare('UPDATE players SET name = ? WHERE id = ?').run(name, req.params.id)
  res.json(getPlayer(req.params.id))
})

app.post('/api/players/:id/photo', upload.single('photo'), (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertOwnsPlayer(user, req.params.id, res)) return
  const existing = getPlayer(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Player not found' })
    return
  }
  if (!req.file) {
    res.status(400).json({ error: 'Photo upload failed' })
    return
  }
  const ext = mimeToExt[req.file.mimetype]
  if (!ext) {
    res.status(400).json({ error: 'Use JPG, PNG, WebP, or GIF' })
    return
  }
  const row = db.prepare('SELECT photo FROM players WHERE id = ?').get(req.params.id) as {
    photo: string | null
  }
  deletePlayerPhotoFile(row.photo)
  const filename = `${req.params.id}.${ext}`
  writeFileSync(join(uploadsDir, filename), req.file.buffer)
  db.prepare('UPDATE players SET photo = ? WHERE id = ?').run(filename, req.params.id)
  res.json(getPlayer(req.params.id))
})

app.delete('/api/players/:id/photo', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertOwnsPlayer(user, req.params.id, res)) return
  const existing = getPlayer(req.params.id)
  if (!existing) {
    res.status(404).json({ error: 'Player not found' })
    return
  }
  const row = db.prepare('SELECT photo FROM players WHERE id = ?').get(req.params.id) as {
    photo: string | null
  }
  deletePlayerPhotoFile(row.photo)
  db.prepare('UPDATE players SET photo = NULL WHERE id = ?').run(req.params.id)
  res.json(getPlayer(req.params.id))
})

app.delete('/api/players/:id', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  if (!assertAdmin(user, res)) return
  if (user.playerId === req.params.id) {
    res.status(403).json({ error: 'You cannot delete your own account' })
    return
  }
  if (!deletePlayerCompletely(req.params.id)) {
    res.status(404).json({ error: 'Player not found' })
    return
  }
  res.status(204).end()
})

app.post('/api/seasons', (req, res) => {
  if (!requireAuth(req, res)) return
  const name = String(req.body.name ?? '').trim()
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const season = { id: uid(), name, createdAt: new Date().toISOString() }
  db.prepare('INSERT INTO seasons (id, name, created_at) VALUES (?, ?, ?)').run(
    season.id,
    season.name,
    season.createdAt,
  )
  setActiveSeasonId(season.id)
  res.status(201).json(season)
})

app.delete('/api/seasons/:id', (req, res) => {
  if (!requireAuth(req, res)) return
  const { id } = req.params
  db.prepare('DELETE FROM seasons WHERE id = ?').run(id)
  if (getActiveSeasonId() === id) {
    const next = db
      .prepare('SELECT id FROM seasons ORDER BY created_at DESC LIMIT 1')
      .get() as { id: string } | undefined
    setActiveSeasonId(next?.id ?? null)
  }
  res.status(204).end()
})

app.put('/api/active-season', (req, res) => {
  if (!requireAuth(req, res)) return
  const seasonId = req.body.seasonId as string | null
  if (seasonId) {
    const exists = db.prepare('SELECT id FROM seasons WHERE id = ?').get(seasonId)
    if (!exists) {
      res.status(404).json({ error: 'Season not found' })
      return
    }
  }
  setActiveSeasonId(seasonId)
  res.json({ activeSeasonId: seasonId })
})

app.post('/api/matches', (req, res) => {
  if (!requireAuth(req, res)) return
  const { seasonId, player1Id, player2Id, sets, playedAt, notes } = req.body

  if (!seasonId || !player1Id || !player2Id || !sets || !playedAt) {
    res.status(400).json({ error: 'Missing required fields' })
    return
  }
  if (player1Id === player2Id) {
    res.status(400).json({ error: 'Pick two different players' })
    return
  }

  const match = {
    id: uid(),
    seasonId,
    player1Id,
    player2Id,
    sets,
    playedAt,
    notes: notes?.trim() || undefined,
  }

  db.prepare(
    `INSERT INTO matches (id, season_id, player1_id, player2_id, sets, played_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    match.id,
    match.seasonId,
    match.player1Id,
    match.player2Id,
    JSON.stringify(match.sets),
    match.playedAt,
    match.notes ?? null,
  )

  res.status(201).json(match)
})

app.delete('/api/matches/:id', (req, res) => {
  const user = requireAuth(req, res)
  if (!user) return
  const match = db
    .prepare('SELECT player1_id AS player1Id, player2_id AS player2Id FROM matches WHERE id = ?')
    .get(req.params.id) as { player1Id: string; player2Id: string } | undefined
  if (!match) {
    res.status(404).json({ error: 'Match not found' })
    return
  }
  if (!assertCanDeleteMatch(user, match.player1Id, match.player2Id, res)) return
  db.prepare('DELETE FROM matches WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

if (isProd) {
  const distPath = join(__dirname, '..', 'dist')
  if (existsSync(distPath)) {
    app.use(express.static(distPath))
    app.get('/{*path}', (_req, res) => {
      res.sendFile(join(distPath, 'index.html'))
    })
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running at http://localhost:${PORT}`)
  if (isProd) console.log('Serving frontend from /dist')
})
