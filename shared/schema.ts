import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  publicGpgKey: text("public_gpg_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// === API CONTRACT TYPES ===

// Registration
export type RegisterRequest = InsertUser;
export type RegisterResponse = { success: boolean; message: string; userId: number };

// Login Flow
export type LoginInitRequest = { username: string };
export type LoginInitResponse = { 
  encryptedMessage: string; // The encrypted challenge block
  challengeId: string;      // ID to track the session/challenge
};

export type LoginVerifyRequest = { 
  username: string;
  challengeId: string;
  decryptedCode: string;    // The code the user decrypted
};

export type LoginVerifyResponse = { 
  success: boolean; 
  token?: string; 
  message?: string 
};

// Captcha Flow
export type CaptchaChallengeResponse = {
  onionUrlMasked: string; // The URL with missing chars, or just the indices to ask for
  indices: number[];      // Which indices the user needs to fill
  length: number;         // Total length of URL
};

export type CaptchaVerifyRequest = {
  characters: string[]; // The characters the user filled in
};

export type CaptchaVerifyResponse = {
  success: boolean;
};

// DDOS Flow
export type DdosConfigResponse = {
  minWait: number;
  maxWait: number;
};
