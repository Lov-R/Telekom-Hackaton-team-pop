/** Applied on every start (all statements are IF NOT EXISTS). Kept in TS so the serverless bundle needs no extra files. */
export const SCHEMA_SQL = `
-- relAI schema, SRS §8.1 adapted to SQLite.
-- Timestamps are ISO-8601 UTC strings. Calendar dates are 'YYYY-MM-DD' in Europe/Zagreb;
-- tasks.start_at is Zagreb wall time, 'YYYY-MM-DD' (all day) or 'YYYY-MM-DDTHH:MM'.
-- Every user-owned table carries user_id and every query filters on it (stands in for RLS, §8.3).

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Auth (stands in for Supabase auth).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'sarkasticno' CHECK (tone IN ('blago','sarkasticno','brutalno')),
  language TEXT NOT NULL DEFAULT 'hr' CHECK (language IN ('hr','en')),
  avatar_config TEXT NOT NULL DEFAULT '{}',
  hp INTEGER NOT NULL DEFAULT 0 CHECK (hp BETWEEN 0 AND 99),
  map_index INTEGER NOT NULL DEFAULT 1 CHECK (map_index >= 1),
  presence INTEGER NOT NULL DEFAULT 60 CHECK (presence BETWEEN 0 AND 100),
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_completed_date TEXT,
  presence_checked_date TEXT,
  onboarded INTEGER NOT NULL DEFAULT 0,
  friend_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_hash TEXT,
  mime_type TEXT,
  category TEXT NOT NULL DEFAULT 'ostalo',
  subcategory TEXT,
  category_source TEXT NOT NULL DEFAULT 'ai' CHECK (category_source IN ('ai','user','import')),
  title TEXT NOT NULL,
  document_date TEXT,
  expiry_date TEXT,
  extracted TEXT NOT NULL DEFAULT '{}',
  is_proof INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','error')),
  error TEXT,
  original_name TEXT,
  size_bytes INTEGER,
  source_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id TEXT REFERENCES documents(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES goals(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'deadline' CHECK (kind IN ('event','deadline')),
  title TEXT NOT NULL,
  description TEXT,
  tier INTEGER NOT NULL DEFAULT 2 CHECK (tier BETWEEN 1 AND 5),
  source TEXT NOT NULL DEFAULT 'user' CHECK (source IN ('document','chat','user','recommendation')),
  source_text TEXT,
  start_at TEXT,
  remind_at TEXT,
  due_date TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','monthly','yearly')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','missed')),
  completed_at TEXT,
  proof_document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  proof_reason TEXT,
  penalty_applied INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS hp_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  template_key TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  read_at TEXT,
  pushed_at TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  citations_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS friendships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  rule_key TEXT,
  title TEXT NOT NULL,
  reason TEXT,
  suggested_date TEXT,
  source_task_id TEXT,
  source_document_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed')),
  created_at TEXT NOT NULL,
  UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_hash ON documents(user_id, file_hash) WHERE file_hash IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_source_path ON documents(user_id, source_path) WHERE source_path IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_cat ON documents(user_id, category, subcategory);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status_due ON tasks(user_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_user_start ON tasks(user_id, start_at);
CREATE INDEX IF NOT EXISTS idx_tasks_document ON tasks(document_id);
CREATE INDEX IF NOT EXISTS idx_hp_ledger_user ON hp_ledger(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
`;
