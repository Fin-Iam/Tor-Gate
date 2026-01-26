import { cn } from "@/lib/utils";

interface GlitchTextProps {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
}

export function GlitchText({ text, as: Component = "span", className }: GlitchTextProps) {
  return (
    <Component 
      className={cn("glitch-text font-bold uppercase tracking-widest", className)}
      data-text={text}
    >
      {text}
    </Component>
  );
}
