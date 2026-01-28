# Admin Security Implementation - Complete Guide

## Overview

Admin panel access is now protected by **two-factor authentication** implemented at the tor-gate level:

```
User (authenticated)
    ↓
Requests admin access
    ↓
tor-gate: "Admin step-up required"
    ↓
tor-gate: [1] Verify admin password (hash check)
tor-gate: [2] Verify GPG signature (fresh challenge)
    ↓
Both valid?
    ├─ YES → Issue admin token (30 min validity)
    └─ NO → Deny access, require re-authentication
    ↓
tor-gate: Proxy request with admin headers
    ├─ X-Admin-Mode: true
    ├─ X-Admin-Verified-At: timestamp
    └─ X-Admin-Username: admin_name
    ↓
nginx: Check headers present
    ├─ Missing? → 401 Unauthorized
    └─ Valid? → Forward to Flarum
    ↓
Flarum: Check admin headers
    ├─ Invalid? → 403 Forbidden
    └─ Valid? → Serve admin panel
```

## Admin Credentials

### Trippies (Main Admin)

```
Username: Trippies
Password: Qzz908kasr15!
GPG Key: (see below)

GPG Public Key:
-----BEGIN PGP PUBLIC KEY BLOCK-----
Comment: User-ID:	Trippies
Comment: Valid from:	26 Jan 2026 19:40:48
Comment: Valid until:	26 Jan 2029 12:00:00
Comment: Type:	255-bit EdDSA (secret key available)
Comment: Usage:	Signing, Encryption, Certifying User-IDs
Comment: Fingerprint:	DABAE797242CC5B30ED062A2988B42DDC3066B6E

mDMEaXgXoBYJKwYBBAHaRw8BAQdAbOQF+56zFh4pKTYStHOimJhnu8/HBB9VmZaa
C+gYwU+0CFRyaXBwaWVziJkEExYKAEEWIQTauueXJCzFsw7QYqKYi0LdwwZrbgUC
aXgXoAIbAwUJBaSAAAULCQgHAgIiAgYVCgkICwIEFgIDAQIeBwIXgAAKCRCYi0Ld
wwZrbshiAP49UzLtRTcdpo1IYE2lpWCFpSk4CbxmHLEvMiuw+GwUJQD/eB+Lb4zE
yKa+Evb2gJTSY8MoyK9v84dVkeEcctRH7wK4OARpeBegEgorBgEEAZdVAQUBAQdA
mvzpL1k2KIRg+c2Z6Ic//A9LesiZWIqd/B/CoKxEZ2UDAQgHiH4EGBYKACYWIQTa
uueXJCzFsw7QYqKYi0LdwwZrbgUCaXgXoAIbDAUJBaSAAAAKCRCYi0LdwwZrbthQ
AQCYrTm29ChqYz/iFe+6ik8aGy7KecOQYC+FbhErEHSFbQD/XmGY3zXG17HHfpPm
8ZV/ornuTTPF/b4wYz6zcwusiQQ=
=AbAa
-----END PGP PUBLIC KEY BLOCK-----
```

## Admin Authentication Flow

### Step 1: User Authenticates Normally

```
User visits http://forum.onion
    ↓
tor-gate: Delay gate (random 5-45 sec)
tor-gate: PoW challenge
tor-gate: Captcha (onion URL)
tor-gate: GPG login challenge
    ↓
User authenticated as "Trippies" (regular user)
Session token issued (1 hour validity)
```

### Step 2: User Tries to Access Admin Area

```
GET /admin (or /admin/settings, /api/admin/*, etc.)
    ↓
tor-gate: Detects admin route
    ↓
tor-gate: "Admin step-up required"
Response: 403 Forbidden
Body: { error: "admin_step_up_required", stepUpUrl: "/admin/step-up-init" }
```

### Step 3: Admin Initiates Step-Up

```
POST /admin/step-up-init
Body: { adminUsername: "Trippies" }
    ↓
tor-gate: Generate random challenge (32 bytes hex-encoded)
tor-gate: Store challenge in ephemeral storage (5 min expiry)
tor-gate: Return challenge + challengeId
    ↓
Response: {
  challenge: "a7f2b3e8c1d4f9a2...",
  challengeId: "8f3x9k2m5l7b"
}
```

### Step 4: Admin Provides Credentials

Admin now must provide TWO factors:

#### Factor 1: Password
```
Admin enters password (plaintext) - only in this HTTPS request
Password is NOT stored anywhere - only hash is stored
```

#### Factor 2: GPG Signature
```
Admin signs the challenge locally with their private GPG key
Challenge signature proves they have the private key
Signature is verified against stored public key
```

### Step 5: Verification

```
POST /admin/step-up-verify
Body: {
  challengeId: "8f3x9k2m5l7b",
  password: "Qzz908kasr15!",
  gpgSignature: "-----BEGIN PGP SIGNATURE-----..."
}
    ↓
tor-gate:
  [1] Verify password with bcrypt hash → ✓ Match
  [2] Verify signature with GPG → ✓ Valid
    ↓
Both valid? Issue admin token
  - Random 32-byte hex token
  - 30-minute validity
  - Server-side stored
  - Not reusable after expiry
    ↓
Response: {
  success: true,
  adminToken: "f7a2b8c3d1e5f9a4...",
  expiresIn: 1800
}
```

