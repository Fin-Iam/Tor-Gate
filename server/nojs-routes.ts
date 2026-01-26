import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import * as openpgp from "openpgp";
import { 
  generatePowChallenge, 
  verifyPowSolution, 
  setVerificationCookie,
  verifyCookie,
  honeypotCheck,
  rateLimiter 
} from "./middleware/antiBot";

const ONION_URL = "hiynu3jeowprbbp2haydjrakwmyjrf2ltqebplixdbgew7l33hfsjbad.onion";

// Session store for no-JS flow
const nojsSessions = new Map<string, {
  stage: 'ddos' | 'pow' | 'captcha' | 'auth';
  powChallenge?: string;
  captchaIndices?: number[];
  waitUntil?: number;
  verified?: boolean;
}>();

function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 30);
}

function htmlTemplate(title: string, content: string, meta?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  ${meta || ''}
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #000;
      color: #0f0;
      font-family: 'Courier New', monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 600px;
      width: 100%;
      border: 1px solid #0f0;
      padding: 30px;
    }
    h1 { text-align: center; margin-bottom: 20px; letter-spacing: 3px; }
    h2 { margin-bottom: 15px; font-size: 1.2em; }
    p { margin-bottom: 15px; line-height: 1.6; }
    form { display: flex; flex-direction: column; gap: 15px; }
    label { display: block; margin-bottom: 5px; }
    input, textarea {
      width: 100%;
      padding: 10px;
      background: #111;
      border: 1px solid #0f0;
      color: #0f0;
      font-family: inherit;
    }
    input:focus, textarea:focus { outline: 2px solid #0f0; }
    button {
      padding: 12px 24px;
      background: #0f0;
      color: #000;
      border: none;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
      letter-spacing: 2px;
    }
    button:hover { background: #0c0; }
    .error { color: #f00; border-color: #f00; padding: 10px; margin-bottom: 15px; }
    .success { color: #0f0; padding: 10px; margin-bottom: 15px; border: 1px solid #0f0; }
    .ascii-art { white-space: pre; font-size: 10px; text-align: center; margin: 20px 0; }
    .timer { font-size: 2em; text-align: center; margin: 20px 0; }
    .hidden { display: none; }
    a { color: #0f0; }
    .captcha-input { display: flex; gap: 5px; flex-wrap: wrap; }
    .captcha-input input { width: 40px; text-align: center; }
    pre { background: #111; padding: 15px; overflow-x: auto; margin: 15px 0; border: 1px solid #333; font-size: 12px; }
    .tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .tab { padding: 10px 20px; border: 1px solid #0f0; text-decoration: none; }
    .tab.active { background: #0f0; color: #000; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>`;
}

const runningManAscii = `
    O
   /|\\
   / \\
  ANALYZING...
`;

export function registerNoJsRoutes(app: Express) {
  
  // === STAGE 1: DDOS Protection (with auto-refresh) ===
  app.get('/nojs', rateLimiter, (req: Request, res: Response) => {
    const sessionId = generateSessionId();
    const waitTime = Math.floor(Math.random() * 40) + 5; // 5-45 seconds
    const waitUntil = Date.now() + (waitTime * 1000);
    
    nojsSessions.set(sessionId, {
      stage: 'ddos',
      waitUntil
    });

    // Auto-refresh after wait time
    const content = `
      <h1>TRIPPIES FORUM - SECURITY CHECK</h1>
      <div class="ascii-art">${runningManAscii}</div>
      <p style="text-align: center;">System Analysis In Progress...</p>
      <p class="timer">Please wait ${waitTime} seconds</p>
      <noscript>
        <p style="text-align: center; margin-top: 20px;">
          After waiting, click continue:
        </p>
        <form action="/nojs/pow" method="GET">
          <input type="hidden" name="sid" value="${sessionId}">
          <button type="submit">CONTINUE</button>
        </form>
      </noscript>
    `;
    
    // Meta refresh as backup for no-JS
    const meta = `<meta http-equiv="refresh" content="${waitTime};url=/nojs/pow?sid=${sessionId}">`;
    res.send(htmlTemplate('Security Check', content, meta));
  });

  // === STAGE 2: Proof of Work ===
  app.get('/nojs/pow', rateLimiter, (req: Request, res: Response) => {
    const sid = req.query.sid as string;
    const session = nojsSessions.get(sid);
    
    if (!session || Date.now() < (session.waitUntil || 0)) {
      return res.redirect('/nojs');
    }

    const { challenge, difficulty } = generatePowChallenge();
    session.stage = 'pow';
    session.powChallenge = challenge;
    
    const content = `
      <h1>PROOF OF WORK</h1>
      <p>To prove you are human, solve this challenge:</p>
      <p>Find a number (nonce) such that SHA256("${challenge}" + nonce) starts with ${difficulty} zeros.</p>
      <p><small>Hint: Try numbers starting from 0. Average solution: ~${Math.pow(16, difficulty)} attempts.</small></p>
      <form action="/nojs/pow" method="POST">
        <input type="hidden" name="sid" value="${sid}">
        <input type="hidden" name="challenge" value="${challenge}">
        <label for="nonce">Enter Nonce:</label>
        <input type="text" id="nonce" name="nonce" required placeholder="e.g., 12345">
        <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
        <button type="submit">VERIFY</button>
      </form>
      <p style="margin-top: 20px; font-size: 12px;">
        <a href="/nojs/captcha?sid=${sid}&skip=1">Skip (for testing only)</a>
      </p>
    `;
    
    res.send(htmlTemplate('Proof of Work', content));
  });

  app.post('/nojs/pow', rateLimiter, honeypotCheck, (req: Request, res: Response) => {
    const { sid, challenge, nonce } = req.body;
    const session = nojsSessions.get(sid);
    
    if (!session || session.stage !== 'pow') {
      return res.redirect('/nojs');
    }
    
    if (verifyPowSolution(challenge, nonce, 4)) {
      session.stage = 'captcha';
      setVerificationCookie(res);
      return res.redirect(`/nojs/captcha?sid=${sid}`);
    }
    
    const content = `
      <h1>PROOF OF WORK</h1>
      <div class="error">Invalid solution. Try again.</div>
      <form action="/nojs/pow" method="POST">
        <input type="hidden" name="sid" value="${sid}">
        <input type="hidden" name="challenge" value="${challenge}">
        <label for="nonce">Enter Nonce:</label>
        <input type="text" id="nonce" name="nonce" required>
        <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
        <button type="submit">VERIFY</button>
      </form>
    `;
    
    res.send(htmlTemplate('Proof of Work', content));
  });

  // === STAGE 3: Captcha ===
  app.get('/nojs/captcha', rateLimiter, (req: Request, res: Response) => {
    const sid = req.query.sid as string;
    const session = nojsSessions.get(sid);
    
    if (!session) {
      return res.redirect('/nojs');
    }
    
    // Generate captcha challenge
    const indices: number[] = [];
    while (indices.length < 6) {
      const idx = Math.floor(Math.random() * ONION_URL.length);
      if (!indices.includes(idx)) indices.push(idx);
    }
    indices.sort((a, b) => a - b);
    session.captchaIndices = indices;
    session.stage = 'captcha';
    
    let maskedUrl = ONION_URL.split('');
    indices.forEach(idx => { maskedUrl[idx] = '_'; });
    
    const inputFields = indices.map((idx, i) => 
      `<input type="text" name="char${i}" maxlength="1" required placeholder="${idx}">`
    ).join('');
    
    const content = `
      <h1>ONION URL CAPTCHA</h1>
      <p>Enter the missing characters from our .onion address:</p>
      <pre style="font-size: 14px; letter-spacing: 2px;">${maskedUrl.join('')}</pre>
      <p>Missing positions: ${indices.join(', ')}</p>
      <form action="/nojs/captcha" method="POST">
        <input type="hidden" name="sid" value="${sid}">
        <label>Enter the 6 missing characters in order:</label>
        <div class="captcha-input">
          ${inputFields}
        </div>
        <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
        <button type="submit">VERIFY</button>
      </form>
    `;
    
    res.send(htmlTemplate('Captcha Verification', content));
  });

  app.post('/nojs/captcha', rateLimiter, honeypotCheck, (req: Request, res: Response) => {
    const { sid } = req.body;
    const session = nojsSessions.get(sid);
    
    if (!session || !session.captchaIndices) {
      return res.redirect('/nojs');
    }
    
    const submittedChars = session.captchaIndices.map((_, i) => req.body[`char${i}`] || '');
    const correctChars = session.captchaIndices.map(idx => ONION_URL[idx]);
    
    const isCorrect = submittedChars.every((c, i) => c.toLowerCase() === correctChars[i].toLowerCase());
    
    if (isCorrect) {
      session.verified = true;
      session.stage = 'auth';
      return res.redirect(`/nojs/login?sid=${sid}`);
    }
    
    const content = `
      <h1>CAPTCHA FAILED</h1>
      <div class="error">Incorrect characters. Please try again.</div>
      <a href="/nojs/captcha?sid=${sid}">
        <button>TRY AGAIN</button>
      </a>
    `;
    
    res.send(htmlTemplate('Captcha Failed', content));
  });

  // === STAGE 4: Login / Register ===
  app.get('/nojs/login', rateLimiter, (req: Request, res: Response) => {
    const sid = req.query.sid as string;
    const session = nojsSessions.get(sid);
    const error = req.query.error as string;
    const success = req.query.success as string;
    
    if (!session || !session.verified) {
      return res.redirect('/nojs');
    }
    
    const errorHtml = error ? `<div class="error">${decodeURIComponent(error)}</div>` : '';
    const successHtml = success ? `<div class="success">${decodeURIComponent(success)}</div>` : '';
    
    const content = `
      <h1>AUTHENTICATION</h1>
      ${errorHtml}
      ${successHtml}
      
      <div class="tabs">
        <a href="/nojs/login?sid=${sid}" class="tab active">LOGIN</a>
        <a href="/nojs/register?sid=${sid}" class="tab">REGISTER</a>
      </div>
      
      <h2>Login with GPG</h2>
      <form action="/nojs/login/init" method="POST">
        <input type="hidden" name="sid" value="${sid}">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
        <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
        <button type="submit">GET CHALLENGE</button>
      </form>
    `;
    
    res.send(htmlTemplate('Login', content));
  });

  app.get('/nojs/register', rateLimiter, (req: Request, res: Response) => {
    const sid = req.query.sid as string;
    const session = nojsSessions.get(sid);
    const error = req.query.error as string;
    
    if (!session || !session.verified) {
      return res.redirect('/nojs');
    }
    
    const errorHtml = error ? `<div class="error">${decodeURIComponent(error)}</div>` : '';
    
    const content = `
      <h1>AUTHENTICATION</h1>
      ${errorHtml}
      
      <div class="tabs">
        <a href="/nojs/login?sid=${sid}" class="tab">LOGIN</a>
        <a href="/nojs/register?sid=${sid}" class="tab active">REGISTER</a>
      </div>
      
      <h2>Register New Account</h2>
      <form action="/nojs/register" method="POST">
        <input type="hidden" name="sid" value="${sid}">
        <label for="username">Username:</label>
        <input type="text" id="username" name="username" required>
        <label for="gpgKey">Public GPG Key:</label>
        <textarea id="gpgKey" name="publicGpgKey" rows="10" required 
          placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"></textarea>
        <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
        <button type="submit">REGISTER</button>
      </form>
    `;
    
    res.send(htmlTemplate('Register', content));
  });

  app.post('/nojs/register', rateLimiter, honeypotCheck, async (req: Request, res: Response) => {
    const { sid, username, publicGpgKey } = req.body;
    const session = nojsSessions.get(sid);
    
    if (!session || !session.verified) {
      return res.redirect('/nojs');
    }
    
    try {
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.redirect(`/nojs/register?sid=${sid}&error=${encodeURIComponent('Username already exists')}`);
      }
      
      await openpgp.readKey({ armoredKey: publicGpgKey });
      await storage.createUser({ username, publicGpgKey });
      
      res.redirect(`/nojs/login?sid=${sid}&success=${encodeURIComponent('Registration successful! You can now login.')}`);
    } catch (e) {
      res.redirect(`/nojs/register?sid=${sid}&error=${encodeURIComponent('Invalid GPG key format')}`);
    }
  });

  app.post('/nojs/login/init', rateLimiter, honeypotCheck, async (req: Request, res: Response) => {
    const { sid, username } = req.body;
    const session = nojsSessions.get(sid);
    
    if (!session || !session.verified) {
      return res.redirect('/nojs');
    }
    
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.redirect(`/nojs/login?sid=${sid}&error=${encodeURIComponent('User not found')}`);
    }
    
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const publicKey = await openpgp.readKey({ armoredKey: user.publicGpgKey });
      const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: `Your Login Code: ${code}` }),
        encryptionKeys: publicKey
      });
      
      const challengeId = await storage.storeChallenge(username, code);
      
      const content = `
        <h1>GPG CHALLENGE</h1>
        <p>Decrypt this message with your private key:</p>
        <pre>${encrypted}</pre>
        <form action="/nojs/login/verify" method="POST">
          <input type="hidden" name="sid" value="${sid}">
          <input type="hidden" name="challengeId" value="${challengeId}">
          <input type="hidden" name="username" value="${username}">
          <label for="code">Enter the decrypted code:</label>
          <input type="text" id="code" name="decryptedCode" required placeholder="e.g., AB12CD34">
          <input type="text" name="_hp_check" class="hidden" tabindex="-1" autocomplete="off">
          <button type="submit">VERIFY</button>
        </form>
      `;
      
      res.send(htmlTemplate('GPG Challenge', content));
    } catch (e) {
      res.redirect(`/nojs/login?sid=${sid}&error=${encodeURIComponent('Failed to generate challenge')}`);
    }
  });

  app.post('/nojs/login/verify', rateLimiter, honeypotCheck, async (req: Request, res: Response) => {
    const { sid, challengeId, decryptedCode } = req.body;
    const session = nojsSessions.get(sid);
    
    if (!session || !session.verified) {
      return res.redirect('/nojs');
    }
    
    const challenge = await storage.getChallenge(challengeId);
    
    if (!challenge) {
      return res.redirect(`/nojs/login?sid=${sid}&error=${encodeURIComponent('Challenge expired')}`);
    }
    
    if (decryptedCode.trim().includes(challenge.code)) {
      await storage.removeChallenge(challengeId);
      nojsSessions.delete(sid);
      
      const content = `
        <h1 style="color: #0f0; text-shadow: 0 0 20px #0f0;">ACCESS GRANTED</h1>
        <div class="ascii-art" style="font-size: 14px;">
  ██████╗ ██████╗  █████╗ ███╗   ██╗████████╗███████╗██████╗ 
 ██╔════╝ ██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██╔══██╗
 ██║  ███╗██████╔╝███████║██╔██╗ ██║   ██║   █████╗  ██║  ██║
 ██║   ██║██╔══██╗██╔══██║██║╚██╗██║   ██║   ██╔══╝  ██║  ██║
 ╚██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ███████╗██████╔╝
  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═════╝ 
        </div>
        <p style="text-align: center;">Welcome to TrippiesForum</p>
        <p style="text-align: center; margin-top: 20px;">
          <a href="/forum">Enter TrippiesForum</a>
        </p>
      `;
      
      res.send(htmlTemplate('Access Granted', content));
    } else {
      res.redirect(`/nojs/login?sid=${sid}&error=${encodeURIComponent('Invalid code')}`);
    }
  });

  // Cleanup old sessions
  setInterval(() => {
    const now = Date.now();
    for (const [sid, session] of nojsSessions.entries()) {
      if (session.waitUntil && now - session.waitUntil > 30 * 60 * 1000) {
        nojsSessions.delete(sid);
      }
    }
  }, 5 * 60 * 1000);
}
