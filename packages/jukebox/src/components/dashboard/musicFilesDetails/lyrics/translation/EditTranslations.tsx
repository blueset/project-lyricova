import { gql, useQuery } from "@apollo/client";
import type { VocaDBLyricsEntry } from "@lyricova/api/graphql/types";
import LanguagePicker from "./LanguagePicker";
import LyricsTools from "./LyricsTools";
import VocaDBTranslationImport from "./VocaDBTranslationImport";
import TranslationPreview from "./TranslationPreview";
import TranslationTextarea from "./TranslationTextarea";

const VOCADB_LYRICS_QUERY = gql`
  query ($id: Int!) {
    vocaDBLyrics(id: $id) {
      id
      translationType
      cultureCodes
      source
      url
      value
    }
  }
`;

interface Props {
  songId: number;
}

export default function EditTranslations({ songId }: Props) {
  const { data: vocaDBTranslationsData } = useQuery<{
    vocaDBLyrics: VocaDBLyricsEntry[];
  }>(VOCADB_LYRICS_QUERY, {
    variables: { id: songId },
  });

  const vocaDBTranslations = (
    vocaDBTranslationsData?.vocaDBLyrics || []
  ).filter((translation) => translation.translationType === "Translation");

  return (
    <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
      <div className="col-span-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <LanguagePicker />
            <div className="flex flex-row">
              <LyricsTools />
            </div>
            {vocaDBTranslations?.length > 0 && (
              <>
                <span>VocaDB:</span>
                <VocaDBTranslationImport
                  vocaDBTranslations={vocaDBTranslations}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <TranslationPreview />
      <TranslationTextarea />
    </div>
  );
}
