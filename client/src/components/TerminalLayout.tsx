import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TerminalLayoutProps {
  children: ReactNode;
  className?: string;
  header?: string;
}

export function TerminalLayout({ children, className, header }: TerminalLayoutProps) {
  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Matrix Background Effect is on Body, this is the container */}
      
      <div className={cn(
        "w-full max-w-3xl bg-black/80 border-2 border-primary/50 shadow-[0_0_20px_rgba(0,255,0,0.15)] backdrop-blur-sm relative z-10",
        className
      )}>
        {/* Terminal Header */}
        <div className="bg-primary/10 border-b border-primary/30 p-2 flex items-center justify-between">
          <div className="flex space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="text-xs text-primary/70 font-mono tracking-widest uppercase">
            {header || "SECURE_GATEWAY_V3.0"}
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="p-6 md:p-8">
          {children}
        </div>

        {/* Scanlines Effect Overlay on Container */}
        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')] opacity-[0.03]" />
      </div>
      
      {/* Footer Status */}
      <div className="mt-4 text-xs font-mono text-primary/40 text-center animate-pulse">
        ENCRYPTED CONNECTION ESTABLISHED • TOR NETWORK DETECTED
      </div>
    </div>
  );
}
