import {
  Button,
  ButtonGroup,
  InputAdornment,
  Menu,
  MenuItem,
} from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { gql, useApolloClient } from "@apollo/client";
import { useCallback } from "react";
import { useField, useForm } from "react-final-form";
import {
  bindMenu,
  bindTrigger,
  usePopupState,
} from "material-ui-popup-state/hooks";
import { DocumentNode } from "graphql";

const TRANSLITRATION_QUERY = gql`
  query($text: String!, $language: String) {
    transliterate(text: $text) {
      plain(language: $language)
    }
  }
` as DocumentNode;

interface Props {
  sourceName: string;
  destinationName: string;
}

export default function TransliterationAdornment({
  sourceName,
  destinationName,
}: Props) {
  const apolloClient = useApolloClient();
  const popupState = usePopupState({
    variant: "popover",
    popupId: "transliteration-menu",
  });
  const {
    input: { value },
  } = useField(sourceName);
  const setValue = useForm().mutators.setValue;

  const transliterateCallback = useCallback(
    (language?: "zh" | "ja") => async () => {
      try {
        const result = await apolloClient.query<{
          transliterate: { plain: string };
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
    },
    [apolloClient, destinationName, popupState, setValue, value]
  );

  return (
    <InputAdornment position="end" sx={{ marginRight: -1.5 }}>
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
          sx={{ paddingLeft: 0, paddingRight: 0 }}
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
        {...bindMenu(popupState)}
      >
        <MenuItem lang="zh" onClick={transliterateCallback("zh")}>
          中文 → zhōngwén
        </MenuItem>
        <MenuItem lang="ja" onClick={transliterateCallback("ja")}>
          日本語 → にほんご
        </MenuItem>
      </Menu>
    </InputAdornment>
  );
}
