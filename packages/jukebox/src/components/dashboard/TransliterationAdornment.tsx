import { Button, ButtonGroup, InputAdornment, Menu, MenuItem } from "@material-ui/core";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { gql, useApolloClient } from "@apollo/client";
import { useCallback, MouseEvent } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { useField, useForm, useFormState } from "react-final-form";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";

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
  sourceName: string;
  destinationName: string;
}

export default function TransliterationAdornment({ sourceName, destinationName }: Props) {
  const apolloClient = useApolloClient();
  const popupState = usePopupState({ variant: "popover", popupId: "transliteration-menu" });
  const { input: { value }} = useField(sourceName);
  const setValue = useForm().mutators.setValue;

  const styles = useStyles();

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

      setValue(destinationName, result.data.transliterate.plain);
    } catch (e) {
      // No-op.
    }

    if (language !== null) {
      popupState.close();
    }
  }, [apolloClient, destinationName, popupState, setValue, value]);

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
          className={styles.dropDownButton}
          {...bindTrigger(popupState)}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Menu
        id="transliteration-menu"
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        getContentAnchorEl={null}
        {...bindMenu(popupState)}
      >
        <MenuItem onClick={transliterateCallback("zh")}>中文 → zhōngwén</MenuItem>
        <MenuItem onClick={transliterateCallback("ja")}>日本語 → にほんご</MenuItem>
      </Menu>
    </InputAdornment>
  );
}