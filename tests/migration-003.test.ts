import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// migrations/003 runs against EXISTING production D1s that predate the UNIQUE
// constraints and may hold duplicates. Its pre-index dedup mutates real data, so
// it must keep the right survivors and then reject future dups. We recreate the
// PRE-constraint tables (no UNIQUE) so duplicates can be inserted, then apply the
// real migration file and assert.

const MIGRATION = readFileSync(
  fileURLToPath(new URL("../migrations/003_add_unique_constraints.sql", import.meta.url)),
  "utf8"
);

// Minimal pre-migration schema: only the columns migration 003 touches, no
// UNIQUE constraints, FKs off so we can seed dirty data directly.
const OLD_SCHEMA = `
  CREATE TABLE match_games (id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER, game_number INTEGER, home_score INTEGER, away_score INTEGER);
  CREATE TABLE tournament_participants (id INTEGER PRIMARY KEY AUTOINCREMENT, tournament_id INTEGER, user_id INTEGER, assigned_position INTEGER, gender TEXT);
  CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, player_id INTEGER);
  CREATE TABLE players (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER, position_number INTEGER, slot_index INTEGER);
`;

let db: DatabaseSync;
const run = (sql: string, ...a: unknown[]) => db.prepare(sql).run(...a);
const all = (sql: string) => db.prepare(sql).all();

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec(OLD_SCHEMA);
  db.exec(`
    -- duplicate (match_id, game_number): ids 1 (keep) and 2 (drop)
    INSERT INTO match_games (id, match_id, game_number, home_score, away_score) VALUES
      (1, 100, 1, 21, 10), (2, 100, 1, 15, 21), (3, 100, 2, 21, 18);
    -- duplicate (tournament_id, user_id): ids 1 (keep) and 2 (drop)
    INSERT INTO tournament_participants (id, tournament_id, user_id, assigned_position, gender) VALUES
      (1, 1, 7, 1, 'M'), (2, 1, 7, 2, 'M'), (3, 1, 8, 1, 'M');
    -- two users bound to the same player 5: id 1 (keep bound) and id 2 (null out)
    INSERT INTO users (id, username, player_id) VALUES (1,'a',5), (2,'b',5), (3,'c',NULL);
    -- players: no duplicates (migration does NOT dedup players)
    INSERT INTO players (id, group_id, position_number, slot_index) VALUES (1,1,1,1), (2,1,1,2);
  `);
  db.exec(MIGRATION);
});

describe("migration 003 dedup", () => {
  it("keeps the lowest-id row per (match_id, game_number)", () => {
    const rows = all(`SELECT id FROM match_games ORDER BY id`) as Array<{ id: number }>;
    expect(rows.map((r) => r.id)).toEqual([1, 3]); // id 2 removed as the dup of (100,1)
  });

  it("keeps the lowest-id row per (tournament_id, user_id)", () => {
    const rows = all(`SELECT id FROM tournament_participants ORDER BY id`) as Array<{ id: number }>;
    expect(rows.map((r) => r.id)).toEqual([1, 3]); // id 2 removed
  });

  it("nulls duplicate user->player bindings, keeping the lowest user id", () => {
    const bound = all(`SELECT id, player_id FROM users WHERE player_id IS NOT NULL`) as Array<{ id: number; player_id: number }>;
    expect(bound).toEqual([{ id: 1, player_id: 5 }]); // user 2's binding nulled
  });
});

describe("migration 003 indexes reject future duplicates", () => {
  it("match_games / participants / users.player_id / players are now unique", () => {
    expect(() => run(`INSERT INTO match_games (match_id, game_number, home_score, away_score) VALUES (100,1,0,0)`)).toThrow();
    expect(() => run(`INSERT INTO tournament_participants (tournament_id, user_id, assigned_position, gender) VALUES (1,7,3,'M')`)).toThrow();
    expect(() => run(`UPDATE users SET player_id = 5 WHERE id = 3`)).toThrow();
    expect(() => run(`INSERT INTO players (group_id, position_number, slot_index) VALUES (1,1,1)`)).toThrow();
  });

  it("still allows multiple unbound users (NULL player_id)", () => {
    expect(() => run(`INSERT INTO users (username, player_id) VALUES ('d', NULL)`)).not.toThrow();
  });
});
