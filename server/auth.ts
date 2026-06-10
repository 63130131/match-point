import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'node:crypto'
import type { Request, Response } from 'express'
import db from './db.js'
import { formatPlayer, getPlayer } from './players.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

export interface UserRow {
  id: string
  username: string
  playerId: string | null
  isAdmin: boolean
  createdAt: string
}

function isConfiguredAdmin(username: string): boolean {
  const admin = process.env.ADMIN_USERNAME?.trim()
  return Boolean(admin && admin.toLowerCase() === username.toLowerCase())
}

function formatUser(row: {
  id: string
  username: string
  playerId: string | null
  isAdmin: number | boolean
  createdAt: string
}): UserRow {
  return {
    id: row.id,
    username: row.username,
    playerId: row.playerId,
    isAdmin: Boolean(row.isAdmin),
    createdAt: row.createdAt,
  }
}

function promoteAdminIfConfigured(userId: string, username: string): UserRow | null {
  if (!isConfiguredAdmin(username)) return getUser(userId)
  db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(userId)
  return getUser(userId)
}

function base64url(data: string | Buffer): string {
  return Buffer.from(data).toString('base64url')
}

export function createSessionToken(userId: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = base64url(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }),
  )
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, payload, sig] = parts
  const expected = createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  } catch {
    return null
  }
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    sub?: string
    exp?: number
  }
  if (!data.sub || !data.exp || data.exp < Date.now() / 1000) return null
  return data.sub
}

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return undefined
  return header.slice(7)
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const attempt = scryptSync(password, salt, 64).toString('hex')
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(attempt, 'hex'))
  } catch {
    return false
  }
}

export function getUser(id: string) {
  const row = db
    .prepare(
      'SELECT id, username, player_id AS playerId, is_admin AS isAdmin, created_at AS createdAt FROM users WHERE id = ?',
    )
    .get(id) as
    | { id: string; username: string; playerId: string | null; isAdmin: number; createdAt: string }
    | undefined
  return row ? formatUser(row) : null
}

function getUserWithHash(username: string) {
  return db
    .prepare('SELECT id, username, password_hash, player_id FROM users WHERE LOWER(username) = LOWER(?)')
    .get(username) as
    | { id: string; username: string; password_hash: string; player_id: string | null }
    | undefined
}

function getUserByUsername(username: string) {
  const row = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username) as
    | { id: string }
    | undefined
  return row ? getUser(row.id) : null
}

export function authResponse(user: UserRow) {
  return {
    token: createSessionToken(user.id),
    user,
    player: user.playerId ? getPlayer(user.playerId) : null,
  }
}

function validateCredentials(username: string, password: string, res: Response): boolean {
  if (username.length < 3) {
    res.status(400).json({ error: 'Username must be at least 3 characters' })
    return false
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters' })
    return false
  }
  return true
}

export function loginUser(username: string, password: string, res: Response): UserRow | null {
  const row = getUserWithHash(username)
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Wrong username or password' })
    return null
  }
  return promoteAdminIfConfigured(row.id, row.username)
}

export function registerUser(
  username: string,
  password: string,
  name: string,
  playerId: string | null,
  res: Response,
): UserRow | null {
  if (!validateCredentials(username, password, res)) return null
  if (getUserByUsername(username)) {
    res.status(400).json({ error: 'Username already taken' })
    return null
  }

  const userId = crypto.randomUUID()
  let linkedPlayerId: string

  if (playerId) {
    const player = db.prepare('SELECT id, user_id FROM players WHERE id = ?').get(playerId) as
      | { id: string; user_id: string | null }
      | undefined
    if (!player) {
      res.status(404).json({ error: 'Player not found' })
      return null
    }
    if (player.user_id) {
      res.status(400).json({ error: 'Player already claimed' })
      return null
    }
    db.prepare('UPDATE players SET user_id = ? WHERE id = ?').run(userId, playerId)
    linkedPlayerId = playerId
  } else {
    if (!name.trim()) {
      res.status(400).json({ error: 'Name is required' })
      return null
    }
    linkedPlayerId = crypto.randomUUID()
    db.prepare('INSERT INTO players (id, name, user_id) VALUES (?, ?, ?)').run(
      linkedPlayerId,
      name.trim(),
      userId,
    )
  }

  const isAdmin = isConfiguredAdmin(username) ? 1 : 0
  db.prepare(
    'INSERT INTO users (id, username, password_hash, player_id, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(userId, username, hashPassword(password), linkedPlayerId, isAdmin, new Date().toISOString())

  return getUser(userId)
}

export function listUnclaimedPlayers() {
  return (
    db.prepare('SELECT id, name, photo, user_id FROM players WHERE user_id IS NULL ORDER BY name').all() as {
      id: string
      name: string
      photo: string | null
      user_id: string | null
    }[]
  ).map(formatPlayer)
}

export function requireAuth(req: Request, res: Response): UserRow | null {
  const userId = verifySessionToken(bearerToken(req))
  if (!userId) {
    res.status(401).json({ error: 'Sign in required' })
    return null
  }
  const user = getUser(userId)
  if (!user) {
    res.status(401).json({ error: 'Invalid session' })
    return null
  }
  return user
}

export function canEditPlayer(user: UserRow, playerId: string): boolean {
  if (user.playerId === playerId) return true
  return user.isAdmin
}

export function assertOwnsPlayer(user: UserRow, playerId: string, res: Response): boolean {
  if (user.playerId === playerId) return true
  if (user.isAdmin) return true
  res.status(403).json({ error: 'Only the admin can change other players' })
  return false
}

export function assertAdmin(user: UserRow, res: Response): boolean {
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Only the admin can remove players' })
    return false
  }
  return true
}
