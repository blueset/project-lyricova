import {
  Button,
  CircularProgress,
  Grid2 as Grid,
  IconButton,
  Stack,
  styled,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Tooltip,
  ButtonGroup,
  Menu,
  MenuItem,
} from "@mui/material";
import DismissibleAlert from "../../DismissibleAlert";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Lyrics, TRANSLATION } from "lyrics-kit/core";
import { useSnackbar } from "notistack";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useNamedState } from "../../../../hooks/useNamedState";
import { smartypantsu } from "smartypants";
import { gql, useApolloClient, useQuery } from "@apollo/client";
import { useAuthContext } from "lyricova-common/components/AuthContext";
import { fetchEventData } from "fetch-sse";
import HoverPopover from "material-ui-popup-state/HoverPopover";
import PopupState, {
  bindHover,
  bindMenu,
  bindPopover,
  bindTrigger,
} from "material-ui-popup-state";
import type { VocaDBLyricsEntry } from "../../../../graphql/LyricsProvidersResolver";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

const TRANSLATION_ALIGNMENT_QUERY = gql`
  query ($translation: String!, $original: String!) {
    translationAlignment(translation: $translation, original: $original)
  }
`;

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
  lyrics: string;
  setLyrics: (lyrics: string) => void;
  songId: number;
}

const StyledHoverPopover = styled(HoverPopover)(({ theme }) => ({
  "& .MuiPaper-root": {
    padding: theme.spacing(0, 2),
    maxHeight: "80vh",
    overflowY: "auto",
  },
}));

const ReasoningContainer = styled("div")(({ theme }) => ({
  maxHeight: "4.5em", // Approximately 3 lines
  overflowY: "auto",
  padding: theme.spacing(1),
  marginTop: theme.spacing(1),
  fontStyle: "italic",
  color: theme.palette.text.secondary,
  whiteSpace: "pre-wrap",
  maxWidth: "80ch",
}));

