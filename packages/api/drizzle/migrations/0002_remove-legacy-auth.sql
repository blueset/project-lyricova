DROP TABLE `UserPublicKeyCredentials`;--> statement-breakpoint
ALTER TABLE `Users` DROP COLUMN `password`;--> statement-breakpoint
ALTER TABLE `Users` DROP COLUMN `provider`;--> statement-breakpoint
ALTER TABLE `Users` DROP COLUMN `provider_id`;