import { Button, Menu, createStyles, makeStyles, Theme, MenuItem } from "@material-ui/core";
import { useNamedState } from "../../frontendUtils/hooks";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { useCallback } from "react";
import { bindMenu, bindTrigger, usePopupState } from "material-ui-popup-state/hooks";


const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    menuButton: {
      position: "absolute",
      top: theme.spacing(0),
      right: theme.spacing(2),
    },
  }),
);

interface Props<T> {
  module: T;
  setModule: (value: T) => void;
  moduleNames: T[];
}

export function LyricsSwitchButton<T>({ module, setModule, moduleNames }: Props<T>) {

  const styles = useStyles();
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
      className={styles.menuButton}
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