import { cloneElement, ReactElement, useState } from "react";
import PopupState, { bindTrigger, bindPopover } from "material-ui-popup-state";
import dayjs, { Dayjs } from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker, StaticDateTimePicker } from "@mui/x-date-pickers";
import { Popover, TextField } from "@mui/material";

export interface DateTimePickerPopupProps {
  value?: number | null;
  onSubmit?: (value: Dayjs) => void;
  children: ReactElement<{
    "aria-controls"?: string;
    "aria-describedby"?: string;
    "aria-haspopup"?: true;
    onClick: (event: React.MouseEvent) => void;
    onTouchStart: (event: React.TouchEvent) => void;
  }>;
}

export function DateTimePickerPopup({
  value = null,
  onSubmit,
  children,
}: DateTimePickerPopupProps) {
  const [date, setDate] = useState<Dayjs | null>(value && dayjs(value));
  return (
    <PopupState variant="popover" popupId="new-pulse-popup-menu">
      {(popupState) => (
        <>
          {cloneElement(children, {
            ...bindTrigger(popupState),
            onClick: (evt: React.MouseEvent) => {
              setDate(value ? dayjs(value) : null);
              bindTrigger(popupState).onClick(evt);
            },
          })}
          <Popover
            {...bindPopover(popupState)}
            anchorOrigin={{
              vertical: "top",
              horizontal: "center",
            }}
            transformOrigin={{
              vertical: "bottom",
              horizontal: "center",
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <StaticDateTimePicker<Dayjs | null>
                renderInput={(props) => <TextField size="small" {...props} />}
                label="Pulse date"
                value={date}
                onChange={(newValue) => {
                  setDate(newValue);
                }}
                onAccept={(newValue) => {
                  onSubmit(newValue);
                  popupState.close();
                }}
                ampm={false}
                inputFormat="YYYY-MM-DD HH:mm:ss"
                {...({
                  onClose: () => {
                    popupState.close();
                  },
                } as any)}
              />
            </LocalizationProvider>
          </Popover>
        </>
      )}
    </PopupState>
  );
}