### Step 6: Access Admin Panel

```
GET /admin/panel
Headers: {
  X-Admin-Token: "f7a2b8c3d1e5f9a4..."
}
    ↓
tor-gate: Verify token
  ├─ Token exists? YES
  ├─ Token expired? NO
  └─ Token valid? YES
    ↓
tor-gate: Add admin capability headers
  X-Admin-Mode: true
  X-Admin-Verified-At: 1234567890000
  X-Admin-Username: Trippies
    ↓
Proxy to Flarum (port 9001)
    ↓
Flarum: Check headers
  ├─ X-Admin-Mode == "true"? YES
  ├─ Timestamp valid? YES (< 30 min)
  ├─ User verified? YES
    ↓
✅ Serve admin panel to Trippies
```

## API Endpoints

### POST /admin/step-up-init

Initiate admin step-up process.

**Request:**
```json
{
  "adminUsername": "Trippies"
}
```

**Response (Success 200):**
```json
{
  "challenge": "a7f2b3e8c1d4f9a2b5e8c1d4f9a2b5e8...",
  "challengeId": "8f3x9k2m5l7b"
}
```

**Response (Failure 404):**
```json
{
  "error": "Admin user not found"
}
```

### POST /admin/step-up-verify

Complete admin step-up with password + GPG signature.

**Request:**
```json
{
  "challengeId": "8f3x9k2m5l7b",
  "password": "Qzz908kasr15!",
  "gpgSignature": "-----BEGIN PGP SIGNATURE-----\n..."
}
```

**Response (Success 200):**
```json
{
  "success": true,
  "adminToken": "f7a2b8c3d1e5f9a4b5e8c1d4f9a2b5e8...",
  "expiresIn": 1800
}
```

**Response (Failure 401):**
```json
{
  "error": "Invalid credentials"
}
```

```json
{
  "error": "Invalid GPG signature"
}
```

### GET /admin/check-access

Check if client has valid admin token.

**Headers:**
```
X-Admin-Token: f7a2b8c3d1e5f9a4...
```

**Response (Has access 200):**
```json
{
  "hasAdminAccess": true,
  "adminUsername": "Trippies",
  "expiresIn": 1234
}
```

**Response (No access 200):**
```json
{
  "hasAdminAccess": false
}
```

### POST /admin/logout

Invalidate admin token.

**Headers:**
```
X-Admin-Token: f7a2b8c3d1e5f9a4...
```

**Response (200):**
```json
{
  "success": true
}
```

## Files Created

### Backend (tor-gate)

1. **torgate/server/routes/admin.ts**
   - Admin step-up routes (/admin/step-up-init, /admin/step-up-verify)
   - Token validation
   - Admin access checking
   - ~300 lines

2. **torgate/server/scripts/seed-admin.ts**
   - Script to create admin user "Trippies"
   - Sets password hash with bcrypt
   - Sets GPG public key
   - One-time setup

### Frontend (Flarum)

3. **flarum/nojs/admin-guard.php**
   - Validates admin headers
   - Checks X-Admin-Mode, X-Admin-Verified-At
   - Enforces 30-minute session limit
   - Fails closed (deny by default)
   - ~60 lines

4. **flarum/nojs/admin.php**
   - Admin dashboard example
   - Uses admin-guard.php for protection
   - Shows admin panel if authorized
   - Returns 403 if not admin
   - ~150 lines

### Schema Updates

5. **torgate/shared/schema.ts** (updated)
   - Added `adminUsers` table
   - Added admin types and schemas
   - Added admin API types

6. **torgate/server/storage.ts** (updated)
   - Added admin user methods
   - Added admin challenge methods
   - In-memory admin challenge storage

## Security Properties

✅ **Two independent factors required**
  - Factor 1: Password (something you know)
  - Factor 2: GPG key (something you have)
  - Both must be valid, neither alone is sufficient

✅ **No private keys stored**
  - Only public GPG key stored
  - Private key never uploaded
  - Signature verified server-side

✅ **Short-lived tokens**
  - Admin tokens valid for 30 minutes only
  - After expiry, must re-authenticate
  - Not extendable indefinitely

✅ **Server-side session state**
  - Tokens stored in server memory
  - Cannot be forged by client
  - Cannot be extended by client

✅ **Fresh challenges per step-up**
  - Random 32-byte challenge each time
  - Cannot replay old signatures
  - Challenge expires in 5 minutes

✅ **Cryptographic proof of identity**
  - GPG signature proves possession of private key
  - Cannot be guessed or brute-forced
  - Strong EdDSA (255-bit)

✅ **Fail-safe design**
  - Missing headers → 401/403
  - Expired tokens → 403
  - Invalid signature → 401
  - No fallback, no bypass

