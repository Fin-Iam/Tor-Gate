import { db } from "./db";
import { users, type InsertUser, type User } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Challenge storage (in-memory is fine for this demo, or use DB if persistent needed)
  storeChallenge(username: string, code: string): Promise<string>; // returns challengeId
  getChallenge(challengeId: string): Promise<{ username: string; code: string } | undefined>;
  removeChallenge(challengeId: string): Promise<void>;
  
  // Captcha session storage
  storeCaptchaSession(indices: number[]): string; // returns sessionId
  getCaptchaSession(sessionId: string): number[] | undefined;
  removeCaptchaSession(sessionId: string): void;
}

export class DatabaseStorage implements IStorage {
  // In-memory store for active login challenges to keep them ephemeral
  private challenges: Map<string, { username: string; code: string; expiresAt: number }>;
  // In-memory store for captcha sessions
  private captchaSessions: Map<string, { indices: number[]; expiresAt: number }>;

  constructor() {
    this.challenges = new Map();
    this.captchaSessions = new Map();
    
    // Cleanup expired captcha sessions every minute
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.captchaSessions.entries()) {
        if (now > session.expiresAt) {
          this.captchaSessions.delete(id);
        }
      }
    }, 60 * 1000);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async storeChallenge(username: string, code: string): Promise<string> {
    const challengeId = Math.random().toString(36).substring(2, 15);
    // Expire in 5 minutes
    this.challenges.set(challengeId, { 
      username, 
      code, 
      expiresAt: Date.now() + 5 * 60 * 1000 
    });
    return challengeId;
  }

  async getChallenge(challengeId: string): Promise<{ username: string; code: string } | undefined> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return undefined;
    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(challengeId);
      return undefined;
    }
    return challenge;
  }

  async removeChallenge(challengeId: string): Promise<void> {
    this.challenges.delete(challengeId);
  }

  storeCaptchaSession(indices: number[]): string {
    const sessionId = Math.random().toString(36).substring(2, 15);
    // Expire in 5 minutes
    this.captchaSessions.set(sessionId, {
      indices,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    return sessionId;
  }

  getCaptchaSession(sessionId: string): number[] | undefined {
    const session = this.captchaSessions.get(sessionId);
    if (!session) return undefined;
    if (Date.now() > session.expiresAt) {
      this.captchaSessions.delete(sessionId);
      return undefined;
    }
    return session.indices;
  }

  removeCaptchaSession(sessionId: string): void {
    this.captchaSessions.delete(sessionId);
  }
}

export const storage = new DatabaseStorage();
