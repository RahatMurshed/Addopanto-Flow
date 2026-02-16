import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface PercentageChangeProps {
  current: number;
  previous: number;
  label?: string;
  invertColors?: boolean; // For expenses, decrease is good
  className?: string;
}

export default function PercentageChange({
  current,
  previous,
  label,
  invertColors = false,
  className,
}: PercentageChangeProps) {
  if (previous === 0 && current === 0) {
    return null;
  }

  const percentChange = previous === 0 
    ? (current > 0 ? 100 : 0)
    : ((current - previous) / previous) * 100;

  const isIncrease = percentChange > 0;
  const isDecrease = percentChange < 0;
  const isNeutral = percentChange === 0;

  // For expenses, decrease is positive (green), increase is negative (red)
  const isPositive = invertColors ? isDecrease : isIncrease;
  const isNegative = invertColors ? isIncrease : isDecrease;

  const Icon = isIncrease ? TrendingUp : isDecrease ? TrendingDown : Minus;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs",
        isPositive && "text-green-600 dark:text-green-400",
        isNegative && "text-destructive",
        isNeutral && "text-muted-foreground",
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="font-medium">
        {isNeutral ? "0%" : `${isIncrease ? "+" : ""}${percentChange.toFixed(1)}%`}
      </span>
      {label && <span className="text-muted-foreground">vs {label}</span>}
    </div>
  );
}
