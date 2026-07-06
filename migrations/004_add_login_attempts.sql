-- Migration: add the login_attempts table that backs per-IP login rate limiting.
-- Fresh installs get this from schema.sql; existing D1 databases get it here.
-- Run: npx wrangler d1 execute shuttle-arena-db --remote --file=migrations/004_add_login_attempts.sql

CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);
