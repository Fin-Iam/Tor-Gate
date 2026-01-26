import { useEffect } from "react";
import { TerminalLayout } from "@/components/TerminalLayout";
import { GlitchText } from "@/components/GlitchText";
import { motion } from "framer-motion";
import { CheckCircle, Database, Network } from "lucide-react";
import confetti from "canvas-confetti"; // Not installed, but we can simulate effect or just use CSS

export default function AccessGranted() {
  
  useEffect(() => {
    // Simple canvas confetti effect if package was available, but let's stick to CSS/Motion for now
    // Or just simple console log simulation
    console.log("Access Granted");
  }, []);

  return (
    <TerminalLayout header="ROOT_ACCESS // GRANTED" className="border-green-400 shadow-[0_0_50px_rgba(74,222,128,0.2)]">
      <div className="flex flex-col items-center justify-center py-12 space-y-12 text-center">
        
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 10 }}
        >
          <div className="w-32 h-32 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.4)] relative">
             <CheckCircle className="w-16 h-16 text-green-500" />
             <div className="absolute inset-0 rounded-full border border-green-500/30 animate-[ping_2s_infinite]" />
          </div>
        </motion.div>

        <div className="space-y-4">
          <GlitchText 
            text="ACCESS GRANTED" 
            as="h1" 
            className="text-4xl md:text-6xl text-green-500 font-bold tracking-tighter" 
          />
          <p className="text-xl md:text-2xl font-mono text-green-400/80">
            WELCOME TO THE HIDDEN SERVICE
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg mt-8">
          <div className="border border-green-500/30 bg-green-900/10 p-4 flex items-center gap-3">
             <Database className="w-5 h-5 text-green-500" />
             <div className="text-left">
               <div className="text-xs text-green-500/50 uppercase">Database</div>
               <div className="text-green-400 font-mono">CONNECTED</div>
             </div>
          </div>
          <div className="border border-green-500/30 bg-green-900/10 p-4 flex items-center gap-3">
             <Network className="w-5 h-5 text-green-500" />
             <div className="text-left">
               <div className="text-xs text-green-500/50 uppercase">Onion Routing</div>
               <div className="text-green-400 font-mono">ENCRYPTED</div>
             </div>
          </div>
        </div>

        <div className="text-xs font-mono text-green-500/30 pt-8 animate-pulse">
          SESSION ID: {Math.random().toString(36).substring(2, 15).toUpperCase()}
        </div>

      </div>
    </TerminalLayout>
  );
}
