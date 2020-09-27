import { IconButton, InputAdornment } from "@material-ui/core";
import ContentCopyIcon from "@material-ui/icons/ContentCopy";
import ClearIcon from "@material-ui/icons/Clear";
import { useCallback } from "react";

interface Props {
  trackName: string;
  value: string;
  setField: (value: string) => void;
}

export default function TrackNameAdornment({ value, setField, trackName }: Props) {

  const trackNameButtonCallback = useCallback(() => {
    if (value === "" || value == null) {
      setField(trackName);
    } else {
      setField("");
    }
  }, [setField, value, trackName]);

  return (
    <InputAdornment position="end">
      {
        (trackName !== "" || value !== "") &&
        <IconButton
            size="small"
            aria-label={!value ? "Clear" : "Copy from track name"}
            onClick={trackNameButtonCallback}
        >
          {!value ? <ContentCopyIcon /> : <ClearIcon />}
        </IconButton>
      }
    </InputAdornment>
  );
}