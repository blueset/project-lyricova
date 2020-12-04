/**
 * Some code in this document is adapted from “LRC Maker”.
 *
 * LRC Maker (https://github.com/magic-akari/lrc-maker)
 * Copyright (c) 阿卡琳 licensed under MIT License
 */
import { PlayerState, useNamedState, usePlayerState } from "../../../../frontendUtils/hooks";
import { useCallback, useEffect, useRef, MouseEvent, ChangeEvent, useMemo } from "react";
import { fade, makeStyles } from "@material-ui/core/styles";
import {
  Button,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon, ListItemSecondaryAction,
  ListItemText,
  Switch,
  Typography
} from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import _ from "lodash";
import { buildTimeTag, resolveTimeTag } from "lyrics-kit/build/main/utils/regexPattern";
import { linearRegression } from "simple-statistics";
import clsx from "clsx";
import DismissibleAlert from "../../DismissibleAlert";

type LinesPerTag = [number, string[]][];

const useStyles = makeStyles((theme) => ({
  controls: {
    position: "sticky",
    top: 0,
    left: 0,
    zIndex: 1,
    backgroundColor: fade(theme.palette.background.paper, 0.5),
    backdropFilter: "blur(5px)",
    padding: theme.spacing(1, 0),
  },
  controlsRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing(1),
    "&:last-child": {
      marginBottom: 0,
    }
  },
  mainControlItem: {
    flexGrow: 1,
  },
  controlElement: {
    margin: theme.spacing(0, 2),
  },
  lyricsLine: {
    display: "flex",
    flexDirection: "row",
    alignItems: "start",
  },
  tabularNumbers: {
    fontVariantNumeric: "tabular-nums",
  },
  formula: {
    fontFamily: "serif",
  },
}));

const BLANK_LINE = { index: Infinity, start: Infinity, end: -Infinity, };

interface CurrentLineState {
  index: number;
  start: number;
  end: number;
}

interface Props {
  lyrics: string;
  setLyrics: (v: string) => void;
  fileId: number;
}

