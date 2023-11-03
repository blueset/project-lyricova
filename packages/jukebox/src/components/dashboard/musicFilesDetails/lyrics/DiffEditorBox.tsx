import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { createRef, useMemo, useState } from "react";
import { FURIGANA, Lyrics, LyricsLine, TIME_TAG } from "lyrics-kit/core";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import KeyboardReturnIcon from "@mui/icons-material/KeyboardReturn";

function PreviewLine({ line }: { line: LyricsLine }) {
  const rubyGroups = useMemo((): [string, string | null, number][] => {
    const furigana = line?.attachments?.content?.[FURIGANA]?.attachment;
    if (!furigana) {
      return [[line.content, null, 0]];
    }
    const groups: [string, string | null, number][] = [];
    let ptr = 0;
    for (const label of furigana) {
      const prev = line.content.slice(ptr, label.range[0]);
      if (prev) groups.push([prev, null, ptr]);
      groups.push([
        line.content.slice(label.range[0], label.range[1]),
        label.content,
        label.range[0],
      ]);
      ptr = label.range[1];
    }
    const last = line.content.slice(ptr);
    if (last) groups.push([last, null, ptr]);
    return groups;
  }, [line]);
  const hasTagMapping = useMemo(() => {
    return new Set([
      ...(line.attachments?.content?.[TIME_TAG]?.tags ?? []).map(
        (t) => t.index
      ),
    ]);
  }, [line]);
  return (
    <div>
      {rubyGroups.map(([base, ruby, count]) => {
        const baseElm = [...base].map((v, idx) => (
          <Box
            key={idx}
            display="inline"
            sx={{
              borderColor: "secondary.main",
              borderInlineStartStyle: "solid",
              borderInlineStartWidth: hasTagMapping.has(idx + count) ? 1 : 0,
            }}
          >
            {v}
          </Box>
        ));
        return ruby ? (
          <ruby key={count}>
            {baseElm}
            <rt>{ruby}</rt>
          </ruby>
        ) : (
          <span key={count}>{baseElm}</span>
        );
      })}
      {hasTagMapping.has(line.content.length) && (
        <Box
          display="inline"
          sx={{
            borderColor: "secondary.main",
            borderInlineStartStyle: "solid",
            borderInlineStartWidth: 1,
            color: "text.secondary",
            opacity: 0.5,
          }}
        >
          ¶
        </Box>
      )}
    </div>
  );
}

interface Props {
  title: string;
  value: string;
  lineBreakButton?: boolean;
  onChange: (value: string) => void;
}

export default function DiffEditorTextarea({
  title,
  value,
  lineBreakButton,
  onChange,
}: Props) {
  const [panel, setPanel] = useState<"preview" | "edit">("edit");
  const textfieldRef = createRef<HTMLTextAreaElement>();

  const lyricsObj = useMemo(() => {
    try {
      return new Lyrics(value);
    } catch {
      return null;
    }
  }, [value]);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
      >
        <Typography variant="overline" display="inline">
          {title}
        </Typography>
        <Stack direction="row" spacing={2}>
          {lineBreakButton && panel === "edit" && (
            <Button
              sx={{ minWidth: 0, px: 1 }}
              variant="outlined"
              aria-label="Insert line break (⏎)"
              onClick={() => {
                const elm = textfieldRef.current;
                if (!elm) return;
                const start = elm.selectionStart;
                const end = elm.selectionEnd;
                elm.setRangeText("⏎", start, end, "end");
                onChange(elm.value);
                elm.focus();
              }}
            >
              <KeyboardReturnIcon />
            </Button>
          )}
          <ToggleButtonGroup
            value={panel}
            size="small"
            exclusive
            onChange={(evt, val) => setPanel(val)}
            aria-label="text alignment"
          >
            <ToggleButton value="edit">Edit</ToggleButton>
            <ToggleButton value="preview">Preview</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>
      {panel === "edit" ? (
        <TextField
          fullWidth
          inputRef={textfieldRef}
          value={value || ""}
          inputProps={{ sx: { fontFamily: "monospace" }, lang: "ja" }}
          onChange={(evt) => onChange(evt.target.value)}
          multiline
          variant="outlined"
        />
      ) : (
        <div>
          {lyricsObj.lines.map((l, idx) => (
            <PreviewLine key={idx} line={l} />
          ))}
        </div>
      )}
    </Stack>
  );
}
