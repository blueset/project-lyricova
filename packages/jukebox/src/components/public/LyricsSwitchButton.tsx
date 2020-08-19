import { Button, Menu, createStyles, makeStyles, Theme, MenuItem } from "@material-ui/core";
import { useNamedState } from "../../frontendUtils/hooks";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import { useCallback } from "react";


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
  const [anchorEl, setAnchorEl] = useNamedState<null | HTMLElement>(null, "anchorEl");

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback((option: T | null = null) => {
    if (option !== null) {
      setModule(option);
    }
    setAnchorEl(null);
  }, []);

  return (<>
    <Button
      size="small"
      variant="outlined"
      color="primary"
      endIcon={<ArrowDropDownIcon />}
      className={styles.menuButton}
      aria-controls="lyrics-style-menu" aria-haspopup="true" onClick={handleClick}
    >
      {module}
    </Button>
    <Menu
      id="lyrics-style-menu"
      anchorEl={anchorEl}
      keepMounted
      open={Boolean(anchorEl)}
      onClose={() => handleClose()}
    >
      {moduleNames.map((v) => <MenuItem key={`${v}`} onClick={() => handleClose(v)}>{v}</MenuItem>)}
    </Menu>
  </>);

}