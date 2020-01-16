import {MigrationInterface, QueryRunner} from "typeorm";

export class InitDatabase1579174377839 implements MigrationInterface {
    name = 'InitDatabase1579174377839'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `music_file` CHANGE `fileSize` `fileSize` int UNSIGNED NOT NULL", undefined);
        await queryRunner.query("ALTER TABLE `session` CHANGE `expiredAt` `expiredAt` bigint NOT NULL DEFAULT 1579174379509", undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `session` CHANGE `expiredAt` `expiredAt` bigint NOT NULL DEFAULT '1579174344153'", undefined);
        await queryRunner.query("ALTER TABLE `music_file` CHANGE `fileSize` `fileSize` int(10) UNSIGNED NOT NULL", undefined);
    }

}
