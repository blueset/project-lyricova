import { Card, CardContent, Typography } from "@mui/material";
import React from "react";

interface CountCardProps {
  title: string;
  value?: number;
  className?: string;
}

export function CountCard({ title, value, className }: CountCardProps) {
  return (
    <Card className={className}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3">{value === null ? "..." : value}</Typography>
      </CardContent>
    </Card>
  );
}
