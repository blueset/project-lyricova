import {
  Avatar,
  Box,
  Button,
  Grid,
  styled,
  TextField,
  Typography,
} from "@mui/material";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import ImageNotSupportedIcon from "@mui/icons-material/ImageNotSupported";
import { useNamedState } from "../../../frontendUtils/hooks";
import { ChangeEvent, useCallback, useEffect } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { useAuthContext } from "../../public/AuthContext";
import { useSnackbar } from "notistack";

const CoverAvatar = styled(Avatar)({
  width: "100%",
  height: 0,
  overflow: "hidden",
  paddingTop: "100%",
  position: "relative",
  marginBottom: 2,
  "& > img": {
    position: "absolute",
    top: 0,
    left: 0,
    objectFit: "contain",
    width: "100%",
  },
  "& > svg": {
    position: "absolute",
    top: "calc(50% - 12px)",
    left: "calc(50% - 12px)",
  },
});

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
  fileId,
  hasCover,
  trackName,
  hasSong,
  songCoverUrl,
  hasAlbum,
  albumCoverUrl,
  refresh,
}: Props) {
  const [selectedImage, setSelectedImage] = useNamedState<SelectedImage>(
    null,
    "selectedImage"
  );
  const [urlField, setUrlField] = useNamedState<string>("", "urlField");
  const [isSubmitting, toggleSubmitting] = useNamedState(false, "isSubmitting");
  const [cacheBustingToken, setCacheBustingToken] = useNamedState(
    new Date().getTime(),
    "cacheBustingToken"
  );

  // Apply URL.
  const setImageUrl = useCallback(
    (url: string) => () => setSelectedImage({ url }),
    [setSelectedImage]
  );
  const handleUrlFieldOnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUrlField(event.target.value);
    },
    [setUrlField]
  );

  // Apply file selection
  const handleFileFieldOnChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (event.target.files.length > 0) {
        setSelectedImage({ blob: event.target.files[0] });
      }
    },
    [setUrlField]
  );

  // Drag and drop file
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        setSelectedImage({ blob: acceptedFiles[0] });
      }
    },
    [setSelectedImage]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    onDrop,
  });

  // File from pasteboard
  const onPaste = useCallback(
    (e: ClipboardEvent) => {
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
    },
    [setSelectedImage]
  );
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
        },
      });

      if (result.status === 200) {
        snackBar.enqueueSnackbar("Cover image updated.", {
          variant: "success",
        });
        await refresh();
        setCacheBustingToken(new Date().getTime());
        toggleSubmitting(false);
      } else {
        snackBar.enqueueSnackbar(result.data.message, { variant: "error" });
        toggleSubmitting(false);
      }
    } catch (e) {
      snackBar.enqueueSnackbar(`Error occurred while saving cover: ${e}`, {
        variant: "error",
      });
      toggleSubmitting(false);
    }
  }, [authContext, fileId, selectedImage]);

  return (
    <Grid
      container
      sx={{ position: "relative" }}
      spacing={3}
      {...getRootProps()}
    >
      <Box
        sx={{
          display: isDragActive ? "flex" : "none",
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "secondary.dark",
          borderColor: "secondary.light",
          borderWidth: "2px",
          borderStyle: "solid",
          zIndex: 2,
        }}
      >
        Drag here to set cover.
      </Box>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Current cover
        </Typography>
        <CoverAvatar
          src={
            hasCover
              ? `/api/files/${fileId}/cover?t=${cacheBustingToken}`
              : null
          }
          variant="rounded"
        >
          {hasCover ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
        </CoverAvatar>
        <Button
          href={`https://www.google.com/search?q=${encodeURIComponent(
            trackName
          )}`}
          target="_blank"
          variant="outlined"
          color="secondary"
        >
          Search on Google
        </Button>
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Cover from song entity
        </Typography>
        <CoverAvatar src={songCoverUrl} variant="rounded">
          {hasSong ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
        </CoverAvatar>
        <Button
          disabled={!hasSong || !songCoverUrl}
          onClick={setImageUrl(songCoverUrl)}
          variant="outlined"
        >
          Use this
        </Button>
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Cover from album entity
        </Typography>
        <CoverAvatar src={albumCoverUrl} variant="rounded">
          {hasAlbum ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
        </CoverAvatar>
        <Button
          disabled={!hasAlbum || !albumCoverUrl}
          onClick={setImageUrl(albumCoverUrl)}
          variant="outlined"
        >
          Use this
        </Button>
      </Grid>
      <Grid item xs={12} md={3}>
        <Typography variant="h5" gutterBottom>
          Cover to upload
        </Typography>
        <CoverAvatar
          variant="rounded"
          src={
            selectedImage &&
            (selectedImage.url
              ? selectedImage.url
              : URL.createObjectURL(selectedImage.blob))
          }
        >
          {hasAlbum ? <MusicNoteIcon /> : <ImageNotSupportedIcon />}
        </CoverAvatar>
        <Button
          variant="outlined"
          color="secondary"
          disabled={selectedImage === null || isSubmitting}
          onClick={applyCover}
        >
          Apply
        </Button>
      </Grid>
      <Grid item xs={12}>
        <Box display="flex" alignItems="center">
          <TextField
            variant="outlined"
            label="Import from URL"
            margin="dense"
            fullWidth
            value={urlField}
            onChange={handleUrlFieldOnChange}
          />
          <Button
            sx={{ marginLeft: 2 }}
            variant="outlined"
            onClick={setImageUrl(urlField)}
          >
            Import
          </Button>
          <Button sx={{ marginLeft: 2 }} variant="outlined" component="label">
            Upload
            <input
              type="file"
              hidden
              onChange={handleFileFieldOnChange}
              {...(getInputProps() as object)}
            />
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}
