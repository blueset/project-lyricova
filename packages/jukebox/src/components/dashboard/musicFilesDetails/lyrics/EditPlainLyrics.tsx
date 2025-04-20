import { Button } from "@lyricova/components/components/ui/button";
import { Textarea } from "@lyricova/components/components/ui/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lyricova/components/components/ui/toggle-group";
import type { ChangeEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { FURIGANA, Lyrics } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import { gql, useApolloClient } from "@apollo/client";

const KARAOKE_TRANSLITERATION_QUERY = gql`
  query ($text: String!) {
    transliterate(text: $text) {
      karaoke(language: "ja")
    }
  }
`;

interface Props {
  lyrics: string;
  lrcx: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditPlainLyrics({ lyrics, lrcx, setLyrics }: Props) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setLyrics(event.target.value);
    },
    [setLyrics]
  );

  const languages = useMemo(() => {
    return lrcx ? new Lyrics(lrcx).translationLanguages : [];
  }, [lrcx]);
  const [selectedLanguageIdx, setSelectedLanguageIdx] = useState(0);

  const snackbar = useSnackbar();
  const apolloClient = useApolloClient();

  const copyFromLRCX = useCallback(
    (useFurigana: boolean) => () => {
      try {
        const parsed = new Lyrics(lrcx);
        setLyrics(
          parsed.toPlainLRC({
            lineOptions: {
              useFurigana,
              translationLanguage: languages[selectedLanguageIdx],
            },
          })
        );
      } catch (e) {
        snackbar.enqueueSnackbar(`Error while copying: ${e}`, {
          variant: "error",
        });
      }
    },
    [lrcx, setLyrics, snackbar, languages, selectedLanguageIdx]
  );

  const copyFromLRCXWithSmartFurigana = useCallback(async () => {
    try {
      const parsed = new Lyrics(lrcx);
      const result = await apolloClient.query<{
        transliterate: { karaoke: [string, string][][] };
      }>({
        query: KARAOKE_TRANSLITERATION_QUERY,
        variables: { text: parsed.lines.map((v) => v.content).join("\n") },
      });
      if (result.data) {
        result.data.transliterate.karaoke.forEach((v, idx) => {
          const line = parsed.lines[idx];
          if (!line || v.length < 1) return;
          const { tags } = v.reduce<{
            len: number;
            tags: [string, [number, number]][];
          }>(
            ({ len, tags }, [base, furigana]) => {
              if (base === furigana) return { len: len + base.length, tags };
              else {
                tags.push([furigana, [len, len + base.length]]);
                return { len: len + base.length, tags };
              }
            },
            { len: 0, tags: [] }
          );
          if (line.attachments?.content?.[FURIGANA]?.attachment?.length) {
            line.attachments.content[FURIGANA].attachment =
              line.attachments.content[FURIGANA].attachment.filter(
                (label) =>
                  tags.findIndex(
                    (tag) =>
                      tag[0] === label.content &&
                      tag[1][0] === label.range[0] &&
                      tag[1][1] === label.range[1]
                  ) < 0
              );
          }
        });
        setLyrics(
          parsed.toPlainLRC({
            lineOptions: {
              useFurigana: true,
              translationLanguage: languages[selectedLanguageIdx],
            },
          })
        );
      }
    } catch (e) {
      snackbar.enqueueSnackbar(`Error while copying: ${e}`, {
        variant: "error",
      });
    }
  }, [apolloClient, languages, lrcx, selectedLanguageIdx, setLyrics, snackbar]);

  return (
    <>
      <div className="flex flex-col gap-4 h-full">
        <div className="flex flex-col md:flex-row gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
              Copy from
            </span>
            <div className="flex flex-wrap gap-2 mb-2">
              <Button
                variant="outline"
                disabled={!lrcx}
                onClick={copyFromLRCX(false)}
                type="button"
              >
                LRCX
              </Button>
              <Button
                variant="outline"
                disabled={!lrcx}
                onClick={copyFromLRCX(true)}
                type="button"
              >
                LRCX with Furigana
              </Button>
              <Button
                variant="outline"
                disabled={!lrcx}
                onClick={copyFromLRCXWithSmartFurigana}
                type="button"
              >
                LRCX with Smart Furigana
              </Button>
            </div>
          </div>
          {languages.length ? (
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-2">
                Translation Language
              </span>
              <ToggleGroup type="single" value={`${selectedLanguageIdx}`}>
                {languages.map((v, idx) => (
                  <ToggleGroupItem
                    key={idx}
                    value={`${idx}`}
                    onClick={() => setSelectedLanguageIdx(idx)}
                  >
                    {v || "Unknown"}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          ) : null}
        </div>
        <Textarea
          id="lyrics-source"
          className="font-mono h-full grow resize-none"
          placeholder="Lyrics source"
          value={lyrics || ""}
          onChange={handleChange}
          lang="ja"
        />
      </div>
    </>
  );
}
