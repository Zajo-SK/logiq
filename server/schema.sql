-- LogiQ D1 schema (strongly consistent storage for teachers, classes, students and assignments)
CREATE TABLE IF NOT EXISTS teachers (email TEXT PRIMARY KEY, salt TEXT, hash TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS classes (code TEXT PRIMARY KEY, label TEXT, owner TEXT, created INTEGER);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, code TEXT, nick TEXT, grade INTEGER, secret_hash TEXT, parent_code TEXT UNIQUE, created INTEGER, updated INTEGER, data TEXT);
CREATE INDEX IF NOT EXISTS st_code ON students(code);
CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, owner TEXT, title TEXT, note TEXT, due INTEGER, created INTEGER, items TEXT);
CREATE TABLE IF NOT EXISTS targets (aid TEXT, code TEXT, student TEXT);
CREATE INDEX IF NOT EXISTS tg_aid ON targets(aid);
CREATE INDEX IF NOT EXISTS tg_code ON targets(code);
