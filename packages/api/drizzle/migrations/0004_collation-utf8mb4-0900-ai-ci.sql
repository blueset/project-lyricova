-- Convert the database and every table from utf8mb4_general_ci to
-- utf8mb4_0900_ai_ci (the MySQL 8.0+ default, UCA 9.0.0).
--
-- WHY: utf8mb4_general_ci gives every character above the BMP the same collation
-- weight, so `'😀' = '😂'` and `'𠮷' = '𡈽'` both evaluate TRUE. Emoji and rare
-- (supplementary-plane) kanji therefore compare, GROUP BY, DISTINCT and collide
-- on UNIQUE indexes as if they were one value. utf8mb4_unicode_ci (UCA 4.0.0)
-- has the same defect; only the _0900_ collations weigh supplementary
-- characters correctly.
--
-- The charset is utf8mb4 before and after, so no column type changes and no
-- index key lengths change (`Albums.sortOrder` keeps its 512-char prefix).
--
-- BEHAVIOUR CHANGE: utf8mb4_0900_ai_ci is accent-insensitive, so it treats
-- あ = ア and は = ば as equal where utf8mb4_general_ci treated them as
-- distinct. Before applying this to a populated database, check that no UNIQUE
-- column gains a duplicate, e.g.:
--   SELECT path COLLATE utf8mb4_0900_ai_ci AS k, COUNT(*) c
--     FROM MusicFiles GROUP BY k HAVING c > 1;
-- (repeat for VideoFiles.path, Users.username, Users.email, Tags.name).
--
-- Foreign keys are disabled for the duration because MySQL rejects a charset
-- change on a column referenced by an FK whose parent has not been converted
-- yet. Each ALTER TABLE rebuilds the table, so expect this to take a while on a
-- large MusicFiles/Verses table. DDL auto-commits in MySQL, so this migration
-- is not atomic: if it fails part-way, re-running it is safe (converting an
-- already-converted table is a no-op).
SET FOREIGN_KEY_CHECKS = 0;
--> statement-breakpoint
-- No database name: applies to the connection's current schema, so this works
-- whatever the deployment calls its database.
ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Albums` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `ArtistOfAlbums` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `ArtistOfSongs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Artists` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `AuthAccounts` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `AuthSessions` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `AuthVerifications` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Entries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `FileInPlaylists` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `FuriganaMappings` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `MusicFiles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Playlists` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Pulses` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `SiteMeta` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `SongInAlbums` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `SongOfEntries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Songs` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `TagOfEntries` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Tags` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `UserPasskeys` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Users` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `Verses` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
ALTER TABLE `VideoFiles` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET FOREIGN_KEY_CHECKS = 1;
