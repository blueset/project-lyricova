import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import type { Theme } from "@mui/material";
import { Box } from "@mui/material";
import type { SxProps } from "@mui/system/styleFunctionSx/styleFunctionSx";

interface Props {
  children: ReactNode;
  sx?: SxProps<Theme>;
  className?: string;
}

export default function ButtonRow({ children, className, sx }: Props) {
  return (
    <Box
      component="div"
      sx={{
        marginTop: 1,
        marginBottom: 1,
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 1,
        ...sx,
      }}
      className={className}
    >
      {Children.map(children, (child) => {
        if (!isValidElement(child)) {
          return null;
        }
        return child;
      })}
    </Box>
  );
}
