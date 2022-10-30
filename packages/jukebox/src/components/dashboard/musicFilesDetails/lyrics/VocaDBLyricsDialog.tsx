import { useCallback } from "react";
import {
  Button,
  Dialog,
  DialogActions, DialogContent,
  DialogContentText, DialogTitle,
  List, ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Typography
} from "@mui/material";
import { gql, useQuery } from "@apollo/client";
import { VocaDBLyricsEntry } from "../../../../graphql/LyricsProvidersResolver";
import Link from "../../../Link";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TooltipIconButton from "../../TooltipIconButton";
import { useSnackbar } from "notistack";

const VOCADB_LYRICS_QUERY = gql`
  query($id: Int!) {
    vocaDBLyrics(id: $id) {
      id
      translationType
      cultureCode
      source
      url
      value
    }
  }
`;

interface Props {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
  songId?: number;
}

export default function VocaDBLyricsDialog({ isOpen, toggleOpen, songId }: Props) {

  const snackbar = useSnackbar();

  const handleClose = useCallback(() => {
    toggleOpen(false);
  }, [toggleOpen]);

  const query = useQuery<{vocaDBLyrics: VocaDBLyricsEntry[]}>(VOCADB_LYRICS_QUERY, {
    variables: {id: songId}
  });

  const copyText = useCallback((text: string) => async () => {
    navigator.clipboard.writeText(text).then(function () {
      snackbar.enqueueSnackbar("Copied!", { variant: "success" });
    }, function (err) {
      console.error("Could not copy text: ", err);
      snackbar.enqueueSnackbar(`Failed to copy: ${err}`, { variant: "error" });
    });
  }, [snackbar]);

  let content = <DialogContentText>Loading...</DialogContentText>;
  if (query.error) {
    content = <DialogContentText>Error occurred while loading lyrics: {`${query.error}`}</DialogContentText>;
  } else if (query.data) {
    if (query.data.vocaDBLyrics.length < 1) {
      content = <DialogContentText>No lyrics found form VocaDB. <Link href={`https://vocadb.net/S/${songId}`}>Contribute one?</Link></DialogContentText>;
    } else {
      content = <List>
        {query.data.vocaDBLyrics.map(v => <ListItem key={v.id}>
          <ListItemText disableTypography>
            <Typography variant="body1" component="span" display="block">
              {v.translationType} (<code>{v.cultureCode}</code>{v.source && <>, <Link href={v.url}>{v.source}</Link></>})
            </Typography>
            <Typography variant="body2" component="span" display="block" color="textSecondary" noWrap>{v.value}</Typography>
          </ListItemText>
          <ListItemSecondaryAction>
            <TooltipIconButton title="Copy lyrics" onClick={copyText(v.value)}><ContentCopyIcon /></TooltipIconButton>
          </ListItemSecondaryAction>
        </ListItem>)}
      </List>;
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title"
            scroll="paper">
      <DialogTitle>Retrieve lyrics from VocaDB</DialogTitle>
      <DialogContent>
        {content}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
