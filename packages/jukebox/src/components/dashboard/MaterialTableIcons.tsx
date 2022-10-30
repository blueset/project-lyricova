import { SvgIcon } from "@mui/material";
import AddBox from "@mui/icons-material/AddBox";
import ArrowDownward from "@mui/icons-material/ArrowDownward";
import Check from "@mui/icons-material/Check";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Clear from "@mui/icons-material/Clear";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Edit from "@mui/icons-material/Edit";
import FilterList from "@mui/icons-material/FilterList";
import FirstPage from "@mui/icons-material/FirstPage";
import LastPage from "@mui/icons-material/LastPage";
import Remove from "@mui/icons-material/Remove";
import SaveAlt from "@mui/icons-material/SaveAlt";
import Search from "@mui/icons-material/Search";
import ViewColumn from "@mui/icons-material/ViewColumn";
import { forwardRef, PropsWithoutRef } from "react";

function iconForwardRef(Node: typeof SvgIcon) {
  const result = forwardRef<SVGSVGElement,
    PropsWithoutRef<typeof SvgIcon>>((props, ref) => <Node {...props} ref={ref}/>);
  result.displayName = `forwardRef(${Node.name})`;
  return result;
}

export const TableIcons = {
  Add: iconForwardRef(AddBox),
  Check: iconForwardRef(Check),
  Clear: iconForwardRef(Clear),
  Delete: iconForwardRef(DeleteOutline),
  DetailPanel: iconForwardRef(ChevronRight),
  Edit: iconForwardRef(Edit),
  Export: iconForwardRef(SaveAlt),
  Filter: iconForwardRef(FilterList),
  FirstPage: iconForwardRef(FirstPage),
  LastPage: iconForwardRef(LastPage),
  NextPage: iconForwardRef(ChevronRight),
  PreviousPage: iconForwardRef(ChevronLeft),
  ResetSearch: iconForwardRef(Clear),
  Search: iconForwardRef(Search),
  SortArrow: iconForwardRef(ArrowDownward),
  ThirdStateCheck: iconForwardRef(Remove),
  ViewColumn: iconForwardRef(ViewColumn),
};
