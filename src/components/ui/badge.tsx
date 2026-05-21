import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-blue-300/30 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-100",
        className
      )}
    >
      {children}
    </span>
  );
}
