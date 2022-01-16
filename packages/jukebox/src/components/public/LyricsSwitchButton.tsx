import { Button, Menu, createStyles, makeStyles, Theme, MenuItem } from "@mui/material";
import { useNamedState } from "../../frontendUtils/hooks";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { useCallback } from "react";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";

interface Props<T> {
  module: T;
  setModule: (value: T) => void;
  moduleNames: T[];
}

export function LyricsSwitchButton<T>({ module, setModule, moduleNames }: Props<T>) {
  const popupState = usePopupState({ variant: "popover", popupId: "lyrics-style-menu" });

  const handleClose = useCallback((option: T | null = null) => {
    if (option !== null) {
      setModule(option);
    }
    popupState.close();
  }, [popupState, setModule]);

  return (<>
    <Button
      size="small"
      variant="outlined"
      color="primary"
      endIcon={<ArrowDropDownIcon />}
      sx={{position: "absolute", top: 0, right: 2 }}
      {...bindTrigger(popupState)}
    >
      {module}
    </Button>
    <Menu
      id="lyrics-style-menu"
      {...bindMenu(popupState)}
    >
      {moduleNames.map((v) => <MenuItem key={`${v}`} onClick={() => handleClose(v)}>{v}</MenuItem>)}
    </Menu>
  </>);

}