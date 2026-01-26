import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import DdosProtection from "@/pages/DdosProtection";
import Captcha from "@/pages/Captcha";
import Login from "@/pages/Login";
import AccessGranted from "@/pages/AccessGranted";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* 
        Layer 1: DDOS Protection (Route /)
        This is the entry point. 
      */}
      <Route path="/" component={DdosProtection} />
      
      {/* 
        Layer 2: Captcha (Route /captcha)
        User arrives here after DDOS wait finishes.
      */}
      <Route path="/captcha" component={Captcha} />
      
      {/* 
        Layer 3: Login/Register (Route /login)
        User arrives here after Captcha is solved.
      */}
      <Route path="/login" component={Login} />
      
      {/* 
        Success State
      */}
      <Route path="/access-granted" component={AccessGranted} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
