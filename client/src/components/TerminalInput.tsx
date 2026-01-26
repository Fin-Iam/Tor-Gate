import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface TerminalInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const TerminalInput = forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-xs uppercase tracking-widest text-primary/70">
            {">"} {label}
          </label>
        )}
        <div className="relative group">
          <input
            ref={ref}
            className={cn(
              "w-full bg-black/50 border border-primary/30 px-4 py-3 text-primary font-mono",
              "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50",
              "placeholder:text-primary/20",
              "transition-all duration-200",
              error && "border-destructive text-destructive placeholder:text-destructive/30 focus:border-destructive focus:ring-destructive/30",
              className
            )}
            autoComplete="off"
            spellCheck="false"
            {...props}
          />
          {/* Cursor blink effect for focused input could be added here via CSS, but default caret is usually fine */}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 font-mono uppercase animate-pulse">
            [ERROR]: {error}
          </p>
        )}
      </div>
    );
  }
);
TerminalInput.displayName = "TerminalInput";

export interface TerminalTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TerminalTextarea = forwardRef<HTMLTextAreaElement, TerminalTextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-xs uppercase tracking-widest text-primary/70">
            {">"} {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-black/50 border border-primary/30 px-4 py-3 text-primary font-mono min-h-[120px]",
            "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50",
            "placeholder:text-primary/20",
            "transition-all duration-200 resize-y",
            error && "border-destructive text-destructive placeholder:text-destructive/30",
            className
          )}
          autoComplete="off"
          spellCheck="false"
          {...props}
        />
        {error && (
          <p className="text-xs text-destructive mt-1 font-mono uppercase animate-pulse">
            [ERROR]: {error}
          </p>
        )}
      </div>
    );
  }
);
TerminalTextarea.displayName = "TerminalTextarea";
