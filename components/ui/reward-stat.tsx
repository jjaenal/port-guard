import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RewardStatProps {
  title: string;
  value: ReactNode;
  subtitle?: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * Component for displaying staking reward statistics in a card format
 *
 * @param title - Title of the reward stat
 * @param value - Main value to display
 * @param subtitle - Optional subtitle or description
 * @param icon - Optional icon to display
 * @param className - Optional additional classes
 */
export function RewardStat({
  title,
  value,
  subtitle,
  icon,
  className,
}: RewardStatProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-xl sm:text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
