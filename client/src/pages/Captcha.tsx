import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { TerminalLayout } from "@/components/TerminalLayout";
import { TerminalButton } from "@/components/TerminalButton";
import { GlitchText } from "@/components/GlitchText";
import { useCaptcha, useVerifyCaptcha } from "@/hooks/use-auth";
import { Terminal, Lock, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Captcha() {
  const [_, setLocation] = useLocation();
  const { data: captcha, isLoading, isError, refetch } = useCaptcha();
  const verifyMutation = useVerifyCaptcha();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [inputs, setInputs] = useState<string[]>(new Array(6).fill(""));

  useEffect(() => {
    if (captcha) {
      setInputs(new Array(captcha.count).fill(""));
    }
  }, [captcha]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);

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
    if (!captcha) return;
    
    if (inputs.some(c => !c)) {
      toast({
        variant: "destructive",
        title: "INCOMPLETE_DATA",
        description: "Please fill in all 6 missing characters.",
      });
      return;
    }

    verifyMutation.mutate({ 
      sessionId: captcha.sessionId,
      characters: inputs 
    }, {
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
          description: "Incorrect characters. Verification failed.",
        });
        setInputs(new Array(6).fill(""));
        inputRefs.current[0]?.focus();
        refetch();
      }
    });
  };

  const handleRefresh = () => {
    setInputs(new Array(6).fill(""));
    refetch();
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

  return (
    <TerminalLayout header="LAYER_2 // ONION_VERIFICATION">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Lock className="w-16 h-16 text-primary/80" />
          </div>
          <GlitchText text="SECURITY CHALLENGE" as="h2" className="text-2xl text-primary" />
          <p className="text-primary/60 text-sm max-w-md mx-auto">
            Enter the 6 missing characters marked [1]-[6] from our hidden service address.
          </p>
        </div>

        <div className="bg-black border border-primary/30 p-4 relative overflow-hidden">
          <div className="flex justify-end mb-2">
            <button 
              onClick={handleRefresh}
              className="text-primary/50 hover:text-primary transition-colors p-1"
              title="Get new captcha"
              data-testid="button-refresh-captcha"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          <img 
            src={captcha.imageBase64} 
            alt="Captcha challenge - enter the missing characters"
            className="w-full h-auto max-w-full border border-primary/20"
            style={{ imageRendering: 'pixelated' }}
            data-testid="img-captcha"
          />
          
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
        </div>

        <div className="space-y-4">
          <p className="text-center text-primary/70 text-sm font-mono">
            ENTER THE 6 MISSING CHARACTERS:
          </p>
          <div className="flex justify-center gap-3">
            {inputs.map((value, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-xs text-primary/50 font-mono">[{i + 1}]</span>
                <input
                  ref={el => inputRefs.current[i] = el}
                  type="text"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleInputChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-12 h-14 bg-black border-2 border-primary/50 text-center text-primary font-bold text-2xl focus:outline-none focus:border-primary focus:bg-primary/10 transition-colors uppercase font-mono"
                  autoFocus={i === 0}
                  data-testid={`input-captcha-char-${i}`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4">
          <TerminalButton 
            onClick={onSubmit} 
            isLoading={verifyMutation.isPending}
            className="text-lg py-6"
            data-testid="button-verify-captcha"
          >
            VERIFY IDENTITY
          </TerminalButton>
        </div>
      </div>
    </TerminalLayout>
  );
}
