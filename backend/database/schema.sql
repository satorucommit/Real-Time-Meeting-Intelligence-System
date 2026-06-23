-- Meeting Intelligence System - Database Schema
-- SQLite schema for persistent storage

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
  action_items TEXT, -- JSON array
  decisions TEXT,    -- JSON array
  topics TEXT,       -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS speaking_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  speaker TEXT NOT NULL,
  total_duration_seconds REAL DEFAULT 0,
  word_count INTEGER DEFAULT 0,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
CREATE INDEX IF NOT EXISTS idx_analysis_session ON analysis(session_id);
CREATE INDEX IF NOT EXISTS idx_speaking_metrics_session ON speaking_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
