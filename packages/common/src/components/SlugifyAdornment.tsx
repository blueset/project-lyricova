import { IconButton, InputAdornment } from "@mui/material";
import { useCallback } from "react";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useField, useForm } from "react-final-form";
import slugify from "slugify";
import React from "react";

interface Props {
  sourceName: string;
  destinationName: string;
}

export default function SlugifyAdornment({
  sourceName,
  destinationName,
}: Props) {
  const {
    input: { value },
  } = useField(sourceName);
  const { setValue, setUntouched } = useForm().mutators;

  const convertUrl = useCallback(() => {
    setValue(destinationName, slugify(value, { lower: true }));
    setUntouched(destinationName);
  }, [destinationName, setUntouched, setValue, value]);

  return (
    <InputAdornment position="end">
      <IconButton
        size="small"
        aria-label="Convert name into slug"
        onClick={convertUrl}
      >
        <AutorenewIcon />
      </IconButton>
    </InputAdornment>
  );
}
