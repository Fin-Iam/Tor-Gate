import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { TerminalLayout } from "@/components/TerminalLayout";
import { GlitchText } from "@/components/GlitchText";
import { RunningMan } from "@/components/RunningMan";
import { useDdosConfig } from "@/hooks/use-auth";
import { ShieldCheck, ServerCrash } from "lucide-react";

export default function DdosProtection() {
  const [_, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { data: config, isLoading, isError } = useDdosConfig();

  useEffect(() => {
    if (config && timeLeft === null) {
      // Calculate random wait time between min and max
      const waitTime = Math.floor(Math.random() * (config.maxWait - config.minWait + 1) + config.minWait);
      setTimeLeft(waitTime);
    }
  }, [config, timeLeft]);

  useEffect(() => {
    if (timeLeft === null) return;

    if (timeLeft <= 0) {
      setLocation("/captcha");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, setLocation]);

  return (
    <TerminalLayout header="LAYER_1 // TRAFFIC_ANALYSIS">
      <div className="text-center space-y-12 py-8">
        <div className="space-y-4">
          <GlitchText text="TRIPPIES FORUM" as="h1" className="text-3xl text-primary" />
          <p className="text-primary/50 text-xs mt-1">SYSTEM UNDER HIGH LOAD</p>
          <p className="text-primary/70 font-mono text-sm uppercase tracking-wider">
            Analyzing request signature...
          </p>
        </div>

        <div className="py-8 border-y border-dashed border-primary/30 relative">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <ServerCrash className="w-12 h-12 text-primary/50" />
              <p>CONNECTING TO DEFENSE GRID...</p>
            </div>
          ) : isError ? (
             <div className="flex flex-col items-center gap-4 text-destructive">
               <ServerCrash className="w-12 h-12" />
               <p>CONNECTION FAILED. RETRYING...</p>
             </div>
          ) : (
            <div className="relative z-10">
              <RunningMan />
              <div className="mt-8 font-mono text-xl">
                PLEASE WAIT <span className="text-white font-bold">{timeLeft}</span> SECONDS
              </div>
            </div>
          )}
          
          {/* Background scanner line effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent h-[20%] animate-[scan_3s_ease-in-out_infinite]" />
        </div>

        <div className="flex justify-center gap-8 text-xs text-primary/40 font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span>DDOS SHIELD: ACTIVE</span>
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
             <span>IP LOGGING: ENABLED</span>
          </div>
        </div>
      </div>
    </TerminalLayout>
  );
}
