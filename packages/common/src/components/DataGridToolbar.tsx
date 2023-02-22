import { ReactNode } from "react";
import {
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";
import { Typography, Box } from "@mui/material";
import React from "react";

export interface DataGridToolbarProps {
  title?: string;
  children?: ReactNode;
}

export function DataGridToolbar({ title, children }: DataGridToolbarProps) {
  return (
    <GridToolbarContainer sx={{ gap: 1, px: 1 }}>
      <Typography variant="h6">{title}</Typography>
      <Box sx={{ flex: 1 }} />
      <GridToolbarColumnsButton />
      <GridToolbarFilterButton />
      <GridToolbarDensitySelector />
      <GridToolbarQuickFilter debounceMs={500} />
      {children}
    </GridToolbarContainer>
  );
}
