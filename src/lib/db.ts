import { createClient, type Client, type InValue, type Row } from '@libsql/client'
import bcrypt from 'bcryptjs'

let _client: Client | null = null
let initPromise: Promise<void> | null = null

function createTursoClient(): Client {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    return createClient({ url: 'file:./data/ranktica.db' })
  }
  return createClient({ url, authToken })
}

export interface Db {
  get<T = Row>(sql: string, args?: InValue[]): Promise<T | undefined>
  all<T = Row>(sql: string, args?: InValue[]): Promise<T[]>
  run(sql: string, args?: InValue[]): Promise<{ lastInsertRowid: bigint; rowsAffected: number }>
  exec(sql: string): Promise<void>
  raw: Client
}

async function initializeDb(client: Client): Promise<void> {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT DEFAULT '',
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'basic', 'premium', 'premiumplus')),
      plan_expiry DATETIME,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by TEXT,
      provider TEXT,
      provider_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS keywords_search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      platform TEXT DEFAULT 'naver' CHECK(platform IN ('naver', 'google', 'custom')),
      search_volume INTEGER,
      competition TEXT,
      searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trending_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      platform TEXT DEFAULT 'naver' CHECK(platform IN ('naver', 'google', 'custom')),
      rank INTEGER NOT NULL,
      volume INTEGER DEFAULT 0,
      prev_rank INTEGER,
      change_direction TEXT CHECK(change_direction IN ('up', 'down', 'same', 'new')),
      captured_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ai_contents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      hashtags TEXT,
      seo_score INTEGER,
      word_count INTEGER,
      tone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_limits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      keyword_count INTEGER DEFAULT 0,
      ai_credit_count INTEGER DEFAULT 0,
      blog_diagnosis_count INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );
  `

  for (const stmt of schema.split(';').filter(s => s.trim())) {
    await client.execute(stmt.trim())
  }

  // Seed default users
  const existing = await client.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: ['admin'] })
  if (existing.rows.length === 0) {
    const adminHash = bcrypt.hashSync('admin', 10)
    const testHash = bcrypt.hashSync('test', 10)
    await client.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, role, plan, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['user_admin', 'admin', '관리자', adminHash, 'admin', 'premiumplus', 'ADMIN001'],
    })
    await client.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, role, plan, referral_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: ['user_test', 'test@test.com', '테스트유저', testHash, 'user', 'free', 'TEST0001'],
    })
  }
}

export async function getDb(): Promise<Db> {
  if (!_client) {
    _client = createTursoClient()
  }
  if (!initPromise) {
    initPromise = initializeDb(_client)
  }
  await initPromise

  const client = _client
  return {
    async get<T = Row>(sql: string, args: InValue[] = []): Promise<T | undefined> {
      const result = await client.execute({ sql, args })
      return result.rows[0] as T | undefined
    },
    async all<T = Row>(sql: string, args: InValue[] = []): Promise<T[]> {
      const result = await client.execute({ sql, args })
      return result.rows as T[]
    },
    async run(sql: string, args: InValue[] = []) {
      const result = await client.execute({ sql, args })
      return { lastInsertRowid: BigInt(result.lastInsertRowid ?? 0), rowsAffected: result.rowsAffected }
    },
    async exec(sql: string) {
      for (const stmt of sql.split(';').filter(s => s.trim())) {
        await client.execute(stmt.trim())
      }
    },
    raw: client,
  }
}
