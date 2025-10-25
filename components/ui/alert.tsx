"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  closable?: boolean;
  onClose?: () => void;
}

const variantClasses: Record<AlertVariant, string> = {
  default: "border-slate-200 bg-slate-50",
  info: "border-blue-200 bg-blue-50",
  success: "border-green-200 bg-green-50",
  warning: "border-yellow-200 bg-yellow-50",
  destructive: "border-red-200 bg-red-50",
};

export function Alert({
  className,
  variant = "default",
  closable = false,
  onClose,
  children,
  ...props
}: AlertProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className={cn(
        "relative w-full rounded-md border px-3 py-2 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
      {closable && (
        <button
          type="button"
          aria-label="Close alert"
          className="absolute right-2 top-2 rounded p-1 hover:bg-black/5 focus:outline-none"
          onClick={() => {
            onClose?.();
            setVisible(false);
          }}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("font-medium", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}
