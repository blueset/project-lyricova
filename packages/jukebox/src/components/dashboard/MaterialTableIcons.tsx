import { SvgIcon } from "@material-ui/core";
import AddBox from "@material-ui/icons/AddBox";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import Check from "@material-ui/icons/Check";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import Clear from "@material-ui/icons/Clear";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import Edit from "@material-ui/icons/Edit";
import FilterList from "@material-ui/icons/FilterList";
import FirstPage from "@material-ui/icons/FirstPage";
import LastPage from "@material-ui/icons/LastPage";
import Remove from "@material-ui/icons/Remove";
import SaveAlt from "@material-ui/icons/SaveAlt";
import Search from "@material-ui/icons/Search";
import ViewColumn from "@material-ui/icons/ViewColumn";
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
