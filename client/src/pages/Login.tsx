import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TerminalLayout } from "@/components/TerminalLayout";
import { TerminalInput, TerminalTextarea } from "@/components/TerminalInput";
import { TerminalButton } from "@/components/TerminalButton";
import { GlitchText } from "@/components/GlitchText";
import { useRegister, useLoginInit, useLoginVerify } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { KeyRound, UserPlus, Fingerprint, ShieldAlert } from "lucide-react";

// Schemas
const registerSchema = z.object({
  username: z.string().min(3, "Username must be > 3 chars"),
  publicGpgKey: z.string().min(20, "Invalid PGP Key format"),
});

const loginInitSchema = z.object({
  username: z.string().min(1, "Username required"),
});

const loginVerifySchema = z.object({
  decryptedCode: z.string().min(1, "Decrypted code required"),
});

export default function Login() {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [challengeData, setChallengeData] = useState<{ encryptedMessage: string; challengeId: string } | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [_, setLocation] = useLocation();

  const registerMutation = useRegister();
  const loginInitMutation = useLoginInit();
  const loginVerifyMutation = useLoginVerify();

  // Forms
  const registerForm = useForm({ resolver: zodResolver(registerSchema) });
  const loginInitForm = useForm({ resolver: zodResolver(loginInitSchema) });
  const loginVerifyForm = useForm({ resolver: zodResolver(loginVerifySchema) });

  // Handlers
  const onRegister = (data: z.infer<typeof registerSchema>) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        toast({ title: "USER_CREATED", description: "Identity registered. Please login.", className: "bg-black text-primary border-primary" });
        setActiveTab("login");
        registerForm.reset();
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "REGISTRATION_ERROR", description: err.message });
      }
    });
  };

  const onLoginInit = (data: z.infer<typeof loginInitSchema>) => {
    loginInitMutation.mutate(data, {
      onSuccess: (res) => {
        setChallengeData(res);
        setLoginUsername(data.username);
        setLoginStep(2);
        toast({ title: "CHALLENGE_RECEIVED", description: "Decrypt the message to proceed.", className: "bg-black text-primary border-primary" });
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "USER_UNKNOWN", description: err.message });
      }
    });
  };

  const onLoginVerify = (data: z.infer<typeof loginVerifySchema>) => {
    if (!challengeData) return;
    
    loginVerifyMutation.mutate({
      username: loginUsername,
      challengeId: challengeData.challengeId,
      decryptedCode: data.decryptedCode
    }, {
      onSuccess: () => {
        setLocation("/access-granted");
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "DECRYPTION_FAILED", description: "Invalid code provided." });
      }
    });
  };

  return (
    <TerminalLayout header="LAYER_3 // BIOMETRIC_AUTH_GATEWAY">
      <div className="space-y-6">
        
        {/* Tab Switcher */}
        <div className="flex border-b border-primary/30 mb-8">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-3 text-center font-mono uppercase tracking-widest transition-colors ${
              activeTab === "login" 
                ? "bg-primary text-black font-bold" 
                : "text-primary/50 hover:text-primary hover:bg-primary/5"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <KeyRound className="w-4 h-4" /> Secure Login
            </span>
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-3 text-center font-mono uppercase tracking-widest transition-colors ${
              activeTab === "register" 
                ? "bg-primary text-black font-bold" 
                : "text-primary/50 hover:text-primary hover:bg-primary/5"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" /> New Identity
            </span>
          </button>
        </div>

        {/* LOGIN VIEW */}
        {activeTab === "login" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {loginStep === 1 ? (
              <form onSubmit={loginInitForm.handleSubmit(onLoginInit)} className="space-y-6">
                <div className="space-y-2 text-center mb-8">
                  <GlitchText text="INITIATE HANDSHAKE" as="h3" className="text-xl text-primary" />
                  <p className="text-sm text-primary/60">Enter username to retrieve encryption challenge.</p>
                </div>

                <TerminalInput
                  label="USERNAME"
                  placeholder="Enter alias..."
                  {...loginInitForm.register("username")}
                  error={loginInitForm.formState.errors.username?.message?.toString()}
                />

                <TerminalButton 
                  type="submit" 
                  isLoading={loginInitMutation.isPending}
                  className="mt-4"
                >
                  REQUEST CHALLENGE
                </TerminalButton>
              </form>
            ) : (
              <form onSubmit={loginVerifyForm.handleSubmit(onLoginVerify)} className="space-y-6">
                 <div className="flex items-start gap-4 p-4 border border-yellow-500/30 bg-yellow-500/5 mb-6">
                   <ShieldAlert className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                   <div className="space-y-2">
                     <h4 className="text-yellow-500 font-bold uppercase text-sm">Action Required</h4>
                     <p className="text-xs text-yellow-500/80 font-mono">
                       The server has encrypted a one-time code using your PGP Public Key.
                       Decrypt the block below and paste the resulting code.
                     </p>
                   </div>
                 </div>

                <div className="relative group">
                  <label className="text-xs uppercase tracking-widest text-primary/70 mb-2 block">{">"} PGP_MESSAGE_BLOCK</label>
                  <pre className="bg-black border border-primary/30 p-4 text-xs font-mono text-primary/80 whitespace-pre-wrap break-all max-h-48 overflow-y-auto custom-scrollbar select-all">
                    {challengeData?.encryptedMessage}
                  </pre>
                  <div className="absolute top-8 right-2 opacity-50 text-[10px] text-primary">READ_ONLY</div>
                </div>

                <TerminalInput
                  label="DECRYPTED_CODE"
                  placeholder="Paste decrypted code here..."
                  {...loginVerifyForm.register("decryptedCode")}
                  error={loginVerifyForm.formState.errors.decryptedCode?.message?.toString()}
                />

                <div className="flex gap-4 pt-4">
                  <TerminalButton 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setLoginStep(1)}
                  >
                    CANCEL
                  </TerminalButton>
                  <TerminalButton 
                    type="submit" 
                    isLoading={loginVerifyMutation.isPending}
                  >
                    AUTHENTICATE
                  </TerminalButton>
                </div>
              </form>
            )}
          </div>
        )}

        {/* REGISTER VIEW */}
        {activeTab === "register" && (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2 text-center mb-8">
              <GlitchText text="CREATE SECURE IDENTITY" as="h3" className="text-xl text-primary" />
              <p className="text-sm text-primary/60">Public Key infrastructure required for access.</p>
            </div>

            <TerminalInput
              label="DESIRED_USERNAME"
              placeholder="unique_alias"
              {...registerForm.register("username")}
              error={registerForm.formState.errors.username?.message?.toString()}
            />

            <TerminalTextarea
              label="PGP_PUBLIC_KEY"
              placeholder="-----BEGIN PGP PUBLIC KEY BLOCK----- ..."
              className="font-mono text-xs h-48"
              {...registerForm.register("publicGpgKey")}
              error={registerForm.formState.errors.publicGpgKey?.message?.toString()}
            />

            <div className="flex items-center gap-2 text-xs text-primary/50 mb-4">
              <Fingerprint className="w-4 h-4" />
              <span>Key will be stored for future challenge-response auth.</span>
            </div>

            <TerminalButton 
              type="submit" 
              isLoading={registerMutation.isPending}
            >
              REGISTER IDENTITY
            </TerminalButton>
          </form>
        )}
      </div>
    </TerminalLayout>
  );
}
