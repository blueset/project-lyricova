import { useCallback } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import { HmikuAtWikiEntry } from "../../../../graphql/LyricsProvidersResolver";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useSnackbar } from "notistack";
import { makeStyles } from "@mui/material/styles";
import Link from "lyricova-common/components/Link";
import { DocumentNode } from "graphql";

const HMIKU_LYRICS_QUERY = gql`
  query($id: String!) {
    hmikuLyrics(id: $id) {
      id
      name
      furigana
      lyrics
    }
  }
` as DocumentNode;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  articleId?: string;
}

export default function HMikuWikiResultDialog({
  isOpen,
  toggleOpen,
  articleId,
}: Props) {
  const snackbar = useSnackbar();

  const handleClose = useCallback(() => {
    toggleOpen(false);
  }, [toggleOpen]);

  const query = useQuery<{ hmikuLyrics: HmikuAtWikiEntry }>(
    HMIKU_LYRICS_QUERY,
    {
      variables: { id: articleId || "" },
    }
  );

  const copyText = useCallback(
    (text: string) => async () => {
      navigator.clipboard.writeText(text).then(
        function() {
          snackbar.enqueueSnackbar("Copied!", { variant: "success" });
        },
        function(err) {
          console.error("Could not copy text: ", err);
          snackbar.enqueueSnackbar(`Failed to copy: ${err}`, {
            variant: "error",
          });
        }
      );
    },
    [snackbar]
  );

  let content = <DialogTitle>Loading...</DialogTitle>;
  if (query.error) {
    content = (
      <DialogTitle>
        Error occurred while loading lyrics: {`${query.error}`}
      </DialogTitle>
    );
  } else if (query.data) {
    if (!query.data.hmikuLyrics) {
      content = <DialogTitle>Article #{articleId} is not found.</DialogTitle>;
    } else {
      const data = query.data.hmikuLyrics;
      content = (
        <>
          <DialogTitle>
            <Link
              href={`https://w.atwiki.jp/hmiku/pages/${data.id}.html`}
              target="_blank"
            >
              {data.name}
            </Link>{" "}
            ({data.furigana}, #{data.id})
            <IconButton
              aria-label="close"
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
              onClick={copyText(data.lyrics)}
            >
              <ContentCopyIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <DialogContentText>
              <pre>{data.lyrics}</pre>
            </DialogContentText>
          </DialogContent>
        </>
      );
    }
  }

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
      scroll="paper"
    >
      {content}
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
