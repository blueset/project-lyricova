import {MigrationInterface, QueryRunner} from "typeorm";

export class InitDatabase1579171483686 implements MigrationInterface {
    name = 'InitDatabase1579171483686'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("CREATE TABLE `playlist` (`slug` varchar(512) NOT NULL, `name` varchar(1024) NOT NULL, PRIMARY KEY (`slug`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `music_file` (`path` varchar(65535) NOT NULL, `fileSize` int UNSIGNED NOT NULL, `trackName` varchar(4096) NULL, `trackSortOrder` varchar(4096) NULL, `albumName` varchar(4096) NULL, `albumSortOrder` varchar(4096) NULL, `artistName` varchar(4096) NULL, `artistSortOrder` varchar(4096) NULL, `hasLyrics` tinyint NOT NULL, `needReview` tinyint NOT NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `songId` int NULL, `albumId` int NULL, PRIMARY KEY (`path`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `video_file` (`path` varchar(65535) NOT NULL, `title` varchar(4096) NOT NULL, `sourceUrl` varchar(32768) NULL, `type` enum ('Original', 'PV', 'Derived', 'Subtitled', 'OnVocal', 'OffVocal', 'Other') NOT NULL DEFAULT 'Other', `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `songId` int NULL, PRIMARY KEY (`path`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `artist_of_album` (`artistOfAlbumId` int NOT NULL AUTO_INCREMENT, `roles` enum ('Default', 'Animator', 'Arranger', 'Composer', 'Distributor', 'Illustrator', 'Instrumentalist', 'Lyricist', 'Mastering', 'Publisher', 'Vocalist', 'VoiceManipulator', 'Other', 'Mixer', 'Chorus', 'Encoder', 'VocalDataProvider') NOT NULL DEFAULT 'Default', `effectiveRoles` enum ('Default', 'Animator', 'Arranger', 'Composer', 'Distributor', 'Illustrator', 'Instrumentalist', 'Lyricist', 'Mastering', 'Publisher', 'Vocalist', 'VoiceManipulator', 'Other', 'Mixer', 'Chorus', 'Encoder', 'VocalDataProvider') NOT NULL DEFAULT 'Default', `categories` enum ('Nothing', 'Vocalist', 'Producer', 'Animator', 'Label', 'Circle', 'Other', 'Band', 'Illustrator', 'Subject') NOT NULL DEFAULT 'Nothing', `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `albumId` int NULL, `artistId` int NULL, PRIMARY KEY (`artistOfAlbumId`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `artist` (`id` int NOT NULL, `name` varchar(4096) NOT NULL, `sortOrder` varchar(4096) NOT NULL, `type` enum ('Nothing', 'Vocalist', 'Producer', 'Animator', 'Label', 'Circle', 'Other', 'Band', 'Illustrator', 'Subject') NOT NULL DEFAULT 'Nothing', `vocaDbJson` json NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `artistsOfSongArtistOfSongId` int NULL, `artistsOfAlbumArtistOfAlbumId` int NULL, `baseVoiceBankId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `artist_of_song` (`artistOfSongId` int NOT NULL AUTO_INCREMENT, `vocaDbId` int NULL, `artistRole` enum ('Default', 'Animator', 'Arranger', 'Composer', 'Distributor', 'Illustrator', 'Instrumentalist', 'Lyricist', 'Mastering', 'Publisher', 'Vocalist', 'VoiceManipulator', 'Other', 'Mixer', 'Chorus', 'Encoder', 'VocalDataProvider') NOT NULL DEFAULT 'Default', `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `songId` int NULL, `artistId` int NULL, PRIMARY KEY (`artistOfSongId`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `user` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(256) NOT NULL, `displayName` varchar(256) NOT NULL, `password` varchar(256) NOT NULL, `email` varchar(512) NOT NULL, `role` enum ('admin', 'guest') NOT NULL DEFAULT 'guest', `provider` varchar(256) NOT NULL, `provider_id` varchar(1024) NOT NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_78a916df40e02a9deb1c4b75ed` (`username`), UNIQUE INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`), PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `tag` (`slug` varchar(512) NOT NULL, `name` varchar(1024) NOT NULL, `color` varchar(16) NOT NULL, PRIMARY KEY (`slug`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `verse` (`id` int NOT NULL AUTO_INCREMENT, `language` varchar(64) NOT NULL, `isOriginal` tinyint NOT NULL, `isMain` tinyint NOT NULL, `text` text NOT NULL, `html` text NOT NULL, `stylizedText` text NOT NULL, `typingSequence` json NOT NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `entryId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `entry` (`id` int NOT NULL AUTO_INCREMENT, `title` varchar(512) NOT NULL, `producersName` varchar(1024) NOT NULL, `vocalistsName` varchar(1024) NOT NULL, `comment` text NOT NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `authorId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `song` (`id` int NOT NULL, `name` varchar(4096) NOT NULL, `sortOrder` varchar(4096) NOT NULL, `vocaDbJson` json NULL, `coverPath` varchar(65535) NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `artistsOfSongArtistOfSongId` int NULL, `originalId` int NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `song_in_album` (`songInAlbumId` int NOT NULL AUTO_INCREMENT, `vocaDbId` int NULL, `diskNumber` int NULL, `trackNumber` int NULL, `name` varchar(2048) NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `songId` int NULL, `albumId` int NULL, PRIMARY KEY (`songInAlbumId`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `album` (`id` int NOT NULL, `name` varchar(4096) NOT NULL, `sortOrder` varchar(4096) NOT NULL, `vocaDbJson` json NULL, `createdOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedOn` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `songsInAlbumSongInAlbumId` int NULL, `artistsOfAlbumArtistOfAlbumId` int NULL, `filesPath` varchar(65535) NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `session` (`expiredAt` bigint NOT NULL DEFAULT 1579171485432, `id` varchar(255) NOT NULL, `json` text NOT NULL, INDEX `IDX_28c5d1d16da7908c97c9bc2f74` (`expiredAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("CREATE TABLE `site_meta` (`key` varchar(1024) NOT NULL, `value` text NOT NULL, PRIMARY KEY (`key`)) ENGINE=InnoDB", undefined);
        await queryRunner.query("ALTER TABLE `music_file` ADD CONSTRAINT `FK_b8262b058f5cd5f158345974493` FOREIGN KEY (`songId`) REFERENCES `song`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `music_file` ADD CONSTRAINT `FK_ee71e4109bfcf24cfc5a7bfbf64` FOREIGN KEY (`albumId`) REFERENCES `album`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `video_file` ADD CONSTRAINT `FK_66c5d93f31c4dacd3816c4d2e4a` FOREIGN KEY (`songId`) REFERENCES `song`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_album` ADD CONSTRAINT `FK_86e4c83ce3b7a8fe872d4e39bcd` FOREIGN KEY (`albumId`) REFERENCES `album`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_album` ADD CONSTRAINT `FK_869b4fb2e0a6e6d702e863b483d` FOREIGN KEY (`artistId`) REFERENCES `artist`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist` ADD CONSTRAINT `FK_ac162629f4e5799639f7865216e` FOREIGN KEY (`artistsOfSongArtistOfSongId`) REFERENCES `artist_of_song`(`artistOfSongId`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist` ADD CONSTRAINT `FK_efbdbade73e8178def2f63c37b7` FOREIGN KEY (`artistsOfAlbumArtistOfAlbumId`) REFERENCES `artist_of_album`(`artistOfAlbumId`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist` ADD CONSTRAINT `FK_bd4971b46fe8d1822bc948604e5` FOREIGN KEY (`baseVoiceBankId`) REFERENCES `artist`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_song` ADD CONSTRAINT `FK_26c5f017380dfbada645d0ffdb3` FOREIGN KEY (`songId`) REFERENCES `song`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_song` ADD CONSTRAINT `FK_64244ce6a16bed009ab214af8b8` FOREIGN KEY (`artistId`) REFERENCES `artist`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `verse` ADD CONSTRAINT `FK_5101ea86cda6c20b4ad2ed33d56` FOREIGN KEY (`entryId`) REFERENCES `entry`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `entry` ADD CONSTRAINT `FK_95d6d669b3063a093f6d60293b3` FOREIGN KEY (`authorId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `song` ADD CONSTRAINT `FK_824bc46aa032d55f0cc3748b6e0` FOREIGN KEY (`artistsOfSongArtistOfSongId`) REFERENCES `artist_of_song`(`artistOfSongId`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `song` ADD CONSTRAINT `FK_d633817ffc527c8a77c84c763a3` FOREIGN KEY (`originalId`) REFERENCES `song`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `song_in_album` ADD CONSTRAINT `FK_62cc6e5f061d3064031ca5790ec` FOREIGN KEY (`songId`) REFERENCES `song`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `song_in_album` ADD CONSTRAINT `FK_e3ee6154691658fd9982671ecf0` FOREIGN KEY (`albumId`) REFERENCES `album`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `album` ADD CONSTRAINT `FK_010ec9194aa15006e48aaa9e6fb` FOREIGN KEY (`songsInAlbumSongInAlbumId`) REFERENCES `song_in_album`(`songInAlbumId`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `album` ADD CONSTRAINT `FK_e8fae733b73a9dc70ee629727eb` FOREIGN KEY (`artistsOfAlbumArtistOfAlbumId`) REFERENCES `artist_of_album`(`artistOfAlbumId`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
        await queryRunner.query("ALTER TABLE `album` ADD CONSTRAINT `FK_165ba3a72d9687a84639dc2f199` FOREIGN KEY (`filesPath`) REFERENCES `music_file`(`path`) ON DELETE NO ACTION ON UPDATE NO ACTION", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `album` DROP FOREIGN KEY `FK_165ba3a72d9687a84639dc2f199`", undefined);
        await queryRunner.query("ALTER TABLE `album` DROP FOREIGN KEY `FK_e8fae733b73a9dc70ee629727eb`", undefined);
        await queryRunner.query("ALTER TABLE `album` DROP FOREIGN KEY `FK_010ec9194aa15006e48aaa9e6fb`", undefined);
        await queryRunner.query("ALTER TABLE `song_in_album` DROP FOREIGN KEY `FK_e3ee6154691658fd9982671ecf0`", undefined);
        await queryRunner.query("ALTER TABLE `song_in_album` DROP FOREIGN KEY `FK_62cc6e5f061d3064031ca5790ec`", undefined);
        await queryRunner.query("ALTER TABLE `song` DROP FOREIGN KEY `FK_d633817ffc527c8a77c84c763a3`", undefined);
        await queryRunner.query("ALTER TABLE `song` DROP FOREIGN KEY `FK_824bc46aa032d55f0cc3748b6e0`", undefined);
        await queryRunner.query("ALTER TABLE `entry` DROP FOREIGN KEY `FK_95d6d669b3063a093f6d60293b3`", undefined);
        await queryRunner.query("ALTER TABLE `verse` DROP FOREIGN KEY `FK_5101ea86cda6c20b4ad2ed33d56`", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_song` DROP FOREIGN KEY `FK_64244ce6a16bed009ab214af8b8`", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_song` DROP FOREIGN KEY `FK_26c5f017380dfbada645d0ffdb3`", undefined);
        await queryRunner.query("ALTER TABLE `artist` DROP FOREIGN KEY `FK_bd4971b46fe8d1822bc948604e5`", undefined);
        await queryRunner.query("ALTER TABLE `artist` DROP FOREIGN KEY `FK_efbdbade73e8178def2f63c37b7`", undefined);
        await queryRunner.query("ALTER TABLE `artist` DROP FOREIGN KEY `FK_ac162629f4e5799639f7865216e`", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_album` DROP FOREIGN KEY `FK_869b4fb2e0a6e6d702e863b483d`", undefined);
        await queryRunner.query("ALTER TABLE `artist_of_album` DROP FOREIGN KEY `FK_86e4c83ce3b7a8fe872d4e39bcd`", undefined);
        await queryRunner.query("ALTER TABLE `video_file` DROP FOREIGN KEY `FK_66c5d93f31c4dacd3816c4d2e4a`", undefined);
        await queryRunner.query("ALTER TABLE `music_file` DROP FOREIGN KEY `FK_ee71e4109bfcf24cfc5a7bfbf64`", undefined);
        await queryRunner.query("ALTER TABLE `music_file` DROP FOREIGN KEY `FK_b8262b058f5cd5f158345974493`", undefined);
        await queryRunner.query("DROP TABLE `site_meta`", undefined);
        await queryRunner.query("DROP INDEX `IDX_28c5d1d16da7908c97c9bc2f74` ON `session`", undefined);
        await queryRunner.query("DROP TABLE `session`", undefined);
        await queryRunner.query("DROP TABLE `album`", undefined);
        await queryRunner.query("DROP TABLE `song_in_album`", undefined);
        await queryRunner.query("DROP TABLE `song`", undefined);
        await queryRunner.query("DROP TABLE `entry`", undefined);
        await queryRunner.query("DROP TABLE `verse`", undefined);
        await queryRunner.query("DROP TABLE `tag`", undefined);
        await queryRunner.query("DROP INDEX `IDX_e12875dfb3b1d92d7d7c5377e2` ON `user`", undefined);
        await queryRunner.query("DROP INDEX `IDX_78a916df40e02a9deb1c4b75ed` ON `user`", undefined);
        await queryRunner.query("DROP TABLE `user`", undefined);
        await queryRunner.query("DROP TABLE `artist_of_song`", undefined);
        await queryRunner.query("DROP TABLE `artist`", undefined);
        await queryRunner.query("DROP TABLE `artist_of_album`", undefined);
        await queryRunner.query("DROP TABLE `video_file`", undefined);
        await queryRunner.query("DROP TABLE `music_file`", undefined);
        await queryRunner.query("DROP TABLE `playlist`", undefined);
    }

}
