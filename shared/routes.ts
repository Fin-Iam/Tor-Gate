import { z } from 'zod';
import { insertUserSchema, users } from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: insertUserSchema,
      responses: {
        201: z.object({ success: z.boolean(), message: z.string(), userId: z.number() }),
        400: errorSchemas.validation,
        409: z.object({ message: z.string() }), // Conflict (username exists)
      },
    },
    loginInit: {
      method: 'POST' as const,
      path: '/api/auth/login/init',
      input: z.object({ username: z.string() }),
      responses: {
        200: z.object({ encryptedMessage: z.string(), challengeId: z.string() }),
        404: errorSchemas.notFound,
      },
    },
    loginVerify: {
      method: 'POST' as const,
      path: '/api/auth/login/verify',
      input: z.object({ 
        username: z.string(), 
        challengeId: z.string(), 
        decryptedCode: z.string() 
      }),
      responses: {
        200: z.object({ success: z.boolean(), token: z.string().optional(), message: z.string().optional() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  captcha: {
    get: {
      method: 'GET' as const,
      path: '/api/captcha',
      responses: {
        200: z.object({
          onionUrlMasked: z.string(), // Example: "examp......ion"
          indices: z.array(z.number()),
          length: z.number(),
        }),
      },
    },
    verify: {
      method: 'POST' as const,
      path: '/api/captcha/verify',
      input: z.object({ characters: z.array(z.string()) }),
      responses: {
        200: z.object({ success: z.boolean() }),
        400: z.object({ success: z.boolean() }),
      },
    },
  },
  ddos: {
    config: {
      method: 'GET' as const,
      path: '/api/ddos/config',
      responses: {
        200: z.object({ minWait: z.number(), maxWait: z.number() }),
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