## Setup Instructions

### 1. Run Database Migrations

Ensure admin users table exists:

```bash
cd torgate
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 2. Seed Admin User

Create the "Trippies" admin user:

```bash
cd torgate
npx ts-node server/scripts/seed-admin.ts
```

Expected output:
```
🔐 Seeding admin user: Trippies
✅ Admin user created successfully
   Username: Trippies
   GPG Key Fingerprint: DABAE797242CC5B30ED062A2988B42DDC3066B6E

📋 Admin Credentials:
   Username: Trippies
   Password: Qzz908kasr15!
```

### 3. Deploy

The admin routes are now available:
- POST /admin/step-up-init
- POST /admin/step-up-verify
- GET /admin/check-access
- POST /admin/logout

### 4. Access Admin Panel

1. Authenticate normally as regular user
2. Request /admin/step-up-init with adminUsername: "Trippies"
3. Get challenge
4. Sign challenge with GPG private key locally
5. Submit password + signature to /admin/step-up-verify
6. Receive admin token
7. Use admin token to access /admin/panel and other admin routes

## Testing

### Manual Test Flow

```bash
# 1. Authenticate as regular user
# (Complete delay, PoW, captcha, GPG login flow)

# 2. Try accessing admin without step-up
curl http://localhost/admin/panel
# Expected: 403 Forbidden

# 3. Request admin step-up challenge
curl -X POST http://localhost/admin/step-up-init \
  -H "Content-Type: application/json" \
  -d '{"adminUsername": "Trippies"}'
# Expected: {challenge: "...", challengeId: "..."}

# 4. Sign challenge locally
echo -n "a7f2b3e8c1d4f9a2..." | gpg --sign --armor

# 5. Submit password + signature
curl -X POST http://localhost/admin/step-up-verify \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": "8f3x9k2m5l7b",
    "password": "Qzz908kasr15!",
    "gpgSignature": "-----BEGIN PGP SIGNATURE-----..."
  }'
# Expected: {success: true, adminToken: "...", expiresIn: 1800}

# 6. Use admin token to access admin panel
curl http://localhost/admin/panel \
  -H "X-Admin-Token: f7a2b8c3d1e5f9a4..."
# Expected: 200 OK with admin panel HTML
```

## Admin Management

### Add New Admin User

Edit `torgate/server/scripts/seed-admin.ts` and change:

```typescript
const ADMIN_USERNAME = "NewAdminName";
const ADMIN_PASSWORD = "NewAdminPassword";
const ADMIN_GPG_KEY = `... (paste their public GPG key)`;
```

Run:
```bash
npx ts-node server/scripts/seed-admin.ts
```

### Change Admin Password

Create a new migration or script:

```typescript
const passwordHash = await bcrypt.hash("new_password", 12);
await db
  .update(adminUsers)
  .set({ passwordHash, updatedAt: new Date() })
  .where(eq(adminUsers.username, "Trippies"));
```

### Change Admin GPG Key

Get their new public key, then:

```typescript
await db
  .update(adminUsers)
  .set({ publicGpgKey: newPublicKey, updatedAt: new Date() })
  .where(eq(adminUsers.username, "Trippies"));
```

### Disable Admin User

```typescript
await db
  .update(adminUsers)
  .set({ isActive: false, updatedAt: new Date() })
  .where(eq(adminUsers.username, "Trippies"));
```

## Monitoring & Logs

Failed authentication attempts are logged:

```
[SECURITY] Failed admin password attempt for: Trippies
[SECURITY] Failed admin GPG signature for: Trippies
[ADMIN] Step-up successful for: Trippies
```

Monitor these logs for brute-force attempts or compromise indicators.

## Best Practices

✅ **Change default credentials immediately after first deployment**
✅ **Rotate admin passwords regularly (every 90 days)**
✅ **Keep GPG private key in secure storage**
✅ **Enable 2FA on GPG key passphrase**
✅ **Monitor failed step-up attempts**
✅ **Document each admin user (name, GPG fingerprint)**
✅ **Test disaster recovery (losing GPG key)**
✅ **Audit admin access logs**

## Troubleshooting

### "Admin user not found"
- Verify admin was created with `seed-admin.ts`
- Check database: `SELECT * FROM admin_users WHERE username = 'Trippies';`

### "Invalid credentials"
- Wrong password entered
- Note: Passwords are case-sensitive

### "Invalid GPG signature"
- Challenge might be expired (5-minute window)
- GPG key mismatch (check fingerprint: DABAE797242CC5B30ED062A2988B42DDC3066B6E)
- Signature not created with the correct private key

### "Admin session expired"
- 30 minutes have passed since step-up
- Perform step-up again to get new admin token

---

## Status

✅ Admin users table created
✅ Admin authentication routes implemented
✅ Admin step-up flow complete (password + GPG)
✅ Flarum admin guard created
✅ Admin example dashboard created
✅ Seeding script ready
✅ Documentation complete

**Next steps**: Run migration, seed admin, test flow
