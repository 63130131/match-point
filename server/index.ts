import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

const app = express()

app.use(cors())
app.use(express.json())

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
  res.json({ ok: true })
})

app.get('/api/data', (_req, res) => {
  const players = db.prepare('SELECT id, name FROM players ORDER BY name').all()
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

app.post('/api/players', (req, res) => {
  const name = String(req.body.name ?? '').trim()
  if (!name) {
    res.status(400).json({ error: 'Name is required' })
    return
  }
  const player = { id: uid(), name }
  db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(player.id, player.name)
  res.status(201).json(player)
})

app.delete('/api/players/:id', (req, res) => {
  db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

app.post('/api/seasons', (req, res) => {
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
