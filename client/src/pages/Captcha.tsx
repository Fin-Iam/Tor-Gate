import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { TerminalLayout } from "@/components/TerminalLayout";
import { TerminalButton } from "@/components/TerminalButton";
import { GlitchText } from "@/components/GlitchText";
import { useCaptcha, useVerifyCaptcha } from "@/hooks/use-auth";
import { Terminal, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type CaptchaFormValues = {
  chars: string[];
};

export default function Captcha() {
  const [_, setLocation] = useLocation();
  const { data: captcha, isLoading, isError, refetch } = useCaptcha();
  const verifyMutation = useVerifyCaptcha();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // We manage the input state manually for the segmented inputs to handle focus management better
  const [inputs, setInputs] = useState<string[]>([]);

  useEffect(() => {
    if (captcha) {
      setInputs(new Array(captcha.indices.length).fill(""));
    }
  }, [captcha]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1); // Only take last char
    
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);

    // Auto-advance focus
    if (value && index < inputs.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !inputs[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onSubmit = () => {
    if (inputs.some(c => !c)) {
      toast({
        variant: "destructive",
        title: "INCOMPLETE_DATA",
        description: "Please fill in all missing characters.",
      });
      return;
    }

    verifyMutation.mutate({ characters: inputs }, {
      onSuccess: () => {
        toast({
          title: "IDENTITY_CONFIRMED",
          description: "Proceeding to secure login gateway...",
          className: "bg-black border-primary text-primary font-mono",
        });
        setLocation("/login");
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "ACCESS_DENIED",
          description: "Incorrect URL segment. Verification failed.",
        });
        // Clear inputs on failure
        setInputs(new Array(captcha?.indices.length || 0).fill(""));
        inputRefs.current[0]?.focus();
        refetch(); // Get a new captcha
      }
    });
  };

  if (isLoading) {
    return (
      <TerminalLayout header="LAYER_2 // HUMAN_VERIFICATION">
        <div className="h-64 flex flex-col items-center justify-center space-y-4 animate-pulse">
          <Terminal className="w-12 h-12 text-primary" />
          <p className="text-xl font-mono">GENERATING CRYPTOGRAPHIC CHALLENGE...</p>
        </div>
      </TerminalLayout>
    );
  }

  if (isError || !captcha) {
    return (
      <TerminalLayout header="LAYER_2 // SYSTEM_ERROR">
        <div className="text-center space-y-6">
          <p className="text-destructive font-mono text-xl">FAILED TO LOAD CHALLENGE</p>
          <TerminalButton onClick={() => refetch()} variant="secondary">
            RETRY CONNECTION
          </TerminalButton>
        </div>
      </TerminalLayout>
    );
  }

  // Construct the visual representation of the URL with inputs
  const urlParts = [];
  let lastIndex = 0;

  // This is a simplified visual reconstruction logic
  // In a real app, you might want more complex logic to perfectly interleave text and inputs
  // For this demo, we'll just show the prompt clearly.
  
  return (
    <TerminalLayout header="LAYER_2 // ONION_VERIFICATION">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
             <Lock className="w-16 h-16 text-primary/80" />
          </div>
          <GlitchText text="SECURITY CHALLENGE" as="h2" className="text-2xl text-primary" />
          <p className="text-primary/60 text-sm max-w-md mx-auto">
            Verify you are human by completing the missing characters of our hidden service address.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 p-8 rounded-sm relative overflow-hidden">
          <div className="font-mono text-xl md:text-3xl text-center tracking-wider break-all leading-loose">
            {/* 
              This is a tricky display. We need to show the masked URL but replace the missing chars with input boxes.
              Since we don't have the full original URL (security), we only have masked + indices.
              We can assume the 'masked' string has placeholders like '_' or dots.
            */}
            
            <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2">
              {captcha.onionUrlMasked.split('').map((char, i) => {
                // If this index corresponds to one of our missing indices...
                // Wait, the 'onionUrlMasked' returned by API likely has placeholders.
                // But we need to map the INPUTS to specific visual slots.
                
                // Let's assume the API returns indices relative to the FULL string length.
                // And we render inputs for those indices.
                
                const isInputIndex = captcha.indices.includes(i);
                
                if (isInputIndex) {
                  // Find which input number this is (0, 1, 2...)
                  const inputIndex = captcha.indices.indexOf(i);
                  
                  return (
                    <input
                      key={`input-${i}`}
                      ref={el => inputRefs.current[inputIndex] = el}
                      type="text"
                      maxLength={1}
                      value={inputs[inputIndex] || ""}
                      onChange={(e) => handleInputChange(inputIndex, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(inputIndex, e)}
                      className="w-8 h-10 md:w-10 md:h-12 bg-black border-b-2 border-primary text-center text-primary font-bold text-xl focus:outline-none focus:border-white focus:bg-primary/10 transition-colors uppercase"
                      autoFocus={inputIndex === 0}
                    />
                  );
                }
                
                return <span key={i} className="text-primary/70 select-none">{char}</span>;
              })}
            </div>
          </div>
          
          {/* Decorative Corner markers */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-primary" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-primary" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary" />
        </div>

        <div className="pt-4">
          <TerminalButton 
            onClick={onSubmit} 
            isLoading={verifyMutation.isPending}
            className="text-lg py-6"
          >
            VERIFY IDENTITY
          </TerminalButton>
        </div>
      </div>
    </TerminalLayout>
  );
}
