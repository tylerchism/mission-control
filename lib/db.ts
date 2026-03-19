import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

const DATA_DIR = join(homedir(), '.local', 'share', 'mission-control')
mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = join(DATA_DIR, 'db.sqlite')
export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function ensureSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_by TEXT NOT NULL DEFAULT 'tyler',
      tags TEXT NOT NULL DEFAULT '[]',
      due_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      body_markdown TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL DEFAULT 'tyler',
      tags TEXT NOT NULL DEFAULT '[]',
      published_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      source TEXT NOT NULL DEFAULT 'tyler',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_activity (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      action TEXT NOT NULL,
      action_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
  `)
}

ensureSchema()

// Migrations: add new task columns if they don't exist
const taskColumns = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]
const colNames = new Set(taskColumns.map(c => c.name))
if (!colNames.has('blocked_reason')) db.exec("ALTER TABLE tasks ADD COLUMN blocked_reason TEXT")
if (!colNames.has('is_archived')) db.exec("ALTER TABLE tasks ADD COLUMN is_archived INTEGER DEFAULT 0")
if (!colNames.has('archived_at')) db.exec("ALTER TABLE tasks ADD COLUMN archived_at TEXT")
if (!colNames.has('assigned_to')) db.exec("ALTER TABLE tasks ADD COLUMN assigned_to TEXT")
if (!colNames.has('needs_approval')) db.exec("ALTER TABLE tasks ADD COLUMN needs_approval INTEGER DEFAULT 0")

// Migrations: add new ideas columns if they don't exist
const ideaColumns = db.prepare("PRAGMA table_info(ideas)").all() as { name: string }[]
const ideaColNames = new Set(ideaColumns.map(c => c.name))
if (!ideaColNames.has('status')) db.exec("ALTER TABLE ideas ADD COLUMN status TEXT NOT NULL DEFAULT 'backlog'")
if (!ideaColNames.has('idea_type')) db.exec("ALTER TABLE ideas ADD COLUMN idea_type TEXT NOT NULL DEFAULT 'idea'")
if (!ideaColNames.has('linked_task_id')) db.exec("ALTER TABLE ideas ADD COLUMN linked_task_id TEXT")
if (!ideaColNames.has('dismissed_at')) db.exec("ALTER TABLE ideas ADD COLUMN dismissed_at TEXT")
if (!ideaColNames.has('converted_at')) db.exec("ALTER TABLE ideas ADD COLUMN converted_at TEXT")
