import { useCallback } from "react";
import {
  Button,
  Dialog,
  DialogActions, DialogContent,
  DialogTitle,
  List, ListItem,
  ListItemText,
  Typography
} from "@mui/material";
import { gql, useApolloClient } from "@apollo/client";
import {
  HmikuAtWikiSearchResultEntry,
} from "../../../../graphql/LyricsProvidersResolver";
import { useSnackbar } from "notistack";
import { useNamedState } from "../../../../frontendUtils/hooks";
import { TextField } from "mui-rff";
import { Form } from "react-final-form";
import HMikuWikiResultDialog from "./HMikuWikiResultDialog";
import { DocumentNode } from "graphql";


const HMIKU_ATWIKI_LYRICS_QUERY = gql`
  query($keyword: String!) {
    hmikuLyricsSearch(keyword: $keyword) {
      id
      name
      desc
    }
  }
` as DocumentNode;

interface FormValues {
  keyword: string;
}

interface Props extends FormValues {
  isOpen: boolean;
  toggleOpen: (value: boolean) => void;
}

export default function HMikuWikiSearchDialog({ isOpen, toggleOpen, keyword }: Props) {

  const handleClose = useCallback(() => {
    toggleOpen(false);
  }, [toggleOpen]);

  const apolloClient = useApolloClient();
  const snackbar = useSnackbar();

  const [searchResults, setSearchResults] = useNamedState<HmikuAtWikiSearchResultEntry[]>([], "searchResults");
  const [selectedArticleId, setSelectedArticleId] = useNamedState<string | null>(null, "selectedArticleId");
  const [showSingleDialog, toggleShowSingleDialog] = useNamedState<boolean>(false, "showSingleDialog");

  const handleChoose = useCallback((articleId: string) => () => {
    setSelectedArticleId(articleId);
    toggleShowSingleDialog(true);
  }, [setSelectedArticleId, toggleShowSingleDialog]);

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose} aria-labelledby="form-dialog-title"
              scroll="paper">
        <DialogTitle>Search form 初音ミク@wiki</DialogTitle>
        <DialogContent dividers>
          <Form<FormValues>
            initialValues={{ keyword, }}
            onSubmit={async (values) => {
              try {
                const result = await apolloClient.query<{ hmikuLyricsSearch: HmikuAtWikiSearchResultEntry[] }>({
                  query: HMIKU_ATWIKI_LYRICS_QUERY,
                  variables: {
                    ...values,
                  },
                });
                if (result.data)
                  setSearchResults(result.data.hmikuLyricsSearch);
                else
                  setSearchResults([]);
              } catch (e) {
                setSearchResults([]);
                console.error(`Error while loading search result; ${e}`, e);
                snackbar.enqueueSnackbar(`Failed to load search results: ${e}`, { variant: "error" });
              }
            }}
          >
            {({ submitting, handleSubmit }) => (<form style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
            }} onSubmit={handleSubmit}>
              <TextField
                sx={{ marginRight: 1 }}
                variant="outlined"
                required
                fullWidth
                margin="dense"
                name="keyword" type="text" label="Keyword"
              />
              <Button
                variant="contained"
                color="secondary"
                type="submit"
                disabled={submitting}
              >
                Search
              </Button>
            </form>)}
          </Form>
          <List>
            {searchResults.map(v => <ListItem button key={v.id} onClick={handleChoose(v.id)}>
              <ListItemText disableTypography>
                <Typography variant="body1" component="span" display="block">
                  {v.name} (#{v.id})
                </Typography>
                <Typography variant="body2" component="span" display="block" color="textSecondary"
                            noWrap>{v.desc}</Typography>
              </ListItemText>
            </ListItem>)}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
      <HMikuWikiResultDialog isOpen={showSingleDialog} toggleOpen={toggleShowSingleDialog}
                             articleId={selectedArticleId} />
    </>
  );
}
