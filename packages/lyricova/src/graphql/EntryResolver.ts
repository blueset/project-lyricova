import { Entry } from "lyricova-common/models/Entry";
import { Verse } from "lyricova-common/models/Verse";
import {
  Arg,
  Authorized,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import { UserInputError } from "apollo-server-express";
import { Song } from "lyricova-common/models/Song";
import { Tag } from "lyricova-common/models/Tag";
import { Pulse } from "lyricova-common/models/Pulse";
import type { ContextType } from "lyricova-common/utils/graphQLAuth";
import { User } from "lyricova-common/models/User";
import { segmentedTransliteration } from "lyricova-common/utils/transliterate";
import sequelize from "lyricova-common/db";

@InputType()
class PulseInput implements Partial<Pulse> {
  @Field((type) => Int, { nullable: true })
  id?: number;

  @Field()
  creationDate: Date;
}

@InputType()
class VerseInput implements Partial<Verse> {
  @Field({ nullable: true })
  id?: number;

  @Field()
  language: string;

  @Field({ defaultValue: false })
  isOriginal: boolean;

  @Field({ defaultValue: false })
  isMain: boolean;

  @Field()
  text: string;

  @Field({ nullable: true })
  html?: string;

  @Field({ nullable: true })
  stylizedText?: string;

  @Field((type) => [[[String]]], { defaultValue: [] })
  typingSequence?: [string, string][][];

  @Field({ nullable: true })
  translator?: string;
}

@InputType()
class EntryInput implements Omit<Partial<Entry>, "verses" | "pulses"> {
  @Field()
  title: string;

  @Field({ nullable: true })
  producersName?: string;

  @Field({ nullable: true })
  vocalistsName?: string;

  @Field({ nullable: true })
  comment?: string;

  @Field((type) => [String], { nullable: true })
  tagSlugs?: string[];

  @Field((type) => [VerseInput])
  verses: VerseInput[];

  @Field((type) => [Number], { nullable: true })
  songIds?: number[];

  @Field((type) => [PulseInput], { nullable: true })
  pulses?: PulseInput[];

  @Field((type) => Date, { nullable: true })
  creationDate: Date | null;
}

@Resolver((of) => Entry)
export class EntryResolver {
  @Query((returns) => [Entry])
  public async entries(raw: boolean = false): Promise<Entry[]> {
    return await Entry.findAll({
      order: [["recentActionDate", "DESC"]],
      include: ["verses", "tags", "songs", "pulses"],
      raw,
    });
  }

  @Query((returns) => Entry, { nullable: true })
  public async entry(@Arg("id", (type) => Int) id: number): Promise<Entry> {
    return await Entry.findByPk(id);
  }

  populateVerseTypingSequence(verse: VerseInput) {
    if (verse.text && !verse.typingSequence?.length) {
      verse.typingSequence = segmentedTransliteration(verse.text, {
        language: verse.language.startsWith("ja")
          ? "ja"
          : verse.language.startsWith("zh")
          ? "zh"
          : "en",
        type: "typing",
      });
    }
    return verse;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Entry)
  public async newEntry(
    @Arg("data")
    {
      title,
      producersName,
      vocalistsName,
      creationDate = new Date(),
      comment,
      tagSlugs,
      verses,
      songIds,
      pulses,
    }: EntryInput,
    @Ctx() ctx: ContextType
  ): Promise<Entry> {
    const t = await sequelize.transaction();
    try {
      const entry = await Entry.create(
        {
          title,
          producersName,
          vocalistsName,
          comment,
          creationDate,
          recentActionDate: creationDate,
          authorId: ctx.user.id,
        },
        { transaction: t }
      );
      await Promise.all(
        verses.map((verse) =>
          entry.$create("verse", this.populateVerseTypingSequence(verse), {
            transaction: t,
          })
        )
      );
      await entry.$add("song", songIds, { transaction: t });
      await entry.$add("tag", tagSlugs, { transaction: t });
      await entry.$add(
        "pulse",
        pulses.map((pi) => Pulse.build(pi, { isNewRecord: true })),
        { transaction: t }
      );

      await t.commit();
      return entry;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Entry)
  public async updateEntry(
    @Arg("id", (type) => Int) id: number,
    @Arg("data")
    {
      title,
      producersName,
      vocalistsName,
      creationDate,
      comment,
      tagSlugs,
      verses,
      songIds,
      pulses,
    }: EntryInput
  ): Promise<Entry> {
    const entry = await Entry.findByPk(id);
    if (!entry) {
      throw new UserInputError("Entry not found");
    }
    const t = await sequelize.transaction();
    const recentActionDate = new Date(
      Math.max(
        creationDate.valueOf(),
        ...pulses.map((p) => p.creationDate.valueOf())
      )
    );
    try {
      await entry.update(
        {
          title,
          producersName,
          vocalistsName,
          comment,
          recentActionDate,
        },
        { transaction: t }
      );
      // updating creationDate need special treatment
      if (creationDate) {
        entry.changed("creationDate", true);
        entry.set("creationDate", creationDate, {
          raw: true,
        });
        await entry.save({
          silent: true,
          fields: ["creationDate"],
          transaction: t,
        });
      }

      const verseObjs = await Promise.all(
        verses.map(async (v) => {
          const vObj = Verse.build(v, { isNewRecord: !v.id });
          vObj.update(v);
          await vObj.save({ transaction: t });
          return vObj;
        })
      );
      await entry.$set("verses", verseObjs, { transaction: t });
      // Remove pulses with no entryId as Sequelize doesn’t do it
      await Verse.destroy({
        where: {
          entryId: null,
        },
        transaction: t,
      });
      await entry.$set("songs", songIds, { transaction: t });
      await entry.$set("tags", tagSlugs, { transaction: t });
      const pulseObjs = await Promise.all(
        pulses.map(async (pi) => {
          const p = Pulse.build(pi, { isNewRecord: !pi.id });
          p.changed("creationDate", true);
          p.set("creationDate", pi.creationDate, { raw: true });
          await p.save({
            silent: true,
            fields: pi.id ? ["id", "creationDate"] : ["creationDate"],
            transaction: t,
          });
          return p;
        })
      );
      await entry.$set("pulses", pulseObjs, { transaction: t });
      // Remove pulses with no entryId as Sequelize doesn’t do it
      await Pulse.destroy({
        where: {
          entryId: null,
        },
        transaction: t,
      });

      await t.commit();
      return entry;
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean)
  public async deleteEntry(
    @Arg("id", (type) => Int) id: number
  ): Promise<boolean> {
    const entry = await Entry.findByPk(id);
    if (!entry) {
      throw new UserInputError("Entry not found");
    }
    await entry.destroy();
    return true;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Boolean)
  public async bumpEntry(
    @Arg("id", (type) => Int) id: number
  ): Promise<boolean> {
    const entry = await Entry.findByPk(id);
    if (!entry) {
      throw new UserInputError("Entry not found");
    }
    const date = new Date();
    const pulse = await Pulse.create({ creationDate: date });
    entry.$add("pulse", pulse);
    entry.recentActionDate = date;
    await entry.save();
    return true;
  }

  @FieldResolver((type) => [Song], { nullable: true })
  private async songs(@Root() entry: Entry): Promise<Song[]> {
    return entry.songs === undefined ? await entry.$get("songs") : entry.songs;
  }

  @FieldResolver((type) => [Tag], { nullable: true })
  private async tags(@Root() entry: Entry): Promise<Tag[]> {
    return entry.tags === undefined ? await entry.$get("tags") : entry.tags;
  }

  @FieldResolver((type) => [Verse], { nullable: true })
  private async verses(@Root() entry: Entry): Promise<Verse[]> {
    return entry.verses === undefined
      ? await entry.$get("verses")
      : entry.verses;
  }

  @FieldResolver((type) => [Pulse], { nullable: true })
  private async pulses(@Root() entry: Entry): Promise<Pulse[]> {
    return entry.pulses === undefined
      ? await entry.$get("pulses")
      : entry.pulses;
  }

  @FieldResolver((type) => User)
  private async author(@Root() entry: Entry): Promise<User> {
    return entry.author === undefined
      ? await entry.$get("author")
      : entry.author;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Entry)
  public async pulseEntry(@Arg("id") id: number): Promise<Entry> {
    const entry = await Entry.findByPk(id);
    if (!entry) {
      throw new UserInputError("Entry not found");
    }
    await entry.$create("pulse", {});
    return entry;
  }

  @Authorized("ADMIN")
  @Mutation((returns) => Entry)
  public async unpulseEntry(
    @Arg("id") id: number,
    @Arg("pulseId") pulseId: number
  ): Promise<Entry> {
    const entry = await Entry.findByPk(id);
    if (!entry) {
      throw new UserInputError("Entry not found");
    }
    await entry.$remove("pulse", pulseId);
    await entry.reload({ include: ["pulses"] });
    await entry.update({
      recentActionDate: new Date(
        Math.max(
          entry.creationDate.valueOf(),
          ...entry.pulses.map((p) => p.creationDate.valueOf())
        )
      ),
    });
    return entry;
  }
}
