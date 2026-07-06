import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Verifies the UNIQUE constraints added to schema.sql actually reject the
// duplicate rows the application-level checks are meant to prevent (a race that
// slips past the app check now fails cleanly at the DB instead of corrupting).

const SCHEMA = readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8");

let db: DatabaseSync;
const run = (sql: string, ...a: unknown[]) => db.prepare(sql).run(...a);

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  // Minimal graph: tournament -> groups -> players ; a match ; users.
  db.exec(`
    INSERT INTO tournaments (id, name) VALUES (1, 'T');
    INSERT INTO groups (id, tournament_id, name, icon) VALUES (1,1,'A','x'),(2,1,'B','y');
    INSERT INTO players (id, tournament_id, group_id, position_number, slot_index, gender) VALUES (10,1,1,1,1,'M');
    INSERT INTO matches (id, tournament_id, round_number, court_number, home_group_id, away_group_id, match_type) VALUES (100,1,1,1,1,2,'MD');
    INSERT INTO users (id, username, password_hash) VALUES (1,'u1','h'),(2,'u2','h');
  `);
});

describe("match_games UNIQUE(match_id, game_number)", () => {
  it("rejects a duplicate (match_id, game_number)", () => {
    run(`INSERT INTO match_games (match_id, game_number, home_score, away_score) VALUES (100,1,21,10)`);
    expect(() => run(`INSERT INTO match_games (match_id, game_number, home_score, away_score) VALUES (100,1,15,21)`)).toThrow();
  });
  it("allows the same game_number on a different match", () => {
    run(`INSERT INTO matches (id, tournament_id, round_number, court_number, home_group_id, away_group_id, match_type) VALUES (101,1,2,1,1,2,'MD')`);
    run(`INSERT INTO match_games (match_id, game_number, home_score, away_score) VALUES (100,1,21,10)`);
    expect(() => run(`INSERT INTO match_games (match_id, game_number, home_score, away_score) VALUES (101,1,21,10)`)).not.toThrow();
  });
});

describe("tournament_participants UNIQUE(tournament_id, user_id)", () => {
  it("rejects registering the same user twice in one tournament", () => {
    run(`INSERT INTO tournament_participants (tournament_id, user_id, assigned_position, gender) VALUES (1,1,1,'M')`);
    expect(() => run(`INSERT INTO tournament_participants (tournament_id, user_id, assigned_position, gender) VALUES (1,1,2,'M')`)).toThrow();
  });
});

describe("players UNIQUE(group_id, position_number, slot_index)", () => {
  it("rejects a duplicate (group, position, slot)", () => {
    expect(() => run(`INSERT INTO players (tournament_id, group_id, position_number, slot_index, gender) VALUES (1,1,1,1,'M')`)).toThrow();
  });
  it("allows a different slot_index at the same (group, position)", () => {
    expect(() => run(`INSERT INTO players (tournament_id, group_id, position_number, slot_index, gender) VALUES (1,1,1,2,'M')`)).not.toThrow();
  });
});

describe("users.player_id UNIQUE (nullable)", () => {
  it("rejects binding two users to the same player", () => {
    run(`UPDATE users SET player_id = 10 WHERE id = 1`);
    expect(() => run(`UPDATE users SET player_id = 10 WHERE id = 2`)).toThrow();
  });
  it("allows many unbound users (multiple NULL player_id)", () => {
    // both users start NULL; add a third NULL user — no conflict on NULLs
    expect(() => run(`INSERT INTO users (id, username, password_hash, player_id) VALUES (3,'u3','h',NULL)`)).not.toThrow();
    const nulls = db.prepare(`SELECT COUNT(*) c FROM users WHERE player_id IS NULL`).get() as { c: number };
    expect(nulls.c).toBe(3);
  });
});
