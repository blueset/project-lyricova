import { Button, ButtonGroup, InputAdornment, Menu, MenuItem } from "@material-ui/core";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { gql, useApolloClient } from "@apollo/client";
import { useCallback, MouseEvent } from "react";
import { useNamedState } from "../../frontendUtils/hooks";
import { makeStyles } from "@material-ui/core/styles";

const TRANSLITRATION_QUERY = gql`
  query($text: String!, $language: String) {
    transliterate(text: $text) {
      plain(language: $language)
    }
  }
`;

const useStyles = makeStyles((theme) => ({
  adornment: {
    marginRight: theme.spacing(-1.5),
  },
  dropDownButton: {
    paddingLeft: 0,
    paddingRight: 0,
  },
}));

interface Props {
  value: string;
  setField: (value: string) => void;
}

export default function TransliterationAdornment({ value, setField }: Props) {
  const apolloClient = useApolloClient();
  const [menuAnchor, setMenuAnchor] = useNamedState<null | HTMLElement>(null, "menuAnchor");

  const styles = useStyles();

  const openMenu = useCallback((event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  }, [setMenuAnchor]);

  const closeMenu = useCallback(() => {
    setMenuAnchor(null);
  }, [setMenuAnchor]);

  const transliterateCallback = useCallback((language?: "zh" | "ja") => async () => {
    try {
      const result = await apolloClient.query<{
        transliterate: { plain: string; };
      }>({
        query: TRANSLITRATION_QUERY,
        variables: {
          text: value,
          language,
        },
        fetchPolicy: "no-cache",
      });

      setField(result.data.transliterate.plain);
    } catch (e) {
      // No-op.
    }

    if (language !== null) {
      closeMenu();
    }
  }, [apolloClient, closeMenu, setField, value]);

  return (
    <InputAdornment position="end" className={styles.adornment}>
      <ButtonGroup size="small" variant="text">
        <Button
          size="small"
          aria-label="Generate transliteration"
          onClick={transliterateCallback(null)}
        >
          <AutorenewIcon />
        </Button>
        <Button
          size="small"
          aria-label="Generate transliteration by languages"
          aria-haspopup="true"
          aria-controls="transliteration-menu"
          onClick={openMenu}
          className={styles.dropDownButton}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        id="transliteration-menu"
        anchorEl={menuAnchor}
        keepMounted
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        getContentAnchorEl={null}
      >
        <MenuItem onClick={transliterateCallback("zh")}>中文 → zhōngwén</MenuItem>
        <MenuItem onClick={transliterateCallback("ja")}>日本語 → にほんご</MenuItem>
      </Menu>
    </InputAdornment>
  );
}