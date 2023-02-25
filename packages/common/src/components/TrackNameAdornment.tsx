import { IconButton, InputAdornment } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ClearIcon from "@mui/icons-material/Clear";
import { useCallback } from "react";
import { useField, useForm } from "react-final-form";
import React from "react";

interface Props {
  sourceName: string;
  destinationName: string;
}

export default function TrackNameAdornment({
  sourceName,
  destinationName,
}: Props) {
  const {
    input: { trackName },
  } = useField(sourceName);
  const {
    input: { value },
  } = useField(destinationName);
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
      {(trackName !== "" || value !== "") && (
        <IconButton
          size="small"
          aria-label={!value ? "Clear" : "Copy from track name"}
          onClick={trackNameButtonCallback}
        >
          {!value ? <ContentCopyIcon /> : <ClearIcon />}
        </IconButton>
      )}
    </InputAdornment>
  );
}
