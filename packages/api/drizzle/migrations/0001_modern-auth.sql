CREATE TABLE `AuthAccounts` (
	`id` varchar(36) NOT NULL,
	`accountId` varchar(255) NOT NULL,
	`providerId` varchar(255) NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`idToken` text,
	`accessTokenExpiresAt` datetime,
	`refreshTokenExpiresAt` datetime,
	`scope` text,
	`password` text,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	CONSTRAINT `AuthAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `AuthAccounts_provider_account_unique` UNIQUE(`providerId`,`accountId`)
);
--> statement-breakpoint
CREATE TABLE `AuthSessions` (
	`id` varchar(36) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`token` varchar(255) NOT NULL,
	`creationDate` datetime NOT NULL,
	`updatedOn` datetime NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`userId` int NOT NULL,
	`impersonatedBy` varchar(36),
	CONSTRAINT `AuthSessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `AuthSessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `AuthVerifications` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expiresAt` datetime NOT NULL,
	`creationDate` datetime,
	`updatedOn` datetime,
	CONSTRAINT `AuthVerifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `UserPasskeys` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255),
	`publicKey` text NOT NULL,
	`userId` int NOT NULL,
	`credentialID` varchar(512) NOT NULL,
	`counter` int NOT NULL,
	`deviceType` varchar(32) NOT NULL,
	`backedUp` boolean NOT NULL,
	`transports` text,
	`creationDate` datetime,
	`aaguid` varchar(36),
	CONSTRAINT `UserPasskeys_id` PRIMARY KEY(`id`),
	CONSTRAINT `UserPasskeys_credentialID_unique` UNIQUE(`credentialID`)
);
--> statement-breakpoint
INSERT INTO `AuthAccounts` (
	`id`,
	`accountId`,
	`providerId`,
	`userId`,
	`password`,
	`creationDate`,
	`updatedOn`
)
SELECT
	UUID(),
	CAST(`id` AS CHAR),
	'credential',
	`id`,
	`password`,
	`creationDate`,
	`updatedOn`
FROM `Users`
WHERE `password` IS NOT NULL;--> statement-breakpoint
UPDATE `Users` SET `password` = NULL;--> statement-breakpoint
ALTER TABLE `Users` MODIFY COLUMN `username` varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` MODIFY COLUMN `displayName` varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` MODIFY COLUMN `email` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` MODIFY COLUMN `role` enum('admin','guest') NOT NULL DEFAULT 'guest';--> statement-breakpoint
ALTER TABLE `Users` ADD `displayUsername` varchar(256);--> statement-breakpoint
ALTER TABLE `Users` ADD `emailVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` ADD `image` text;--> statement-breakpoint
ALTER TABLE `Users` ADD `banned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `Users` ADD `banReason` text;--> statement-breakpoint
ALTER TABLE `Users` ADD `banExpires` datetime;--> statement-breakpoint
UPDATE `Users`
SET
	`displayUsername` = `username`,
	`username` = LOWER(`username`),
	`emailVerified` = true,
	`banned` = (`deletionDate` IS NOT NULL);--> statement-breakpoint
ALTER TABLE `AuthAccounts` ADD CONSTRAINT `AuthAccounts_userId_Users_id_fk` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `AuthSessions` ADD CONSTRAINT `AuthSessions_userId_Users_id_fk` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `UserPasskeys` ADD CONSTRAINT `UserPasskeys_userId_Users_id_fk` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX `AuthAccounts_userId_index` ON `AuthAccounts` (`userId`);--> statement-breakpoint
CREATE INDEX `AuthSessions_userId_index` ON `AuthSessions` (`userId`);--> statement-breakpoint
CREATE INDEX `AuthSessions_expiresAt_index` ON `AuthSessions` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `AuthVerifications_identifier_index` ON `AuthVerifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `AuthVerifications_expiresAt_index` ON `AuthVerifications` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `UserPasskeys_userId_index` ON `UserPasskeys` (`userId`);