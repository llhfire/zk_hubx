CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT
);
