import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './database/db.sqlite';
const dbDir = path.dirname(DB_PATH);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables immediately at module load time so prepared statements can reference them
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT DEFAULT 'Untitled Meeting',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended', 'archived'))
  );

  CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    content TEXT NOT NULL,
    speaker TEXT DEFAULT 'Unknown',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    chunk_index INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    summary TEXT,
    action_items TEXT,
    decisions TEXT,
    topics TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS speaking_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    speaker TEXT NOT NULL,
    total_duration_seconds REAL DEFAULT 0,
    word_count INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    UNIQUE(session_id, speaker)
  );

  CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
  CREATE INDEX IF NOT EXISTS idx_analysis_session ON analysis(session_id);
  CREATE INDEX IF NOT EXISTS idx_speaking_metrics_session ON speaking_metrics(session_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
`);

console.log('✅ Database tables initialized');

// initializeDatabase kept for explicit re-init if needed (e.g. after a schema migration)
export function initializeDatabase(): void {
  console.log('✅ Database ready');
}

// --- Session Queries ---

export interface SessionRow {
  id: string;
  title: string;
  created_at: string;
  ended_at: string | null;
  duration_seconds: number;
  status: string;
}

export interface TranscriptRow {
  id: number;
  session_id: string;
  content: string;
  speaker: string;
  timestamp: string;
  chunk_index: number;
  confidence: number;
}

export interface AnalysisRow {
  id: number;
  session_id: string;
  summary: string | null;
  action_items: string | null;
  decisions: string | null;
  topics: string | null;
  created_at: string;
}

export const queries = {
  // Sessions
  createSession: db.prepare(
    'INSERT INTO sessions (id, title) VALUES (?, ?)'
  ),
  getSession: db.prepare<[string], SessionRow>(
    'SELECT * FROM sessions WHERE id = ?'
  ),
  getAllSessions: db.prepare<[], SessionRow>(
    'SELECT * FROM sessions ORDER BY created_at DESC'
  ),
  endSession: db.prepare(
    'UPDATE sessions SET ended_at = CURRENT_TIMESTAMP, duration_seconds = ?, status = ? WHERE id = ?'
  ),
  updateSessionTitle: db.prepare(
    'UPDATE sessions SET title = ? WHERE id = ?'
  ),
  deleteSession: db.prepare(
    'DELETE FROM sessions WHERE id = ?'
  ),

  // Transcripts
  insertTranscript: db.prepare(
    'INSERT INTO transcripts (session_id, content, speaker, chunk_index, confidence) VALUES (?, ?, ?, ?, ?)'
  ),
  getTranscripts: db.prepare<[string], TranscriptRow>(
    'SELECT * FROM transcripts WHERE session_id = ? ORDER BY chunk_index ASC'
  ),
  getFullTranscript: db.prepare<[string], { full_text: string }>(
    "SELECT GROUP_CONCAT(content, ' ') as full_text FROM transcripts WHERE session_id = ? ORDER BY chunk_index ASC"
  ),

  // Analysis
  insertAnalysis: db.prepare(
    'INSERT INTO analysis (session_id, summary, action_items, decisions, topics) VALUES (?, ?, ?, ?, ?)'
  ),
  getLatestAnalysis: db.prepare<[string], AnalysisRow>(
    'SELECT * FROM analysis WHERE session_id = ? ORDER BY created_at DESC LIMIT 1'
  ),
  getAllAnalyses: db.prepare<[string], AnalysisRow>(
    'SELECT * FROM analysis WHERE session_id = ? ORDER BY created_at DESC'
  ),

  // Speaking Metrics
  upsertSpeakingMetric: db.prepare(`
    INSERT INTO speaking_metrics (session_id, speaker, total_duration_seconds, word_count)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(session_id, speaker) DO UPDATE SET
      total_duration_seconds = total_duration_seconds + excluded.total_duration_seconds,
      word_count = word_count + excluded.word_count
  `),
  getSpeakingMetrics: db.prepare(
    'SELECT * FROM speaking_metrics WHERE session_id = ?'
  ),
};

export default db;
