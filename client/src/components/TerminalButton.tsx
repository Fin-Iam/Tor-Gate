import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TerminalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export const TerminalButton = forwardRef<HTMLButtonElement, TerminalButtonProps>(
  ({ className, children, isLoading, variant = "primary", disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary/10 text-primary border-primary hover:bg-primary hover:text-black hover:shadow-[0_0_15px_rgba(0,255,0,0.4)]",
      secondary: "bg-transparent text-primary/60 border-primary/30 hover:border-primary hover:text-primary",
      danger: "bg-destructive/10 text-destructive border-destructive hover:bg-destructive hover:text-black hover:shadow-[0_0_15px_rgba(255,0,0,0.4)]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "w-full px-6 py-3 border font-mono font-bold uppercase tracking-widest transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-inherit disabled:hover:shadow-none",
          variants[variant],
          className
        )}
        {...props}
      >
        <span className="flex items-center justify-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLoading ? "PROCESSING..." : children}
        </span>
      </button>
    );
  }
);
TerminalButton.displayName = "TerminalButton";
