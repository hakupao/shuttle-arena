-- Migration: add the UNIQUE constraints that back the app-level uniqueness the
-- code assumes. Fresh installs get these inline from schema.sql; existing D1
-- databases get them here as UNIQUE INDEXes (schema.sql's CREATE TABLE IF NOT
-- EXISTS can't alter tables that already exist).
--
-- Run: npx wrangler d1 execute shuttle-arena-db --remote --file=migrations/003_add_unique_constraints.sql
--
-- Duplicates are removed first so index creation cannot fail on dirty data.
-- match_games / tournament_participants are leaf tables (nothing references
-- their ids), so deleting duplicate rows is safe. For users.player_id we only
-- null out the duplicate bindings. players duplicates are NOT auto-removed
-- because matches reference player ids; if the players index fails, resolve the
-- duplicate (group_id, position_number, slot_index) rows manually first.

-- 1) Deduplicate leaf tables, keeping the lowest id in each group.
DELETE FROM match_games
WHERE id NOT IN (
  SELECT MIN(id) FROM match_games GROUP BY match_id, game_number
);

DELETE FROM tournament_participants
WHERE id NOT IN (
  SELECT MIN(id) FROM tournament_participants GROUP BY tournament_id, user_id
);

-- 2) Unbind duplicate user->player bindings, keeping the lowest user id.
UPDATE users
SET player_id = NULL
WHERE player_id IS NOT NULL
  AND id NOT IN (
    SELECT MIN(id) FROM users WHERE player_id IS NOT NULL GROUP BY player_id
  );

-- 3) Create the unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS ux_match_games_match_game
  ON match_games (match_id, game_number);

CREATE UNIQUE INDEX IF NOT EXISTS ux_participants_tournament_user
  ON tournament_participants (tournament_id, user_id);

-- Partial index: many users may be unbound (player_id NULL); each bound player
-- must map to exactly one user.
CREATE UNIQUE INDEX IF NOT EXISTS ux_users_player_id
  ON users (player_id) WHERE player_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_players_group_position_slot
  ON players (group_id, position_number, slot_index);
