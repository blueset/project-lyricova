import { IconButton, InputAdornment } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ClearIcon from "@mui/icons-material/Clear";
import { useCallback } from "react";
import { useSnackbar } from "notistack";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import { useField, useForm } from "react-final-form";

interface Props {
  name: string
}

export default function VideoThumbnailAdornment({ name }: Props) {
  const snackbar = useSnackbar();
  const { input: { value }} = useField(name);
  const setValue = useForm().mutators.setValue;

  const convertUrl = useCallback(() => {

    if (value.match(/(nicovideo.jp\/watch|nico.ms)\/([a-z]{2}\d{4,10}|\d{6,12})/g)) {
      const numId = value.match(/\d{6,12}/g);
      if (numId) {
        setValue(name, `https://tn.smilevideo.jp/smile?i=${numId[0]}`);
        return;
      }
    } else if (value.match(/(youtu.be\/|youtube.com\/watch\?\S*?v=)\S{11}/g)) {
      const id = /(youtu.be\/|youtube.com\/watch\?\S*?v=)(\S{11})/g.exec(value);
      setValue(name, `https://img.youtube.com/vi/${id[2]}/maxresdefault.jpg`);
      return;
    }

    snackbar.enqueueSnackbar("URL is not from a known site, no thumbnail is converted.", {
      variant: "info",
    });
  }, [name, setValue, snackbar, value]);


  return (
    <InputAdornment position="end">
      <IconButton
        size="small"
        aria-label="Convert from video site link"
        onClick={convertUrl}
      >
        <AutorenewIcon />
      </IconButton>
    </InputAdornment>
  );
}