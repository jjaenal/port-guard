import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StakingSummaryRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
  valueClassName?: string;
}

/**
 * Reusable component for displaying staking data in a consistent row format
 *
 * @param label - Label text for the data point
 * @param value - Value to display (can be string, number, or ReactNode)
 * @param icon - Optional icon to display before the label
 * @param className - Optional additional classes for the container
 * @param valueClassName - Optional additional classes for the value
 */
export function StakingSummaryRow({
  label,
  value,
  icon,
  className,
  valueClassName,
}: StakingSummaryRowProps) {
  return (
    <div className={cn("flex items-center justify-between py-3 sm:py-2", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon && <span className="text-foreground">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className={cn("font-medium", valueClassName)}>{value}</div>
    </div>
  );
}
