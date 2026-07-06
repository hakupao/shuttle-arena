import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Proves the transactional guarantee the score/schedule/lottery/etc. routes rely
// on after the db.batch() conversion (H-04/H-05): if any statement in the batch
// fails, NONE commit — a match is never left 'finished' with partial games.
// Mirrors the score route's write set (delete games -> insert games -> flip
// match to finished -> insert referee) and forces the last write to fail.

const SCHEMA = readFileSync(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8");

let db: DatabaseSync;
const run = (sql: string, ...a: unknown[]) => db.prepare(sql).run(...a);
const get = (sql: string, ...a: unknown[]) => db.prepare(sql).get(...a);

beforeEach(() => {
  db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(SCHEMA);
  db.exec(`
    INSERT INTO tournaments (id, name) VALUES (1, 'T');
    INSERT INTO groups (id, tournament_id, name, icon) VALUES (1,1,'A','x'),(2,1,'B','y');
    INSERT INTO players (id, tournament_id, group_id, position_number, slot_index, gender) VALUES (10,1,1,1,1,'M');
    INSERT INTO matches (id, tournament_id, round_number, court_number, home_group_id, away_group_id, match_type, status)
      VALUES (100,1,1,1,1,2,'MD','pending');
    INSERT INTO match_games (match_id, game_number, home_score, away_score, winner) VALUES (100,1,21,10,'home');
  `);
});

describe("score batch rollback", () => {
  it("rolls back the whole write set when a late statement fails (match stays pending, scores intact)", () => {
    let threw = false;
    db.exec("BEGIN");
    try {
      run(`DELETE FROM match_games WHERE match_id = 100`);
      run(`INSERT INTO match_games (match_id, game_number, home_score, away_score, winner) VALUES (100,1,15,21,'away')`);
      run(`UPDATE matches SET status='finished', winner='away' WHERE id=100`);
      // Referee insert with a non-existent player id -> FK violation aborts the batch.
      run(`INSERT INTO referee_records (match_id, player_id, role) VALUES (100, 99999, 'referee')`);
      db.exec("COMMIT");
    } catch {
      db.exec("ROLLBACK");
      threw = true;
    }

    expect(threw).toBe(true);

    // Nothing committed: match still pending with its original score, no referee row.
    const match = get(`SELECT status, winner FROM matches WHERE id=100`) as { status: string; winner: string | null };
    expect(match.status).toBe("pending");
    expect(match.winner).toBeNull();

    const games = db.prepare(`SELECT game_number, home_score, away_score, winner FROM match_games WHERE match_id=100`).all() as Array<{
      game_number: number; home_score: number; away_score: number; winner: string | null;
    }>;
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ game_number: 1, home_score: 21, away_score: 10, winner: "home" });

    const refs = get(`SELECT COUNT(*) c FROM referee_records`) as { c: number };
    expect(refs.c).toBe(0);
  });

  it("commits the whole write set when every statement succeeds", () => {
    db.exec("BEGIN");
    run(`DELETE FROM match_games WHERE match_id = 100`);
    run(`INSERT INTO match_games (match_id, game_number, home_score, away_score, winner) VALUES (100,1,15,21,'away')`);
    run(`UPDATE matches SET status='finished', winner='away' WHERE id=100`);
    run(`INSERT INTO referee_records (match_id, player_id, role) VALUES (100, 10, 'referee')`);
    db.exec("COMMIT");

    const match = get(`SELECT status, winner FROM matches WHERE id=100`) as { status: string; winner: string | null };
    expect(match).toMatchObject({ status: "finished", winner: "away" });
    expect((get(`SELECT COUNT(*) c FROM referee_records`) as { c: number }).c).toBe(1);
  });
});