export default function EditTranslations({ lyrics, setLyrics, songId }: Props) {
  const snackbar = useSnackbar();
  const authContext = useAuthContext();

  const apolloClient = useApolloClient();
  const [isAlignmentLoading, setIsAlignmentLoading] = useState(false);

  const parsedLyrics = useMemo<Lyrics | null>(() => {
    if (!lyrics) return null;
    try {
      return new Lyrics(lyrics);
    } catch (e) {
      console.error(`Error while loading lyrics text: ${e}`, e);
      snackbar.enqueueSnackbar(`Error while loading lyrics text: ${e}`, {
        variant: "error",
      });
      return null;
    }
  }, [lyrics, snackbar]);

  const [languages, setLanguages] = useNamedState<(string | undefined)[]>(
    [],
    "languages"
  );
  const [currentLanguageIdx, setCurrentLanguageIdx] = useNamedState<number>(
    0,
    "currentLanguageIdx"
  );
  const currentLanguage = languages[currentLanguageIdx];
  const currentLanguageRef = useRef<string | undefined>();
  currentLanguageRef.current = currentLanguage;

  const [translatedLines, setTranslatedLines] = useNamedState<
    (string | null)[]
  >([], "translatedLines");
  const translatedLinesRef = useRef<(string | null)[]>();
  translatedLinesRef.current = translatedLines;

  const { data: vocaDBTranslationsData } = useQuery<{
    vocaDBLyrics: VocaDBLyricsEntry[];
  }>(VOCADB_LYRICS_QUERY, {
    variables: { id: songId },
  });

  const vocaDBTranslations = (
    vocaDBTranslationsData?.vocaDBLyrics || []
  ).filter((translation) => translation.translationType === "Translation");

  // Build `translatedLines`.
  useEffect(() => {
    if (parsedLyrics) {
      const languages = parsedLyrics.translationLanguages;
      setLanguages(languages);
      const defaultLanguage = languages[0] || undefined;
      setCurrentLanguageIdx(0);

      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(defaultLanguage) ?? null
      );
      setTranslatedLines(lines);
    } else {
      setTranslatedLines([]);
    }

    return () => {
      if (parsedLyrics) {
        const translatedLines = translatedLinesRef.current;
        parsedLyrics.lines.forEach((v, idx) => {
          v.attachments.setTranslation(
            translatedLines[idx],
            currentLanguageRef.current
          );
        });
        setLyrics(parsedLyrics.toString());
      }
    };
    // Dropping dependencies [parsedLyrics] to prevent infinite loop between this effect and `parsedLyrics`
  }, [setLyrics, setTranslatedLines, setCurrentLanguageIdx, setLanguages]);

  useEffect(() => {
    if (parsedLyrics) {
      const lines = parsedLyrics.lines.map(
        (v) => v?.attachments?.translation(currentLanguage) ?? null
      );
      setTranslatedLines(lines);
    }
  }, [currentLanguage, parsedLyrics, setTranslatedLines]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setTranslatedLines(event.target.value.split("\n"));
    },
    [setTranslatedLines]
  );

  const handleLanguageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setLanguages((languages) => {
        const newLanguages = [...languages];
        const oldLang = newLanguages[currentLanguageIdx];
        const newLang = event.target.value;
        newLanguages[currentLanguageIdx] = newLang;
        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(translatedLines[idx], newLang);
          v.attachments.setTranslation(null, oldLang);
        });
        return newLanguages;
      });
    },
    [currentLanguageIdx, parsedLyrics, setLanguages, setLyrics, translatedLines]
  );

  const handleLanguageSwitch = useCallback(
    (event: React.MouseEvent<HTMLElement>, value: number) => {
      if (value === null) return;
      // commit current language translations
      const translatedLines = translatedLinesRef.current;
      parsedLyrics?.lines.forEach((v, idx) => {
        v.attachments.setTranslation(translatedLines[idx], currentLanguage);
      });
      setLyrics(parsedLyrics.toString());
      setCurrentLanguageIdx(value);
    },
    [currentLanguage, parsedLyrics, setCurrentLanguageIdx, setLyrics]
  );

  const handleDeleteLanguage = useCallback(
    (idx: number) => (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();

      setLanguages((languages) => {
        const newLanguages = [...languages];
        const deletedLang = newLanguages.splice(idx, 1)[0];
        setCurrentLanguageIdx((idx) => Math.min(idx, newLanguages.length - 1));

        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(null, deletedLang);
        });
        setLyrics(parsedLyrics.toString());
        return newLanguages;
      });
    },
    [setCurrentLanguageIdx, setLanguages]
  );

  const handleAddLanguage = useCallback(() => {
    setLanguages((languages) => {
      setCurrentLanguageIdx(languages.length);
      return [...languages, `lang-${languages.length}`];
    });
  }, [setCurrentLanguageIdx, setLanguages]);

  const handleFixQuotes = useCallback(() => {
    setTranslatedLines((lines) => {
      try {
        return lines.map((line) => {
          return typeof line === "string" ? smartypantsu(line) : line;
        });
      } catch (e) {
        snackbar.enqueueSnackbar(`Error while applying rules: ${e}`, {
          variant: "error",
        });
        console.error(e);
        return lines;
      }
    });
  }, [setTranslatedLines]);

  const [chunkBuffer, setChunkBuffer] = useState<string>("");
  const [reasoningBuffer, setReasoningBuffer] = useState<string>("");
  const reasoningContainerRef = useRef<HTMLDivElement>(null);

  const isScrolledToBottom = useCallback(() => {
    const container = reasoningContainerRef.current;
    if (!container) return false;
    return (
      Math.abs(
        container.scrollHeight - container.clientHeight - container.scrollTop
      ) < 1
    );
  }, []);

  useEffect(() => {
    if (reasoningContainerRef.current && isScrolledToBottom()) {
      reasoningContainerRef.current.scrollTop =
        reasoningContainerRef.current.scrollHeight;
    }
  }, [reasoningBuffer, isScrolledToBottom]);

  const handleAlignment = useCallback(
    (model?: string) => async () => {
      const translation = translatedLines.join("\n");
      const original =
        parsedLyrics?.lines.map((v) => v.content).join("\n") || "";
      setIsAlignmentLoading(true);
      setChunkBuffer("");
      setReasoningBuffer("");
      try {
        const token = authContext.jwt();
        await fetchEventData("/api/llm/translation-alignment", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          data: { translation, original, model },
          onMessage: (event) => {
            const data = JSON.parse(event.data);
            if (data.error) {
              console.error(data.error);
              snackbar.enqueueSnackbar(`Error while aligning: ${data.error}`, {
                variant: "error",
              });
              setIsAlignmentLoading(false);
            } else if (data.aligned) {
              setTranslatedLines(data.aligned.split("\n"));
            } else if (data.chunk) {
              setChunkBuffer((prev) => prev + data.chunk);
            } else if (data.reasoning) {
              const wasScrolledToBottom = isScrolledToBottom();
              setReasoningBuffer((prev) => {
                const newValue = prev + data.reasoning;
                if (wasScrolledToBottom && reasoningContainerRef.current) {
                  setTimeout(() => {
                    reasoningContainerRef.current?.scrollTo(
                      0,
                      reasoningContainerRef.current.scrollHeight
                    );
                  }, 0);
                }
                return newValue;
              });
            }
          },
          onClose: () => {
            snackbar.enqueueSnackbar("Alignment completed", {
              variant: "success",
            });
            setIsAlignmentLoading(false);
          },
          onError: (error) => {
            console.error(error);
            snackbar.enqueueSnackbar(`Error while aligning: ${error}`, {
              variant: "error",
            });
            setIsAlignmentLoading(false);
          },
        });
        snackbar.enqueueSnackbar("Alignment completed", {
          variant: "success",
        });
      } catch (e) {
        snackbar.enqueueSnackbar(`Error while aligning: ${e}`, {
          variant: "error",
        });
        return;
      } finally {
        setIsAlignmentLoading(false);
      }
    },
    [
      authContext,
      parsedLyrics?.lines,
      setTranslatedLines,
      snackbar,
      translatedLines,
      isScrolledToBottom,
    ]
  );

  const handleImportTranslation = useCallback(
    (translation: VocaDBLyricsEntry) => {
      const lines = translation.value.split("\n");
      setLanguages((languages) => {
        let newLanguage = translation.cultureCodes?.[0] || "lang";
        let idx = 0;
        while (languages.includes(newLanguage)) {
          newLanguage = `${newLanguage}-${++idx}`;
        }
        const newLanguages = [...languages, newLanguage];
        setCurrentLanguageIdx(newLanguages.length - 1);
        parsedLyrics?.lines.forEach((v, idx) => {
          v.attachments.setTranslation(lines[idx], newLanguage);
        });
        setLyrics(parsedLyrics.toString());
        setTranslatedLines(lines);
        return newLanguages;
      });
    },
    [
      parsedLyrics,
      setLanguages,
      setCurrentLanguageIdx,
      setLyrics,
      setTranslatedLines,
    ]
  );

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Stack direction="column" spacing={1}>
          <DismissibleAlert severity="warning">
            Switch to another tab to save changes.
          </DismissibleAlert>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Language"
              size="small"
              value={currentLanguage || ""}
              placeholder="Unknown"
              onChange={handleLanguageChange}
            />
            <span>Translations:</span>
            <ToggleButtonGroup
              value={currentLanguageIdx}
              size="small"
              onChange={handleLanguageSwitch}
              exclusive
            >
              {languages.map((v, idx) => (
                <ToggleButton key={idx} value={idx}>
                  #{idx} ({v || "Unknown"})
                  <IconButton size="small" onClick={handleDeleteLanguage(idx)}>
                    <DeleteIcon />
                  </IconButton>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <IconButton onClick={handleAddLanguage}>
              <AddIcon />
            </IconButton>
            <Button variant="outlined" onClick={handleFixQuotes}>
              Fix quotes
            </Button>
            <ButtonGroup>
              <PopupState variant="popover" popupId="llm-alignment">
                {(popupState) => (
                  <>
                    <div {...bindHover(popupState)}>
                      <Button
                        variant="outlined"
                        onClick={handleAlignment()}
                        disabled={isAlignmentLoading}
                      >
                        LLM Alignment
                        {isAlignmentLoading && (
                          <CircularProgress
                            size={16}
                            value={
                              chunkBuffer
                                ? Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      (chunkBuffer.split("\n").length * 100) /
                                        (parsedLyrics.lines.length * 4 + 2)
                                    )
                                  )
                                : undefined
                            }
                            variant={
                              chunkBuffer ? "determinate" : "indeterminate"
                            }
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Button>
                    </div>
                    {chunkBuffer || reasoningBuffer ? (
                      <StyledHoverPopover
                        {...bindPopover(popupState)}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "center",
                        }}
                        transformOrigin={{
                          vertical: "top",
                          horizontal: "center",
                        }}
                      >
                        {reasoningBuffer && (
                          <ReasoningContainer ref={reasoningContainerRef}>
                            {reasoningBuffer}
                          </ReasoningContainer>
                        )}
                        <pre>{chunkBuffer || "…"}</pre>
                      </StyledHoverPopover>
                    ) : null}
                  </>
                )}
              </PopupState>
              <PopupState
                variant="popover"
                popupId="llm-alignment-select-model"
              >
                {(popupState) => (
                  <>
                    <Button
                      variant="outlined"
                      {...bindTrigger(popupState)}
                      disabled={isAlignmentLoading}
                      sx={{ px: 0}}
                    >
                      <ArrowDropDownIcon />
                    </Button>
                    <Menu
                      {...bindMenu(popupState)}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "center",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "center",
                      }}
                    >
                      {[
                        "openai/o1-mini",
                        "deepseek/deepseek-chat:free",
                        "openai/o1",
                        "openai/gpt-4o",
                        "openai/o3-mini",
                        "google/gemma-3-27b-it:free",
                        "meta-llama/llama-3.1-70b-instruct:free",
                        "qwen/qwq-32b:free",
                        "qwen/qwen-2.5-72b-instruct:free",
                        "meta-llama/llama-3.3-70b-instruct:free",
                      ].map((model) => (
                        <MenuItem
                          key={model}
                          disabled={isAlignmentLoading}
                          onClick={() => {
                            popupState.close();
                            handleAlignment(model)();
                          }}
                        >
                          {model}
                        </MenuItem>
                      ))}
                    </Menu>
                  </>
                )}
              </PopupState>
            </ButtonGroup>
            <span>VocaDB:</span>
            {vocaDBTranslations.map((translation) => (
              <Tooltip
                key={translation.id}
                title={
                  <>
                    {translation.cultureCodes?.join(", ")} –{" "}
                    {translation.source}
                    <br />
                    {translation.value.substring(0, 100)}…
                  </>
                }
              >
                <Button
                  variant="outlined"
                  sx={{ minWidth: 0 }}
                  onClick={() => handleImportTranslation(translation)}
                >
                  {translation.cultureCodes?.join(", ")}
                </Button>
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <Typography variant="overline">Preview</Typography>
        {parsedLyrics?.lines.map((v, idx) => (
          <div key={idx}>
            <Typography
              variant="body2"
              display="inline"
              sx={{
                color:
                  v.content.trim() && !translatedLines[idx]
                    ? "secondary.light"
                    : "textSecondary",
              }}
              lang="ja"
            >
              {v.content}
            </Typography>
            <Typography variant="body2" display="inline" color="textSecondary">
              {" ✲ "}
            </Typography>
            <Typography
              variant="body2"
              display="inline"
              lang={currentLanguage || "zh"}
              sx={{
                color:
                  translatedLines[idx] && !v.content.trim()
                    ? "secondary.light"
                    : "textSecondary",
              }}
            >
              {translatedLines[idx]}
            </Typography>
          </div>
        ))}
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField
          id="translations"
          label="Translations"
          fullWidth
          value={translatedLines.join("\n")}
          onChange={handleChange}
          multiline
          variant="outlined"
          slotProps={{
            htmlInput: { lang: currentLanguage || "zh" },
          }}
        />
      </Grid>
    </Grid>
  );
}
