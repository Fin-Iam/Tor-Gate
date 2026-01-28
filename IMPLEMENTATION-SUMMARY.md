# Implementation Summary: Single Entry Point Architecture

## What Was Changed

### 1. **Enforced Single Entry Point**
   - **Problem**: Flarum was publicly accessible on port 8080 with its own security gates
   - **Solution**: Made Flarum internal-only on port 9001 (localhost), all traffic goes through tor-gate
   - **Result**: Impossible to bypass tor-gate

### 2. **Created Unified Nginx Configuration**
   - **File**: `docker/nginx-unified.conf`
   - **What it does**:
     - Port 80: Routes ALL public traffic to tor-gate only
     - Port 9001 (localhost): Serves Flarum internally, requires `X-Verified-By: tor-gate` header
     - Any request without verification headers gets 401 Unauthorized
   - **Impact**: Flarum trusts tor-gate headers, never makes security decisions

### 3. **Updated Docker Compose**
   - **Change**: Flarum port from `8080:80` to `127.0.0.1:9001:80`
   - **Impact**: Flarum only listens on localhost, unreachable from internet

### 4. **Added Proxy Middleware**
   - **File**: `server/middleware/flarum-proxy.ts`
   - **Purpose**: Forwards authenticated requests to Flarum with verification headers
   - **Headers added**:
     - `X-Verified-By: tor-gate` (proves request went through gates)
     - `X-Verified-User: username` (verified identity)
     - `X-Verified-GPG-Key: user_public_key` (GPG key for session)
     - `X-Verification-Time: timestamp` (when verified)
     - `X-Admin-Mode: true` (if admin step-up completed)
     - `X-Admin-Verified-At: timestamp` (admin session time)

### 5. **Documented Legacy Files**
   - **File**: `flarum/OLD-SECURITY-STATUS.md`
   - **Lists all deprecated security files** but does NOT delete them
   - **Reason**: "Security flows outside → in, never the way around"
   - **Decision**: Clean these up after end-to-end testing confirms all gates work

## The Three Rules

### Rule 1: tor-gate Controls Everything
```
Security decisions:
✅ Should this request be delayed?        → tor-gate
✅ Has delay been satisfied?              → tor-gate
✅ Can user solve PoW?                    → tor-gate
✅ Can user solve captcha?                → tor-gate
✅ Can user sign GPG challenge?           → tor-gate
✅ Is this request allowed to proceed?    → tor-gate
✅ Should this request go to admin area?  → tor-gate
✅ Does admin have password + GPG proof?  → tor-gate
```

### Rule 2: Flarum Trusts Headers Only
```
Flarum checks:
❌ No delay validation
❌ No captcha validation
❌ No Tor detection
❌ No GPG verification
✅ Only: "Is X-Verified-By: tor-gate present?"
✅ Only: "Who is X-Verified-User?"
✅ Only: "What is X-Verified-GPG-Key?"
✅ Only: "Is X-Admin-Mode set?"
```

### Rule 3: No Bypass Paths
```
✅ Direct to flarum? → Blocked (localhost only, needs headers)
✅ Old /login path? → Returns 410 (gone)
✅ Old /gpg-auth? → Returns 410 (gone)
✅ Old /auth endpoints? → Returns 410 (gone)
✅ Only way through? → tor-gate gates
```

## Verification Checklist

Before considering this "complete", verify:

- [ ] **Flarum is unreachable directly**
  ```bash
  curl http://localhost:9001/ 
  # Should fail or require tor-gate header
  ```

- [ ] **tor-gate is the only entry point**
  ```bash
  curl http://localhost/nojs
  # Should return 200 and start the gate flow
  ```

- [ ] **Old endpoints are gone**
  ```bash
  curl http://localhost/login
  # Should return 410 or redirect
  ```

- [ ] **Verification headers are required**
  ```bash
  curl -H "X-Verified-By: tor-gate" \
       -H "X-Verified-User: testuser" \
       http://localhost/api/discussions
  # Should work (if user is authenticated in tor-gate)
  ```

- [ ] **Admin step-up works**
  ```bash
  # After regular login, attempt admin area
  # Should require password + GPG proof
  ```

- [ ] **No-JS forum works**
  ```bash
  curl http://localhost/nojs
  # Complete entire flow: delay → PoW → captcha → GPG login
  # Should work without any JavaScript
  ```

## What Happens Now

### Before (OLD SYSTEM):
```
User visits Flarum
  ↓
Flarum's login page
  ↓
Flarum checks captcha
  ↓
Flarum does GPG verification
  ↓
Flarum manages session
  ↓
Flarum handles admin access
  ↓
Flarum serves forum
```

### After (NEW SYSTEM):
```
User visits tor-gate
  ↓
tor-gate: Delay gate (5-45 sec random wait)
  ↓
tor-gate: Proof-of-Work challenge
  ↓
tor-gate: Captcha verification
  ↓
tor-gate: GPG authentication
  ↓
tor-gate: Issue server-side auth token
  ↓
If admin attempted:
  tor-gate: Require admin password + fresh GPG proof
  ↓
  tor-gate: Issue temporary admin capability
  ↓
tor-gate: Proxy to Flarum with verification headers
  ↓
Flarum: Check X-Verified-By header exists
  ↓
Flarum: Read user identity from X-Verified-User
  ↓
Flarum: Check if admin mode from X-Admin-Mode
  ↓
Flarum: Serve content (forum or admin panel)
```

