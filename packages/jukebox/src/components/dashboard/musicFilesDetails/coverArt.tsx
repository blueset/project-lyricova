import { Avatar, Box, Button, fade, Grid, TextField, Typography } from "@material-ui/core";
import MusicNoteIcon from "@material-ui/icons/MusicNote";
import ImageNotSupportedIcon from "@material-ui/icons/ImageNotSupported";
import { makeStyles } from "@material-ui/core/styles";
import { useNamedState } from "../../../frontendUtils/hooks";
import { ChangeEvent, useCallback, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { useAuthContext } from "../../public/AuthContext";
import { useSnackbar } from "notistack";

const useStyles = makeStyles((theme) => ({
  coverAvatar: {
    width: "100%",
    height: 0,
    overflow: "hidden",
    paddingTop: "100%",
    position: "relative",
    marginBottom: theme.spacing(2),
    "& > img": {
      position: "absolute",
      top: 0,
      left: 0,
      objectFit: "contain",
    },
    "& > svg": {
      position: "absolute",
      top: "calc(50% - 12px)",
      left: "calc(50% - 12px)",
    },
  },
  importButton: {
    marginLeft: theme.spacing(2),
  },
  container: {
    position: "relative",
  },
  dragCover: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: fade(theme.palette.secondary.dark, 0.9),
    borderColor: fade(theme.palette.secondary.light, 0.5),
    borderWidth: "2px",
    borderStyle: "solid",
    zIndex: 2,
  }
}));

interface SelectedImage {
  url?: string;
  blob?: Blob;
}

interface Props {
  fileId: number;
  trackName: string;
  hasCover: boolean;
  hasSong: boolean;
  hasAlbum: boolean;
  songCoverUrl?: string;
  albumCoverUrl?: string;
  refresh: () => unknown | Promise<unknown>;
}

export default function CoverArtPanel({
                                        fileId, hasCover, trackName,
                                        hasSong, songCoverUrl,
                                        hasAlbum, albumCoverUrl,
                                        refresh,
                                      }: Props) {
  const styles = useStyles();

  const [selectedImage, setSelectedImage] = useNamedState<SelectedImage>(null, "selectedImage");
  const [urlField, setUrlField] = useNamedState<string>("", "urlField");
  const [isSubmitting, toggleSubmitting] = useNamedState(false, "isSubmitting");
  const [cacheBustingToken, setCacheBustingToken] = useNamedState(new Date().getTime(), "cacheBustingToken");

  // Apply URL.
  const setImageUrl = useCallback((url: string) => () => setSelectedImage({ url }), [setSelectedImage]);
  const handleUrlFieldOnChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setUrlField(event.target.value);
  }, [setUrlField]);

  // Apply file selection
  const handleFileFieldOnChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files.length > 0) {
      setSelectedImage({ blob: event.target.files[0] });
    }
  }, [setUrlField]);

  // Drag and drop file
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedImage({ blob: acceptedFiles[0] });
    }
  }, [setSelectedImage]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop
  });

  // File from pasteboard
  const onPaste = useCallback((e: ClipboardEvent) => {
    if (!e.clipboardData) return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.type.startsWith("image/")) continue;
      const blob = item.getAsFile();
      if (!blob) continue;
      setSelectedImage({ blob });
      break;
    }
  }, [setSelectedImage]);
  useEffect(() => {
    const thisOnPaste = onPaste;
    window.addEventListener("paste", thisOnPaste);
    return () => {
      window.removeEventListener("paste", thisOnPaste);
    };
  }, [onPaste]);

  // Submit button action
  const authContext = useAuthContext();
  const snackBar = useSnackbar();
  const applyCover = useCallback(async () => {
    toggleSubmitting(true);

    if (!selectedImage) return;
    const token = authContext.jwt();
    const data = new FormData();

    if (selectedImage.url) {
      data.append("url", selectedImage.url);
    } else if (selectedImage.blob) {
      data.append("cover", selectedImage.blob);
    } else {
      return;
    }

    try {
      const result = await axios.patch(`/api/files/${fileId}/cover`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        }
      });

      if (result.status === 200) {
        snackBar.enqueueSnackbar("Cover image updated.", { variant: "success" });
        await refresh();
        setCacheBustingToken(new Date().getTime());
        toggleSubmitting(false);
      } else {
        snackBar.enqueueSnackbar(result.data.message, { variant: "error" });
        toggleSubmitting(false);
      }
    } catch (e) {
      snackBar.enqueueSnackbar(`Error occurred while saving cover: ${e}`, { variant: "error" });
      toggleSubmitting(false);
    }
  }, [authContext, fileId, selectedImage]);

  return <Grid container className={styles.container} spacing={3} {...getRootProps()}>
    <div className={styles.dragCover} style={{ display: isDragActive ? "flex" : "none" }}>Drag here to set cover.</div>
    <Grid item xs={12} md={3}>
      <Typography variant="h5" gutterBottom>Current cover</Typography>
      <Avatar
        src={hasCover ? `/api/files/${fileId}/cover?t=${cacheBustingToken}` : null} variant="rounded"
        className={styles.coverAvatar}
      >
        {hasCover ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
      </Avatar>
      <Button href={`https://www.google.com/search?q=${encodeURIComponent(trackName)}`} target="_blank"
              variant="outlined" color="secondary">
        Search on Google
      </Button>
    </Grid>
    <Grid item xs={12} md={3}>
      <Typography variant="h5" gutterBottom>Cover from song entity</Typography>
      <Avatar
        src={songCoverUrl} variant="rounded"
        className={styles.coverAvatar}
      >
        {hasSong ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
      </Avatar>
      <Button disabled={!hasSong || !songCoverUrl}
              onClick={setImageUrl(songCoverUrl)}
              variant="outlined">Use this</Button>
    </Grid>
    <Grid item xs={12} md={3}>
      <Typography variant="h5" gutterBottom>Cover from album entity</Typography>
      <Avatar
        src={albumCoverUrl} variant="rounded"
        className={styles.coverAvatar}
      >
        {hasAlbum ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
      </Avatar>
      <Button disabled={!hasAlbum || !albumCoverUrl}
              onClick={setImageUrl(albumCoverUrl)}
              variant="outlined">Use this</Button>
    </Grid>
    <Grid item xs={12} md={3}>
      <Typography variant="h5" gutterBottom>Cover to upload</Typography>
      <Avatar variant="rounded"
              src={selectedImage && (selectedImage.url ? selectedImage.url : URL.createObjectURL(selectedImage.blob))}
              className={styles.coverAvatar}
      >
        {hasAlbum ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
      </Avatar>
      <Button variant="outlined" color="secondary" disabled={selectedImage === null || isSubmitting}
              onClick={applyCover}>
        Apply
      </Button>
    </Grid>
    <Grid item xs={12}>
      <Box display="flex" alignItems="center">
        <TextField variant="outlined" label="Import from URL" margin="dense" fullWidth value={urlField}
                   onChange={handleUrlFieldOnChange} />
        <Button className={styles.importButton} variant="outlined" onClick={setImageUrl(urlField)}>Import</Button>
        <Button className={styles.importButton} variant="outlined" component="label">
          Upload
          <input type="file" hidden onChange={handleFileFieldOnChange} {...getInputProps()} />
        </Button>
      </Box>
    </Grid>
  </Grid>;
}