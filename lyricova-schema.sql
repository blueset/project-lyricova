-- MySQL dump 10.13  Distrib 8.0.31
--
-- Host: localhost    Database: lyricova
-- ------------------------------------------------------
-- Server version	8.0.31

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Albums`
--

DROP TABLE IF EXISTS `Albums`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Albums` (
  `id` int NOT NULL,
  `name` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sortOrder` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `coverUrl` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vocaDbJson` json DEFAULT NULL,
  `incomplete` tinyint(1) DEFAULT '1',
  `deletionDate` datetime DEFAULT NULL,
  `updatedOn` datetime NOT NULL,
  `creationDate` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `Album_sortOredr_index` (`sortOrder`(512)),
  FULLTEXT KEY `Album_SearchText` (`name`,`sortOrder`) /*!50100 WITH PARSER `ngram` */ 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ArtistOfAlbums`
--

DROP TABLE IF EXISTS `ArtistOfAlbums`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ArtistOfAlbums` (
  `artistOfAlbumId` int NOT NULL AUTO_INCREMENT,
  `roles` varchar(174) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `effectiveRoles` varchar(174) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `categories` enum('Nothing','Vocalist','Producer','Animator','Label','Circle','Other','Band','Illustrator','Subject') COLLATE utf8mb4_general_ci DEFAULT 'Nothing',
  `albumId` int DEFAULT NULL,
  `artistId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`artistOfAlbumId`),
  UNIQUE KEY `ArtistOfAlbums_artistId_albumId_unique` (`albumId`,`artistId`),
  KEY `artistId` (`artistId`),
  CONSTRAINT `artistofalbums_ibfk_1` FOREIGN KEY (`albumId`) REFERENCES `Albums` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `artistofalbums_ibfk_2` FOREIGN KEY (`artistId`) REFERENCES `Artists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=589 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ArtistOfSongs`
--

DROP TABLE IF EXISTS `ArtistOfSongs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ArtistOfSongs` (
  `artistOfSongId` int NOT NULL AUTO_INCREMENT,
  `vocaDbId` int DEFAULT NULL,
  `artistRoles` varchar(174) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `categories` varchar(174) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customName` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `isSupport` tinyint(1) DEFAULT '0',
  `songId` int DEFAULT NULL,
  `artistId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`artistOfSongId`),
  UNIQUE KEY `vocaDbId` (`vocaDbId`),
  UNIQUE KEY `ArtistOfSongs_songId_artistId_unique` (`songId`,`artistId`),
  KEY `artistId` (`artistId`),
  CONSTRAINT `artistofsongs_ibfk_1` FOREIGN KEY (`songId`) REFERENCES `Songs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `artistofsongs_ibfk_2` FOREIGN KEY (`artistId`) REFERENCES `Artists` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2482 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Artists`
--

DROP TABLE IF EXISTS `Artists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Artists` (
  `id` int NOT NULL,
  `name` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sortOrder` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `mainPictureUrl` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` enum('Unknown','Circle','Label','Producer','Animator','Illustrator','Lyricist','Vocaloid','UTAU','CeVIO','OtherVoiceSynthesizer','OtherVocalist','OtherGroup','OtherIndividual','Utaite','Band','Vocalist','CoverArtist','SynthesizerV','Character') COLLATE utf8mb4_general_ci DEFAULT NULL,
  `baseVoiceBankId` int DEFAULT NULL,
  `vocaDbJson` json DEFAULT NULL,
  `incomplete` tinyint(1) DEFAULT '1',
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `baseVoiceBankId` (`baseVoiceBankId`),
  FULLTEXT KEY `Artist_SearchText` (`name`,`sortOrder`) /*!50100 WITH PARSER `ngram` */ ,
  CONSTRAINT `artists_ibfk_1` FOREIGN KEY (`baseVoiceBankId`) REFERENCES `Artists` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Entries`
--

DROP TABLE IF EXISTS `Entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `producersName` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `vocalistsName` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `authorId` int DEFAULT NULL,
  `comment` text COLLATE utf8mb4_general_ci,
  `recentActionDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `authorId` (`authorId`),
  KEY `recentActionDateIndex` (`recentActionDate`),
  CONSTRAINT `entries_ibfk_1` FOREIGN KEY (`authorId`) REFERENCES `Users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=466 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FileInPlaylists`
--

DROP TABLE IF EXISTS `FileInPlaylists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FileInPlaylists` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fileId` int DEFAULT NULL,
  `playlistId` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT '0',
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `FileInPlaylists_playlistId_fileId_unique` (`fileId`,`playlistId`),
  KEY `playlistId` (`playlistId`),
  CONSTRAINT `fileinplaylists_ibfk_1` FOREIGN KEY (`fileId`) REFERENCES `MusicFiles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fileinplaylists_ibfk_2` FOREIGN KEY (`playlistId`) REFERENCES `Playlists` (`slug`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=450 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `MusicFiles`
--

DROP TABLE IF EXISTS `MusicFiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MusicFiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` varchar(768) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fileSize` int unsigned DEFAULT NULL,
  `songId` int DEFAULT NULL,
  `albumId` int DEFAULT NULL,
  `trackName` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `trackSortOrder` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `albumName` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `albumSortOrder` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `artistName` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `artistSortOrder` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `hasLyrics` tinyint(1) DEFAULT NULL,
  `hasCover` tinyint(1) DEFAULT NULL,
  `needReview` tinyint(1) DEFAULT NULL,
  `duration` float DEFAULT '-1',
  `hash` varchar(128) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `songId` (`songId`),
  KEY `albumId` (`albumId`),
  FULLTEXT KEY `MusicFiles_SearchText` (`path`,`trackName`,`trackSortOrder`,`artistName`,`artistSortOrder`,`albumName`,`albumSortOrder`) /*!50100 WITH PARSER `ngram` */ ,
  CONSTRAINT `musicfiles_ibfk_1` FOREIGN KEY (`songId`) REFERENCES `Songs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `musicfiles_ibfk_2` FOREIGN KEY (`albumId`) REFERENCES `Albums` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12664 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Playlists`
--

DROP TABLE IF EXISTS `Playlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Playlists` (
  `slug` varchar(512) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Pulses`
--

DROP TABLE IF EXISTS `Pulses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Pulses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entryId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `pulses_ibfk_1` (`entryId`),
  CONSTRAINT `pulses_ibfk_1` FOREIGN KEY (`entryId`) REFERENCES `Entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Session`
--

DROP TABLE IF EXISTS `Session`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Session` (
  `sid` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `expires` datetime DEFAULT NULL,
  `data` text COLLATE utf8mb4_general_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Sessions`
--

DROP TABLE IF EXISTS `Sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Sessions` (
  `sid` varchar(36) COLLATE utf8mb4_general_ci NOT NULL,
  `expires` datetime DEFAULT NULL,
  `data` text COLLATE utf8mb4_general_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`sid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SiteMeta`
--

DROP TABLE IF EXISTS `SiteMeta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SiteMeta` (
  `key` varchar(768) COLLATE utf8mb4_general_ci NOT NULL,
  `value` text COLLATE utf8mb4_general_ci,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SongInAlbums`
--

DROP TABLE IF EXISTS `SongInAlbums`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SongInAlbums` (
  `songInAlbumId` int NOT NULL AUTO_INCREMENT,
  `vocaDbId` int DEFAULT NULL,
  `diskNumber` int DEFAULT NULL,
  `trackNumber` int DEFAULT NULL,
  `name` varchar(2048) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `songId` int DEFAULT NULL,
  `albumId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`songInAlbumId`),
  UNIQUE KEY `vocaDbId` (`vocaDbId`),
  UNIQUE KEY `SongInAlbums_songId_albumId_unique` (`songId`,`albumId`),
  KEY `albumId` (`albumId`),
  CONSTRAINT `songinalbums_ibfk_1` FOREIGN KEY (`songId`) REFERENCES `Songs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `songinalbums_ibfk_2` FOREIGN KEY (`albumId`) REFERENCES `Albums` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2044 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `SongOfEntries`
--

DROP TABLE IF EXISTS `SongOfEntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SongOfEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `songId` int DEFAULT NULL,
  `entryId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `SongOfEntries_songId_entryId_unique` (`songId`,`entryId`),
  KEY `entryId` (`entryId`),
  CONSTRAINT `songofentries_ibfk_1` FOREIGN KEY (`songId`) REFERENCES `Songs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `songofentries_ibfk_2` FOREIGN KEY (`entryId`) REFERENCES `Entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=459 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Songs`
--

DROP TABLE IF EXISTS `Songs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Songs` (
  `id` int NOT NULL,
  `name` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sortOrder` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `originalId` int DEFAULT NULL,
  `vocaDbJson` json DEFAULT NULL,
  `coverUrl` varchar(4096) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `incomplete` tinyint(1) DEFAULT '1',
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `originalId` (`originalId`),
  FULLTEXT KEY `Song_SearchText` (`name`,`sortOrder`) /*!50100 WITH PARSER `ngram` */ ,
  CONSTRAINT `songs_ibfk_1` FOREIGN KEY (`originalId`) REFERENCES `Songs` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TagOfEntries`
--

DROP TABLE IF EXISTS `TagOfEntries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TagOfEntries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tagId` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `entryId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `TagOfEntries_tagId_entryId_unique` (`tagId`,`entryId`),
  KEY `entryId` (`entryId`),
  CONSTRAINT `tagofentries_ibfk_1` FOREIGN KEY (`tagId`) REFERENCES `Tags` (`slug`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `tagofentries_ibfk_2` FOREIGN KEY (`entryId`) REFERENCES `Entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=531 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tags`
--

DROP TABLE IF EXISTS `Tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Tags` (
  `slug` varchar(512) COLLATE utf8mb4_general_ci NOT NULL,
  `name` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(16) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Users`
--

DROP TABLE IF EXISTS `Users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `displayName` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(512) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('admin','guest') COLLATE utf8mb4_general_ci DEFAULT 'guest',
  `provider` varchar(256) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `provider_id` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Verses`
--

DROP TABLE IF EXISTS `Verses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Verses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `language` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `isOriginal` tinyint(1) DEFAULT NULL,
  `isMain` tinyint(1) DEFAULT NULL,
  `text` text COLLATE utf8mb4_general_ci,
  `html` text COLLATE utf8mb4_general_ci,
  `stylizedText` text COLLATE utf8mb4_general_ci,
  `translator` text COLLATE utf8mb4_general_ci,
  `typingSequence` json DEFAULT NULL,
  `entryId` int DEFAULT NULL,
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `entryId` (`entryId`),
  CONSTRAINT `verses_ibfk_1` FOREIGN KEY (`entryId`) REFERENCES `Entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=996 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `VideoFiles`
--

DROP TABLE IF EXISTS `VideoFiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `VideoFiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `path` varchar(768) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `songId` int DEFAULT NULL,
  `title` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sourceUrl` varchar(2048) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` enum('Original','PV','Derived','Subtitled','OnVocal','OffVocal','Other') COLLATE utf8mb4_general_ci DEFAULT 'Other',
  `creationDate` datetime NOT NULL,
  `updatedOn` datetime NOT NULL,
  `deletionDate` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `songId` (`songId`),
  CONSTRAINT `videofiles_ibfk_1` FOREIGN KEY (`songId`) REFERENCES `Songs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
