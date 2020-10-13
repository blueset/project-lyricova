import { TextField } from "@material-ui/core";
import { ChangeEvent, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";

const useStyle = makeStyles((theme) => ({
  textField: {
    fontFamily: "monospace",
  },
}));

interface Props {
  lyrics: string;
  setLyrics: (lyrics: string) => void;
}

export default function EditLyrics({ lyrics, setLyrics }: Props) {
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLyrics(event.target.value);
  }, [setLyrics]);

  const styles = useStyle();

  return <TextField
    id="lyrics-source"
    label="Lyrics source"
    fullWidth
    value={lyrics}
    inputProps={{ className: styles.textField, lang: "ja" }}
    onChange={handleChange}
    multiline
    variant="outlined"
  />;
}