export default function TaggingLyrics({ lyrics, setLyrics, fileId }: Props) {
  /**
   * Lines per tag:
   * ```js
   * [
   *  ["", ["Untagged line"]],
   *  ["[12:34.56]", ["Tagged line"]],
   *  ["[12:56.78]", ["Tagged line with", "[tr]Attachments"]],
   *  ["", ["Another untagged line"]],
   * ]
   * ```
   */
  const [linesPerTag, setLinesPerTag] = useNamedState<LinesPerTag>([], "linesPerTag");
  const linesPerTagRef = useRef<LinesPerTag>();
  linesPerTagRef.current = linesPerTag;

  const playerRef = useRef<HTMLAudioElement>();
  const styles = useStyles();
  const [playbackRate, setPlaybackRate] = useNamedState(1, "playbackRate");

  const listRef = useRef<HTMLUListElement>();

  const [cursor, setCursor] = useNamedState<number>(0, "cursor");
  const cursorRef = useRef<number | null>();
  cursorRef.current = cursor;

  const [currentLine, setCurrentLine] = useNamedState<CurrentLineState>(BLANK_LINE, "currentLine");
  const currentLineRef = useRef<CurrentLineState>();
  currentLineRef.current = currentLine;

  const playerState = usePlayerState(playerRef);
  const playerStateRef = useRef<PlayerState>();
  playerStateRef.current = playerState;

  const [isInExtrapolateMode, toggleExtrapolateMode] = useNamedState<boolean>(false, "isInExtrapolateMode");
  const isInExtrapolateModeRef = useRef<boolean>();
  isInExtrapolateModeRef.current = isInExtrapolateMode;
  const [extrapolateTags, setExtrapolateTags] = useNamedState<(number | null)[]>([], "extrapolateTags");
  const extrapolateTagsRef = useRef<(number | null)[]>();
  extrapolateTagsRef.current = extrapolateTags;

  const linearRegressionResult = useMemo<{ m: number; b: number; } | null>(() => {
    const points: [number, number][] = [];
    for (let i = 0; i < Math.min(linesPerTag.length, extrapolateTags.length); i++) {
      if (extrapolateTags[i] != null && linesPerTag[i]?.[0] != null) {
        points.push([linesPerTag[i]?.[0], extrapolateTags[i]]);
      }
    }
    if (points.length < 1) return null;
    return linearRegression(points);
  }, [linesPerTag, extrapolateTags]);

  // Build `linesPerTag`.
  useEffect(() => {
    // Do nothing when no lyrics is found
    if (!lyrics) {
      setLinesPerTag([]);
      return () => {/* No-op */};
    }

    const mapping: { [key: string]: string[] } = {};
    const lpt: [string, string[]][] = [];
    const splitLines = lyrics.split("\n").map(v => {
      const matches = v.match(/^(\[[0-9:.]+\])?(.*)$/);
      if (matches) {
        return [matches[1], matches[2]];
      }
      return ["", v];
    });

    splitLines.forEach(([tag, content]) => {
      if (mapping[tag] !== undefined) {
        mapping[tag].push(content);
      } else {
        const contents = [content];
        lpt.push([tag, contents]);
        if (tag) {
          mapping[tag] = contents;
        }
      }
    });

    setLinesPerTag(lpt.map(([tag, lines]) => [resolveTimeTag(tag || "")?.[0] ?? null, lines]));

    return () => {
      const result: string[] = [];
      linesPerTagRef.current.forEach(([tag, lines]) => lines.forEach(line =>
        result.push((tag !== null ? `[${buildTimeTag(tag)}]` : "") + line)
      ));
      setLyrics(result.join("\n"));
    };
  }, [lyrics, setLinesPerTag, setLyrics]);

  // Update time tags
  const onFrame = useCallback((timestamp: number) => {
    const playerState = playerStateRef.current;
    const currentLine = currentLineRef.current;
    const linesPerTag = linesPerTagRef.current;

    let time: number;
    if (playerState.state === "paused") {
      time = playerState.progress;
    } else {
      time = (timestamp - playerState.startingAt) / 1000 * playerState.rate;
    }

    if ((time < currentLine.start || time > currentLine.end) && linesPerTag.length > 0) {
      const record = linesPerTag.reduce(
        (p, c, i) => {
          if (c[0]) {
            if (c[0] < p.end && c[0] > time) {
              p.end = c[0];
            }
            if (c[0] > p.start && c[0] <= time) {
              p.start = c[0];
              p.index = i;
            }
          }
          return p;
        },
        {
          index: -Infinity,
          start: -Infinity,
          end: Infinity,
        },
      );
      setCurrentLine(record);
    }

    if (playerState.state === "playing") {
      requestAnimationFrame(onFrame);
    }
  }, [setCurrentLine]);

  useEffect(() => {
    requestAnimationFrame(onFrame);
  }, [onFrame, playerState]);

  const handleExtrapolateModeToggle = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    toggleExtrapolateMode(event.target.checked);
    if (!event.target.checked) {
      setExtrapolateTags([]);
    }
  }, [toggleExtrapolateMode, setExtrapolateTags]);

  const applyExtrapolation = useCallback(() => {
    if (linearRegressionResult == null) return;
    const linesPerTag = [...linesPerTagRef.current];
    const extrapolated = linesPerTag.map(([v, l]) => {
      if (v == null) return [v, l] as [number, string[]];
      return [Math.max(0, linearRegressionResult.m * v + linearRegressionResult.b), l] as [number, string[]];
    });
    setLinesPerTag(extrapolated);
  }, [linearRegressionResult, setLinesPerTag]);

  const moveCursor = useCallback((idx: number | ((orig: number) => number)) => {
    setCursor((orig) => {
      let nidx = (typeof idx !== "number")  ? idx(orig) : idx;
      nidx = _.clamp(nidx, 0, linesPerTagRef.current.length);
      if (linesPerTagRef.current.length > 0 && listRef.current) {
        const item = listRef.current.children[nidx] as HTMLElement;
        if (!item) return nidx;
        item.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      return nidx;
    });
  }, [setCursor]);

  const onLineClick = useCallback(
    (idx: number) => (ev: MouseEvent<HTMLDivElement>) => {
      ev.stopPropagation();
      moveCursor(idx);
    },
    [moveCursor],
  );

  const onLineDoubleClick = useCallback(
    (idx: number) => (ev: MouseEvent<HTMLDivElement>) => {
      ev.stopPropagation();

      if (!playerRef.current?.duration) {
        return;
      }

      moveCursor(idx);
      const line = linesPerTagRef.current[idx];
      if (!line) return;
      playerRef.current.currentTime = line[0];
      if (playerStateRef.current.state !== "playing") {
        requestAnimationFrame(onFrame);
      }
    },
    [moveCursor, onFrame],
  );

  // Register key press listeners
  useEffect(() => {
    const listener = (ev: KeyboardEvent): void => {
      const { code, key, target } = ev;

      const codeOrKey = code || key;

      // Skip events targeted to an input.
      if (target !== null) {
        const type = (target as HTMLInputElement | HTMLTextAreaElement).type;
        if (type === "textarea" || type === "text" || type === "url") return;
      }

      if (codeOrKey === "Backspace" || codeOrKey === "Delete" || codeOrKey === "Del") {
        ev.preventDefault();

        if (!isInExtrapolateModeRef.current) {
          const linesPerTag = [...linesPerTagRef.current];
          const line = linesPerTag[cursorRef.current];
          if (!line) return;

          line[0] = null;
          setLinesPerTag(linesPerTag);
          setCurrentLine(BLANK_LINE);
        } else {
          setExtrapolateTags((extrapolateTags) => {
            extrapolateTags[cursorRef.current] = null;
            return [...extrapolateTags];
          });
        }
        return;
      }

      if (ev.metaKey === true || ev.ctrlKey === true) {
        if (["ArrowUp", "KeyJ", "Up", "J", "j"].includes(codeOrKey)) {
          ev.preventDefault();
          if (playerRef.current) {
            const rate = playerRef.current.playbackRate;
            playerRef.current.playbackRate = Math.exp(Math.min(Math.log(rate) + 0.2, 1));
            setPlaybackRate(playerRef.current.playbackRate);
          }
        } else if (["ArrowDown", "KeyK", "Down", "K", "k"].includes(codeOrKey)) {
          ev.preventDefault();
          if (playerRef.current) {
            const rate = playerRef.current.playbackRate;
            playerRef.current.playbackRate = Math.exp(Math.max(Math.log(rate) - 0.2, -1));
            setPlaybackRate(playerRef.current.playbackRate);
          }
        } else if (codeOrKey === "Enter") {
          ev.preventDefault();
          if (playerRef.current) {
            if (playerRef.current.paused) playerRef.current.play();
            else playerRef.current.pause();
          }
        }
        return;
      }

      if (code === "Space" || key === " " || key === "Spacebar") {
        ev.preventDefault();
        if (!playerRef.current) return;
        const time = playerRef.current.currentTime;
        const cursor = cursorRef.current;
        if (!isInExtrapolateModeRef.current) {
          setLinesPerTag((linesPerTag) => {
            const line = linesPerTag[cursorRef.current];
            if (!line) return linesPerTag;
            line[0] = time;
            setCurrentLine(BLANK_LINE);
            return linesPerTag;
          });
        } else {
          setExtrapolateTags((extrapolateTags) => {
            extrapolateTags[cursorRef.current] = time;
            return [...extrapolateTags];
          });
        }
        moveCursor(cursor => cursor + 1);
      } else if (["ArrowUp", "KeyW", "KeyJ", "Up", "W", "w", "J", "j"].includes(codeOrKey)) {
        ev.preventDefault();
        moveCursor(cursor => (cursor || 1) - 1);
      } else if (["ArrowDown", "KeyS", "KeyK", "Down", "S", "s", "K", "k"].includes(codeOrKey)) {
        ev.preventDefault();
        moveCursor(cursor => (cursor || 0) + 1);
      } else if (codeOrKey === "Home") {
        ev.preventDefault();
        moveCursor(0);
      } else if (codeOrKey === "End") {
        ev.preventDefault();
        moveCursor((linesPerTagRef.current?.length ?? 1) - 1);
      } else if (codeOrKey === "PageUp") {
        ev.preventDefault();
        moveCursor(cursor => (cursor || 10) - 10);
      } else if (codeOrKey === "PageDown") {
        ev.preventDefault();
        moveCursor(cursor => (cursor || 0) + 10);
      } else if (["ArrowLeft", "KeyA", "KeyH", "Left", "A", "a", "H", "h"].includes(codeOrKey)) {
        ev.preventDefault();
        if (playerRef.current) playerRef.current.currentTime -= 5;
      } else if (["ArrowRight", "KeyD", "KeyL", "Right", "D", "d", "L", "l"].includes(codeOrKey)) {
        ev.preventDefault();
        if (playerRef.current) playerRef.current.currentTime += 5;
      } else if (code === "KeyR" || key === "R" || key === "r") {
        ev.preventDefault();
        if (playerRef.current) playerRef.current.playbackRate = 1;
        setPlaybackRate(1);
      }
    };

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [linesPerTag, moveCursor, setCurrentLine, setExtrapolateTags, setLinesPerTag, setPlaybackRate]);

  return <>
    <div>
      <div className={styles.controls}>
        <div className={styles.controlsRow}>
          <DismissibleAlert severity="warning" collapseProps={{className: styles.mainControlItem}}>
            Switch to another tab to save changes. ↑WJ/↓SK: Navigate; Home/End: First/Last; PgUp/PgDn: +/-10 lines; ←AH/→DL: +/-5 seconds r: Reset rate; Space: Tag; Bksp: Remove; Cmd/Ctrl+(↑J/↓K: speed; Enter: play/pause).
          </DismissibleAlert>
        </div>
        <div className={styles.controlsRow}>
          <audio ref={playerRef} src={`/api/files/${fileId}/file`} controls className={styles.mainControlItem} />
          <Typography variant="body1" className={clsx(styles.controlElement, styles.tabularNumbers)}>@{playbackRate.toFixed(2)}x</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={isInExtrapolateMode}
                onChange={handleExtrapolateModeToggle}
                color="secondary"
              />
            }
            label="Extrapolate mode"
          />
        </div>
        {isInExtrapolateMode && <div className={styles.controlsRow}>
            <span className={styles.controlElement}>
              {extrapolateTags.reduce((prev, curr) => prev + (curr == null ? 0 : 1), 0)} tags added,{" "}
              formula: <span className={styles.formula}><var>y</var> = {linearRegressionResult?.m ?? "??"}<var>x</var> + {linearRegressionResult?.b ?? "??"}</span></span>
            <Button variant="outlined" color="secondary" disabled={!linearRegressionResult} onClick={applyExtrapolation}>Apply</Button>
        </div>}
      </div>


      <List component="ul" dense ref={listRef}>{linesPerTag.map((v, idx) =>
        <ListItem key={idx} dense button selected={idx === currentLine.index} onClickCapture={onLineClick(idx)}
                  onDoubleClickCapture={onLineDoubleClick(idx)} tabIndex={-1}>
          {idx === cursor && <ListItemIcon>
              <EditIcon />
          </ListItemIcon>}
          <ListItemText disableTypography className={styles.lyricsLine} inset={idx !== cursor}>
            <Typography variant="body1" component="span" display="block" className={styles.tabularNumbers}>
              {v[0] != undefined ? `[${buildTimeTag(v[0])}]` : ""}
            </Typography>
            <div>{v[1].map((l, lidx) => (
              <Typography key={`${idx}-${lidx}`} variant="body1" color="textSecondary" display="block">
                {l}
              </Typography>
            ))}</div>
          </ListItemText>
          <ListItemSecondaryAction>
            <span
              className={styles.tabularNumbers}>{extrapolateTags[idx] != undefined ? `[${buildTimeTag(extrapolateTags[idx])}]` : ""}</span>
          </ListItemSecondaryAction>
        </ListItem>
      )}</List>
    </div>
  </>;
}