import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import * as openpgp from "openpgp";
import { generateCaptchaImage, verifyCaptcha } from "./captcha";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // === DDOS CONFIG ===
  app.get(api.ddos.config.path, (req, res) => {
    res.json({ minWait: 5, maxWait: 45 });
  });

  // === CAPTCHA ===
  app.get(api.captcha.get.path, (req, res) => {
    try {
      const result = generateCaptchaImage(storage);
      res.json({
        imageBase64: result.imageBase64,
        sessionId: result.sessionId,
        count: 6
      });
    } catch (error) {
      console.error("Captcha generation error:", error);
      res.status(500).json({ message: "Failed to generate captcha" });
    }
  });

  app.post(api.captcha.verify.path, (req, res) => {
    const { sessionId, characters } = req.body;
    
    if (!sessionId || !characters || !Array.isArray(characters)) {
      return res.status(400).json({ success: false });
    }
    
    const isValid = verifyCaptcha(storage, sessionId, characters);
    
    if (isValid) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false });
    }
  });

  // === AUTH: REGISTER ===
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      
      const existing = await storage.getUserByUsername(input.username);
      if (existing) {
        return res.status(409).json({ message: "Username already exists" });
      }

      // Validate GPG key format (basic check)
      try {
        await openpgp.readKey({ armoredKey: input.publicGpgKey });
      } catch (e) {
        return res.status(400).json({ message: "Invalid GPG Public Key format" });
      }

      const user = await storage.createUser(input);
      res.status(201).json({ success: true, message: "User registered", userId: user.id });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // === AUTH: LOGIN INIT ===
  app.post(api.auth.loginInit.path, async (req, res) => {
    try {
      const { username } = req.body;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // 1. Generate a random challenge code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // 2. Encrypt it with user's public key
      const publicKey = await openpgp.readKey({ armoredKey: user.publicGpgKey });
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: `Your Login Code: ${code}` }),
        encryptionKeys: publicKey
      });

      // 3. Store the code
      const challengeId = await storage.storeChallenge(username, code);

      // 4. Return encrypted block
      res.json({ 
        encryptedMessage: encrypted as string, // Cast because it can be WebStream in some envs, but here string
        challengeId 
      });

    } catch (err) {
      console.error("Login init error:", err);
      res.status(500).json({ message: "Encryption failed or server error" });
    }
  });

  // === AUTH: LOGIN VERIFY ===
  app.post(api.auth.loginVerify.path, async (req, res) => {
    try {
      const { challengeId, decryptedCode } = req.body;
      
      const challenge = await storage.getChallenge(challengeId);
      
      if (!challenge) {
        return res.status(401).json({ message: "Challenge expired or invalid" });
      }

      // Verify code (trim whitespace just in case)
      // The message encrypted was "Your Login Code: CODE"
      // User might paste the whole thing or just the code. 
      // Let's check if the decrypted text *contains* the code.
      if (decryptedCode.trim().includes(challenge.code)) {
        // Success
        await storage.removeChallenge(challengeId);
        res.json({ success: true, token: "mock-session-token", message: "Access Granted" });
      } else {
        res.status(401).json({ message: "Incorrect code" });
      }

    } catch (err) {
      res.status(500).json({ message: "Verification error" });
    }
  });

  return httpServer;
}
