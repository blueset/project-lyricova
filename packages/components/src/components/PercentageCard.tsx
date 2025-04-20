import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyricova/components/components/ui/card";
import { cn } from "@lyricova/components/utils";
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
  const percentage = !value || !total ? 0 : (value / total) * 100;
  const valueText =
    value === undefined || total === undefined ? (
      "..."
    ) : (
      <>
        {value}
        <small> / {total}</small>
      </>
    );

  return (
    <Card className={cn("@container/card relative overflow-hidden", className)}>
      <div
        className="absolute inset-0 bg-gradient-to-r from-info/30 to-info/50 z-0"
        style={{ width: `${Math.round(percentage)}%` }}
      >
        <div className="absolute right-0 top-0 bottom-0 w-[0.5px] bg-info-foreground/30"></div>
      </div>
      <CardHeader className="relative z-10">
        <CardDescription>{title} </CardDescription>
        <CardTitle className="@[250px]/card:text-4xl text-2xl font-semibold tabular-nums flex items-center justify-between">
          <span>{valueText}</span>
          {value !== undefined && total !== undefined && (
            <div className="tabular-nums">
              <span className="">
                {Math.round(percentage)}
                <small>%</small>
              </span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
