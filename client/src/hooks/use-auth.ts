import { useQuery, useMutation } from "@tanstack/react-query";
import { api, type RegisterRequest, type LoginInitRequest, type LoginVerifyRequest, type CaptchaVerifyRequest } from "@shared/routes";

// ============================================
// AUTH & GATEKEEPER HOOKS
// ============================================

export function useDdosConfig() {
  return useQuery({
    queryKey: [api.ddos.config.path],
    queryFn: async () => {
      // Simulate API call delay for effect
      await new Promise(r => setTimeout(r, 800));
      // In a real app this would fetch from backend, here we mock or use actual route
      const res = await fetch(api.ddos.config.path);
      if (!res.ok) throw new Error("Failed to fetch DDOS config");
      return api.ddos.config.responses[200].parse(await res.json());
    },
    // Don't refetch, config is static for session
    staleTime: Infinity, 
  });
}

export function useCaptcha() {
  return useQuery({
    queryKey: [api.captcha.get.path],
    queryFn: async () => {
      const res = await fetch(api.captcha.get.path);
      if (!res.ok) throw new Error("Failed to fetch Captcha");
      return api.captcha.get.responses[200].parse(await res.json());
    },
    refetchOnWindowFocus: false,
  });
}

export function useVerifyCaptcha() {
  return useMutation({
    mutationFn: async (data: CaptchaVerifyRequest) => {
      const res = await fetch(api.captcha.verify.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        throw new Error("Incorrect captcha code");
      }
      return api.captcha.verify.responses[200].parse(await res.json());
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
  });
}

export function useLoginInit() {
  return useMutation({
    mutationFn: async (data: LoginInitRequest) => {
      const res = await fetch(api.auth.loginInit.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("User not found");
        throw new Error("Failed to initiate login");
      }
      return api.auth.loginInit.responses[200].parse(await res.json());
    },
  });
}

export function useLoginVerify() {
  return useMutation({
    mutationFn: async (data: LoginVerifyRequest) => {
      const res = await fetch(api.auth.loginVerify.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Verification failed");
      }
      return api.auth.loginVerify.responses[200].parse(await res.json());
    },
  });
}
