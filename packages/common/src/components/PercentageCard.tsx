import {
  Box,
  CircularProgress,
  Typography,
  Card,
  CardContent,
} from "@mui/material";
import React from "react";

interface PercentageCardProps {
  title: string;
  value?: number;
  total?: number;
  className?: string;
}

export function PercentageCard({
  title,
  value = 0,
  total = 1,
  className,
}: PercentageCardProps) {
  let rotator = <></>;
  let valueText = <>...</>;
  if (value !== null && total !== null) {
    const percentage = total === 0 ? 0 : (value / total) * 100;
    valueText = (
      <>
        {value}
        <small>/{total}</small>
      </>
    );
    rotator = (
      <Box
        position="relative"
        display="inline-flex"
        className="rotator"
        sx={{ float: "right" }}
      >
        <CircularProgress
          size="6em"
          value={100}
          thickness={5}
          className="background"
          variant="determinate"
          sx={{ color: "grey.800" }}
        />
        <CircularProgress
          size="6em"
          value={percentage}
          thickness={5}
          className="foreground"
          variant="determinate"
          sx={{ strokeLinecap: "round", position: "absolute" }}
        />
        <Box
          top={0}
          left={0}
          bottom={0}
          right={0}
          position="absolute"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Typography
            variant="body1"
            component="div"
            color="textPrimary"
            sx={{ fontSize: "1.75em" }}
            className="percentageText"
          >
            {`${Math.round(percentage)}`}
            <small style={{ fontSize: "0.65em" }}>%</small>
          </Typography>
        </Box>
      </Box>
    );
  }
  return (
    <Card className={className}>
      <CardContent>
        {rotator}
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h3">{valueText}</Typography>
      </CardContent>
    </Card>
  );
}