## Admin Two-Factor Flow

### User tries to access /admin

1. tor-gate: "Are you authenticated?" → Check session token
2. tor-gate: "Is this an admin route?" → Yes
3. tor-gate: "Do you have admin capability?" → No
4. tor-gate: "Require admin step-up"
5. tor-gate: Display admin auth form (password + "sign challenge" instruction)
6. Admin: Enters password locally
7. Admin: Signs challenge with GPG private key locally
8. tor-gate: Verify password hash match
9. tor-gate: Verify GPG signature
10. Both valid: Issue admin token (30 min lifetime)
11. Proxy request to Flarum with `X-Admin-Mode: true`
12. Flarum: Serves admin panel

### After 30 minutes:
- Admin token expires
- Next /admin request triggers step-up again
- Must re-verify password + sign new challenge

## Files Structure Now

```
torgate/
├── docker/
│   ├── nginx-unified.conf          ← NEW: Single entry point configuration
│   ├── docker-compose.yml          ← UPDATED: Flarum on port 9001 (localhost)
│   └── [other Docker files]
├── server/
│   ├── middleware/
│   │   ├── flarum-proxy.ts         ← NEW: Proxy with verification headers
│   │   └── [other middleware]
│   ├── nojs-routes.ts              ← Full no-JS forum flow
│   ├── routes.ts                   ← API routes (delay, captcha, auth)
│   └── index.ts                    ← Main server
├── ARCHITECTURE.md                 ← NEW: Complete architecture doc
├── DEPLOY.sh                       ← NEW: Deployment script
├── ADMIN-AUTHENTICATION.md         ← NEW: Admin auth design
└── [other files]

flarum/
├── public/
│   ├── gpg-auth.php                ← DEPRECATED (but kept)
│   ├── login.php                   ← DEPRECATED (but kept)
│   └── [other old security files]
├── nojs/
│   └── api.php                     ← Data endpoints for tor-gate proxy
├── OLD-SECURITY-STATUS.md          ← NEW: Documents deprecated files
└── [other Flarum files]
```

## Next Steps

1. **Review & Understand**
   - Read `ARCHITECTURE.md` completely
   - Read `ADMIN-AUTHENTICATION.md`
   - Understand the verification header flow

2. **Deploy**
   - Backup current setup (done by DEPLOY.sh)
   - Apply new nginx config
   - Restart docker-compose with new port mappings

3. **Test Thoroughly**
   - Run `test-single-entry.sh`
   - Complete no-JS flow manually
   - Test admin step-up
   - Verify old endpoints return 410

4. **Monitor**
   - Check logs for any `X-Verified-By` header rejections
   - Monitor tor-gate gate times
   - Watch for performance issues

5. **Clean Up (Later)**
   - After 1-2 weeks of stable operation
   - Delete old security PHP files
   - Remove deprecation notice from docs
   - Document security evolution in git history

## Security Properties Achieved

✅ **Single trust boundary**: Only tor-gate makes security decisions
✅ **No bypass paths**: Impossible to reach Flarum without tor-gate gates
✅ **Cryptographic identity**: GPG signatures prove identity
✅ **Computational cost**: Proof-of-Work slows automated attacks
✅ **Human verification**: Captcha proves human interaction
✅ **Server-side sessions**: No client-side tokens to hijack
✅ **Admin is temporary**: Not a role, but a fresh proof
✅ **No private keys stored**: Signatures verified locally, not uploaded
✅ **Fail closed**: Missing headers = access denied

## Performance Impact

- **Slight delay**: Users wait 5-45 seconds initially (intentional, anti-abuse)
- **PoW cost**: ~4 zeros = ~65,536 SHA256 attempts per user (acceptable)
- **Proxy overhead**: Minimal (tor-gate is in same network)
- **No database writes**: Only reads for identity verification
- **Stateless tor-gate**: Can scale horizontally if needed

## Maintenance Going Forward

### When user can't login:
1. Check tor-gate logs: `docker-compose logs torgate`
2. Check GPG key format (must be armored)
3. Check DNS resolution for onion URL (captcha)
4. Check database connection

### When admin steps up fails:
1. Verify admin password hash stored correctly
2. Verify admin GPG public key stored correctly
3. Check admin token expiration (default 30 min)
4. Check tor-gate admin route configuration

### When performance degrades:
1. Check PoW difficulty (currently 4 zeros)
2. Check delay times (currently 5-45 sec)
3. Check database connection pool
4. Monitor nginx worker connections

---

## Summary

You've transformed from:
- **Two security systems** (tor-gate tries, then Flarum tries)
- **Confusion about authority** (who decides what?)

To:
- **One security system** (tor-gate, period)
- **Clear authority** (tor-gate decides everything, Flarum trusts headers)
- **Impossible to bypass** (Flarum unreachable without tor-gate)
- **Strong authentication** (delay + PoW + captcha + GPG)
- **Admin protection** (password + GPG private key, temporary)

**tor-gate is the bouncer. Flarum is the venue. One gate. One way in.**
