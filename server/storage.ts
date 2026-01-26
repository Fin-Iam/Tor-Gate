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
}

export class DatabaseStorage implements IStorage {
  // In-memory store for active login challenges to keep them ephemeral
  private challenges: Map<string, { username: string; code: string; expiresAt: number }>;

  constructor() {
    this.challenges = new Map();
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
}

export const storage = new DatabaseStorage();
