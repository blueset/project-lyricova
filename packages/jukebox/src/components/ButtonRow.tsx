import { Children, cloneElement, isValidElement, ReactNode } from "react";
import { Box, Theme } from "@mui/material";
import { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";


interface Props {
  children: ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

export default function ButtonRow({ children, className, sx }: Props) {
  return (
    <Box component="div" sx={{marginTop: 1, marginBottom: 1, ...sx}} className={className}>
      {Children.map(children, (child, idx) => {
        if (!isValidElement(child)) {
          return null;
        }

        return cloneElement(child, {
          sx: {marginLeft: idx == 0 ? 0 : 1},
        });
      })}
    </Box>
  );
}