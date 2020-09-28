import { IconButton, InputAdornment } from "@material-ui/core";
import ContentCopyIcon from "@material-ui/icons/ContentCopy";
import ClearIcon from "@material-ui/icons/Clear";
import { useCallback } from "react";
import { useField, useForm } from "react-final-form";

interface Props {
  sourceName: string;
  destinationName: string;
}

export default function TrackNameAdornment({ sourceName, destinationName }: Props) {
  const { input: { trackName }} = useField(sourceName);
  const { input: { value }} = useField(destinationName);
  const setValue = useForm().mutators.setValue;

  const trackNameButtonCallback = useCallback(() => {
    if (value === "" || value == null) {
      setValue(destinationName, trackName);
    } else {
      setValue(destinationName, "");
    }
  }, [value, setValue, destinationName, trackName]);

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