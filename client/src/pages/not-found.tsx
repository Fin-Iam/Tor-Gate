import { TerminalLayout } from "@/components/TerminalLayout";
import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <TerminalLayout header="ERROR // 404_NOT_FOUND">
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-8">
        <AlertTriangle className="w-20 h-20 text-destructive animate-pulse" />
        
        <div className="space-y-2">
          <h1 className="text-4xl font-mono text-destructive tracking-widest">
            ERROR 404
          </h1>
          <p className="text-primary/60 font-mono">
            THE REQUESTED RESOURCE DOES NOT EXIST IN THIS SECTOR.
          </p>
        </div>

        <div className="p-4 border border-destructive/30 bg-destructive/5 font-mono text-xs text-left w-full max-w-md">
          <p>{">"} TRACE_ROUTE: FAILED</p>
          <p>{">"} PING_HOST: UNREACHABLE</p>
          <p>{">"} SUGGESTION: RETURN_TO_BASE</p>
        </div>

        <Link href="/" className="px-8 py-3 bg-destructive/10 border border-destructive text-destructive font-mono uppercase hover:bg-destructive hover:text-black transition-all">
          Return to Gateway
        </Link>
      </div>
    </TerminalLayout>
  );
}
