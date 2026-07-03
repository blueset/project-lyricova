CREATE TABLE `Albums` (
	`id` int NOT NULL,
	`name` varchar(4096),
	`sortOrder` varchar(4096),
	`coverUrl` varchar(4096),
	`utaiteDbId` int,
	`vocaDbJson` json,
	`incomplete` boolean DEFAULT true,
	`deletionDate` datetime,
	`updatedOn` datetime NOT NULL,
	`creationDate` datetime NOT NULL,
	CONSTRAINT `Albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ArtistOfAlbums` (
	`artistOfAlbumId` int AUTO_INCREMENT NOT NULL,
	`roles` varchar(174),
	`effectiveRoles` varchar(174),
	`categories` enum('Nothing','Vocalist','Producer','Animator','Label','Circle','Other','Band','Illustrator','Subject') DEFAULT 'Nothing',
	`albumId` int,
	`artistId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `ArtistOfAlbums_artistOfAlbumId` PRIMARY KEY(`artistOfAlbumId`),
	CONSTRAINT `ArtistOfAlbums_artistId_albumId_unique` UNIQUE(`albumId`,`artistId`)
);
--> statement-breakpoint
CREATE TABLE `ArtistOfSongs` (
	`artistOfSongId` int AUTO_INCREMENT NOT NULL,
	`vocaDbId` int,
	`artistRoles` varchar(174),
	`categories` varchar(174),
	`customName` varchar(4096),
	`isSupport` boolean DEFAULT false,
	`songId` int,
	`artistId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `ArtistOfSongs_artistOfSongId` PRIMARY KEY(`artistOfSongId`),
	CONSTRAINT `vocaDbId` UNIQUE(`vocaDbId`),
	CONSTRAINT `ArtistOfSongs_songId_artistId_unique` UNIQUE(`songId`,`artistId`)
);
--> statement-breakpoint
CREATE TABLE `Artists` (
	`id` int NOT NULL,
	`name` varchar(4096),
	`sortOrder` varchar(4096),
	`mainPictureUrl` varchar(4096),
	`type` enum('Unknown','Circle','Label','Producer','Animator','Illustrator','Lyricist','Vocaloid','UTAU','CeVIO','OtherVoiceSynthesizer','OtherVocalist','OtherGroup','OtherIndividual','Utaite','Band','Vocalist','Character','SynthesizerV','CoverArtist','NEUTRINO','VoiSona','NewType','Voiceroid','Instrumentalist','Designer'),
	`baseVoiceBankId` int,
	`utaiteDbId` int,
	`vocaDbJson` json,
	`incomplete` boolean DEFAULT true,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `Artists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `Entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512),
	`producersName` varchar(1024),
	`vocalistsName` varchar(1024),
	`authorId` int,
	`comment` text,
	`recentActionDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `Entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `FileInPlaylists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` int,
	`playlistId` varchar(512),
	`sortOrder` int NOT NULL DEFAULT 0,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `FileInPlaylists_id` PRIMARY KEY(`id`),
	CONSTRAINT `FileInPlaylists_playlistId_fileId_unique` UNIQUE(`fileId`,`playlistId`)
);
--> statement-breakpoint
CREATE TABLE `FuriganaMappings` (
	`text` varchar(128) NOT NULL,
	`furigana` varchar(128) NOT NULL,
	`segmentedText` varchar(128),
	`segmentedFurigana` varchar(128),
	CONSTRAINT `FuriganaMappings_text_furigana_pk` PRIMARY KEY(`text`,`furigana`)
);
--> statement-breakpoint
CREATE TABLE `MusicFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(768),
	`fileSize` int unsigned,
	`songId` int,
	`albumId` int,
	`trackName` varchar(1024),
	`trackSortOrder` varchar(1024),
	`albumName` varchar(1024),
	`albumSortOrder` varchar(1024),
	`artistName` varchar(1024),
	`artistSortOrder` varchar(1024),
	`hasLyrics` boolean,
	`hasCover` boolean,
	`needReview` boolean,
	`duration` float DEFAULT -1,
	`hash` varchar(128),
	`playCount` int unsigned NOT NULL DEFAULT 0,
	`lastPlayed` datetime,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `MusicFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `path` UNIQUE(`path`)
);
--> statement-breakpoint
CREATE TABLE `Playlists` (
	`slug` varchar(512) NOT NULL,
	`name` varchar(1024),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Playlists_slug` PRIMARY KEY(`slug`)
);
--> statement-breakpoint
CREATE TABLE `Pulses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entryId` int,
	`creationDate` datetime NOT NULL,
	CONSTRAINT `Pulses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `SiteMeta` (
	`key` varchar(768) NOT NULL,
	`value` text,
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `SiteMeta_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `SongInAlbums` (
	`songInAlbumId` int AUTO_INCREMENT NOT NULL,
	`vocaDbId` int,
	`diskNumber` int,
	`trackNumber` int,
	`name` varchar(2048),
	`songId` int,
	`albumId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `SongInAlbums_songInAlbumId` PRIMARY KEY(`songInAlbumId`),
	CONSTRAINT `vocaDbId` UNIQUE(`vocaDbId`),
	CONSTRAINT `SongInAlbums_songId_albumId_unique` UNIQUE(`songId`,`albumId`)
);
--> statement-breakpoint
CREATE TABLE `SongOfEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`songId` int,
	`entryId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `SongOfEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `SongOfEntries_songId_entryId_unique` UNIQUE(`songId`,`entryId`)
);
--> statement-breakpoint
CREATE TABLE `Songs` (
	`id` int NOT NULL,
	`name` varchar(4096),
	`sortOrder` varchar(4096),
	`originalId` int,
	`vocaDbJson` json,
	`coverUrl` varchar(4096),
	`utaiteDbId` int,
	`incomplete` boolean DEFAULT true,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `Songs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `TagOfEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tagId` varchar(512),
	`entryId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `TagOfEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `TagOfEntries_tagId_entryId_unique` UNIQUE(`tagId`,`entryId`)
);
--> statement-breakpoint
CREATE TABLE `Tags` (
	`slug` varchar(512) NOT NULL,
	`name` varchar(1024),
	`color` varchar(16),
	`createdAt` datetime NOT NULL,
	`updatedAt` datetime NOT NULL,
	CONSTRAINT `Tags_slug` PRIMARY KEY(`slug`)
);
--> statement-breakpoint
CREATE TABLE `UserPublicKeyCredentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`externalId` varchar(512),
	`publicKey` text,
	`remarks` text,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `UserPublicKeyCredentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `externalId` UNIQUE(`externalId`)
);
--> statement-breakpoint
CREATE TABLE `Users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`username` varchar(256),
	`displayName` varchar(256),
	`password` varchar(256),
	`email` varchar(512),
	`role` enum('admin','guest') DEFAULT 'guest',
	`provider` varchar(256),
	`provider_id` varchar(1024),
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `Users_id` PRIMARY KEY(`id`),
	CONSTRAINT `username` UNIQUE(`username`),
	CONSTRAINT `email` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `Verses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`language` varchar(64),
	`isOriginal` boolean,
	`isMain` boolean,
	`text` text,
	`html` text,
	`stylizedText` text,
	`translator` text,
	`typingSequence` json,
	`entryId` int,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `Verses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `VideoFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(768),
	`songId` int,
	`title` varchar(1024),
	`sourceUrl` varchar(2048),
	`type` enum('Original','PV','Derived','Subtitled','OnVocal','OffVocal','Other') DEFAULT 'Other',
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`deletionDate` datetime,
	CONSTRAINT `VideoFiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `path` UNIQUE(`path`)
);
--> statement-breakpoint
ALTER TABLE `ArtistOfAlbums` ADD CONSTRAINT `ArtistOfAlbums_albumId_Albums_id_fk` FOREIGN KEY (`albumId`) REFERENCES `Albums`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `ArtistOfAlbums` ADD CONSTRAINT `ArtistOfAlbums_artistId_Artists_id_fk` FOREIGN KEY (`artistId`) REFERENCES `Artists`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `ArtistOfSongs` ADD CONSTRAINT `ArtistOfSongs_songId_Songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `Songs`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `ArtistOfSongs` ADD CONSTRAINT `ArtistOfSongs_artistId_Artists_id_fk` FOREIGN KEY (`artistId`) REFERENCES `Artists`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Artists` ADD CONSTRAINT `Artists_baseVoiceBankId_Artists_id_fk` FOREIGN KEY (`baseVoiceBankId`) REFERENCES `Artists`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Entries` ADD CONSTRAINT `Entries_authorId_Users_id_fk` FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `FileInPlaylists` ADD CONSTRAINT `FileInPlaylists_fileId_MusicFiles_id_fk` FOREIGN KEY (`fileId`) REFERENCES `MusicFiles`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `FileInPlaylists` ADD CONSTRAINT `FileInPlaylists_playlistId_Playlists_slug_fk` FOREIGN KEY (`playlistId`) REFERENCES `Playlists`(`slug`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `MusicFiles` ADD CONSTRAINT `MusicFiles_songId_Songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `Songs`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `MusicFiles` ADD CONSTRAINT `MusicFiles_albumId_Albums_id_fk` FOREIGN KEY (`albumId`) REFERENCES `Albums`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Pulses` ADD CONSTRAINT `Pulses_entryId_Entries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `Entries`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `SongInAlbums` ADD CONSTRAINT `SongInAlbums_songId_Songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `Songs`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `SongInAlbums` ADD CONSTRAINT `SongInAlbums_albumId_Albums_id_fk` FOREIGN KEY (`albumId`) REFERENCES `Albums`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `SongOfEntries` ADD CONSTRAINT `SongOfEntries_songId_Songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `Songs`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `SongOfEntries` ADD CONSTRAINT `SongOfEntries_entryId_Entries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `Entries`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Songs` ADD CONSTRAINT `Songs_originalId_Songs_id_fk` FOREIGN KEY (`originalId`) REFERENCES `Songs`(`id`) ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TagOfEntries` ADD CONSTRAINT `TagOfEntries_tagId_Tags_slug_fk` FOREIGN KEY (`tagId`) REFERENCES `Tags`(`slug`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `TagOfEntries` ADD CONSTRAINT `TagOfEntries_entryId_Entries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `Entries`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `UserPublicKeyCredentials` ADD CONSTRAINT `UserPublicKeyCredentials_userId_Users_id_fk` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `Verses` ADD CONSTRAINT `Verses_entryId_Entries_id_fk` FOREIGN KEY (`entryId`) REFERENCES `Entries`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `VideoFiles` ADD CONSTRAINT `VideoFiles_songId_Songs_id_fk` FOREIGN KEY (`songId`) REFERENCES `Songs`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `Album_sortOredr_index` ON `Albums` (`sortOrder`);--> statement-breakpoint
CREATE INDEX `artistId` ON `ArtistOfAlbums` (`artistId`);--> statement-breakpoint
CREATE INDEX `artistId` ON `ArtistOfSongs` (`artistId`);--> statement-breakpoint
CREATE INDEX `baseVoiceBankId` ON `Artists` (`baseVoiceBankId`);--> statement-breakpoint
CREATE INDEX `authorId` ON `Entries` (`authorId`);--> statement-breakpoint
CREATE INDEX `recentActionDateIndex` ON `Entries` (`recentActionDate`);--> statement-breakpoint
CREATE INDEX `playlistId` ON `FileInPlaylists` (`playlistId`);--> statement-breakpoint
CREATE INDEX `songId` ON `MusicFiles` (`songId`);--> statement-breakpoint
CREATE INDEX `albumId` ON `MusicFiles` (`albumId`);--> statement-breakpoint
CREATE INDEX `pulses_ibfk_1` ON `Pulses` (`entryId`);--> statement-breakpoint
CREATE INDEX `albumId` ON `SongInAlbums` (`albumId`);--> statement-breakpoint
CREATE INDEX `entryId` ON `SongOfEntries` (`entryId`);--> statement-breakpoint
CREATE INDEX `originalId` ON `Songs` (`originalId`);--> statement-breakpoint
CREATE INDEX `entryId` ON `TagOfEntries` (`entryId`);--> statement-breakpoint
CREATE INDEX `userId` ON `UserPublicKeyCredentials` (`userId`);--> statement-breakpoint
CREATE INDEX `entryId` ON `Verses` (`entryId`);--> statement-breakpoint
CREATE INDEX `songId` ON `VideoFiles` (`songId`);