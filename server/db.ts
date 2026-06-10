import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = process.env.DATA_DIR ?? join(__dirname, '..', 'data')
const dbPath = process.env.DATABASE_PATH ?? join(dataDir, 'tennis-league.db')

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    photo TEXT
  );

  CREATE TABLE IF NOT EXISTS seasons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    player1_id TEXT NOT NULL,
    player2_id TEXT NOT NULL,
    sets TEXT NOT NULL,
    played_at TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`)

const playerCols = db.prepare('PRAGMA table_info(players)').all() as { name: string }[]
if (!playerCols.some((c) => c.name === 'photo')) {
  db.exec('ALTER TABLE players ADD COLUMN photo TEXT')
}
if (!playerCols.some((c) => c.name === 'user_id')) {
  db.exec('ALTER TABLE players ADD COLUMN user_id TEXT')
}

const userTableExists = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
  .get() as { name: string } | undefined

if (userTableExists) {
  const userCols = db.prepare('PRAGMA table_info(users)').all() as { name: string }[]
  if (!userCols.some((c) => c.name === 'username')) {
    db.exec('DROP TABLE users')
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    player_id TEXT,
    created_at TEXT NOT NULL
  );
`)

export default db
