import type { Request, Response, NextFunction } from "express";

// Known Tor exit node user-agent patterns and bot signatures
const SUSPICIOUS_USER_AGENTS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /scrapy/i,
  /bot/i,
  /spider/i,
  /crawl/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
];

// Rate limiting store
const requestCounts = new Map<string, { count: number; firstRequest: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

// Proof of Work difficulty (number of leading zeros required)
const POW_DIFFICULTY = 4;

export function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export function checkUserAgent(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.headers['user-agent'] || '';
  
  for (const pattern of SUSPICIOUS_USER_AGENTS) {
    if (pattern.test(userAgent)) {
      return res.status(403).json({ 
        error: 'Access denied', 
        message: 'Suspicious client detected' 
      });
    }
  }
  
  next();
}

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const now = Date.now();
  
  const record = requestCounts.get(ip);
  
  if (!record) {
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return next();
  }
  
  if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, firstRequest: now });
    return next();
  }
  
  record.count++;
  
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - record.firstRequest)) / 1000)
    });
  }
  
  next();
}

export function generatePowChallenge(): { challenge: string; difficulty: number } {
  const challenge = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  return { challenge, difficulty: POW_DIFFICULTY };
}

export function verifyPowSolution(challenge: string, nonce: string, difficulty: number): boolean {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(challenge + nonce).digest('hex');
  const prefix = '0'.repeat(difficulty);
  return hash.startsWith(prefix);
}

export function honeypotCheck(req: Request, res: Response, next: NextFunction) {
  // Check for honeypot field - if filled, it's a bot
  if (req.body && req.body._hp_check) {
    return res.status(403).json({ error: 'Bot detected' });
  }
  next();
}

// Cookie verification - bots often don't handle cookies
const SESSION_TOKENS = new Map<string, number>();

export function setVerificationCookie(res: Response): string {
  const token = Math.random().toString(36).substring(2, 30);
  SESSION_TOKENS.set(token, Date.now());
  res.cookie('_verify', token, { 
    httpOnly: true, 
    secure: true,
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000 // 5 minutes
  });
  return token;
}

export function verifyCookie(req: Request): boolean {
  const token = req.cookies?._verify;
  if (!token) return false;
  
  const timestamp = SESSION_TOKENS.get(token);
  if (!timestamp) return false;
  
  // Token valid for 5 minutes
  if (Date.now() - timestamp > 5 * 60 * 1000) {
    SESSION_TOKENS.delete(token);
    return false;
  }
  
  return true;
}

// Clean up old tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of SESSION_TOKENS.entries()) {
    if (now - timestamp > 10 * 60 * 1000) {
      SESSION_TOKENS.delete(token);
    }
  }
}, 60 * 1000);

// Clean up old rate limit records
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.firstRequest > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(ip);
    }
  }
}, 60 * 1000);
