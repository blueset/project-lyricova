import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lyricova/components/components/ui/card";
import { cn } from "@lyricova/components/utils";

interface CountCardProps {
  title: string;
  value?: number;
  className?: string;
}

export function CountCard({ title, value, className }: CountCardProps) {
  return (
    <Card className={cn("@container/card", className)}>
      <CardHeader className="relative">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="@[250px]/card:text-4xl text-2xl font-semibold tabular-nums">
          {value === undefined || value === null ? "..." : value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
