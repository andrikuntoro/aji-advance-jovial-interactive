import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500 shadow-lg shadow-blue-600/30",
  secondary:
    "bg-white/10 text-blue-100 border border-white/20 hover:bg-white/20 focus-visible:ring-blue-400",
  ghost:
    "bg-transparent text-blue-100 hover:bg-white/10 border border-transparent focus-visible:ring-blue-300",
  danger:
    "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-400 shadow-lg shadow-rose-600/30",
};

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
