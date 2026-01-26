import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function RunningMan() {
  const [frame, setFrame] = useState(0);

  // ASCII art frames for running man
  const frames = [
    `
    O 
   /|\\
   / \\
    `,
    `
    O 
   /|\\
    | 
   / \\
    `,
    `
    O 
   /|\\
   /| 
    `,
    `
    O 
   <|\\
   / \\
    `
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % frames.length);
    }, 150);
    return () => clearInterval(interval);
  }, [frames.length]);

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="font-mono whitespace-pre text-primary text-2xl md:text-4xl leading-tight select-none">
        {frames[frame]}
      </div>
      <motion.div 
        className="h-1 w-32 bg-primary/20 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div 
          className="h-full bg-primary"
          animate={{ x: [-128, 128] }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
}
