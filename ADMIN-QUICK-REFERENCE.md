# Admin Authentication - Quick Reference

## 🔐 Admin Credentials

```
Username: Trippies
Password: Qzz908kasr15!
GPG Key Fingerprint: DABAE797242CC5B30ED062A2988B42DDC3066B6E
```

## 📋 Before First Use

1. **Extract the GPG public key** (in ADMIN-SECURITY.md) and import it:
   ```bash
   gpg --import << 'EOF'
   -----BEGIN PGP PUBLIC KEY BLOCK-----
   [paste key from ADMIN-SECURITY.md]
   -----END PGP PUBLIC KEY BLOCK-----
   EOF
   ```

2. **Verify fingerprint**:
   ```bash
   gpg --list-keys Trippies
   # Should show: DABAE797242CC5B30ED062A2988B42DDC3066B6E
   ```

3. **Trust the key** (optional but recommended):
   ```bash
   gpg --edit-key DABAE797242CC5B30ED062A2988B42DDC3066B6E
   # Type: trust
   # Choose: 4 (I trust this key fully)
   # Type: quit
   ```

## 🚀 Admin Access Workflow

### Step 1: Complete Regular Authentication
```
User visits http://forum.onion
  ↓
Completes delay gate (5-45 seconds)
  ↓
Solves PoW challenge (SHA256)
  ↓
Enters captcha (onion URL matching)
  ↓
Signs GPG challenge with Trippies private key
  ↓
✅ Authenticated as regular user
```

### Step 2: Request Admin Step-Up
```bash
curl -X POST http://forum.onion/admin/step-up-init \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionToken=..." \
  -d '{
    "adminUsername": "Trippies"
  }'
```

**Response:**
```json
{
  "challenge": "a7f2b3e8c1d4f9a2b5e8c1d4f9a2b5e8...",
  "challengeId": "8f3x9k2m5l7b"
}
```

### Step 3: Sign the Challenge

Copy the challenge value and sign it with GPG:

```bash
echo -n "a7f2b3e8c1d4f9a2b5e8c1d4f9a2b5e8..." | \
  gpg --sign --armor --default-key DABAE797242CC5B30ED062A2988B42DDC3066B6E
```

This will prompt for your GPG key passphrase, then output:

```
-----BEGIN PGP SIGNATURE-----

iHUEABYKAB0WIQDAB...
...
-----END PGP SIGNATURE-----
```

### Step 4: Verify Admin Credentials

```bash
curl -X POST http://forum.onion/admin/step-up-verify \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionToken=..." \
  -d '{
    "challengeId": "8f3x9k2m5l7b",
    "password": "Qzz908kasr15!",
    "gpgSignature": "-----BEGIN PGP SIGNATURE-----\n...\n-----END PGP SIGNATURE-----"
  }'
```

**Response:**
```json
{
  "success": true,
  "adminToken": "f7a2b8c3d1e5f9a4b5e8c1d4f9a2b5e8...",
  "expiresIn": 1800
}
```

### Step 5: Access Admin Panel

```bash
curl http://forum.onion/admin/panel \
  -H "Cookie: sessionToken=...; adminToken=f7a2b8c3d1e5f9a4..."
```

Or simply add the admin token cookie and visit:
```
http://forum.onion/admin/panel
```

## ⏱️ Token Expiration

- Admin tokens valid for **30 minutes**
- After expiration, must complete step-up again
- Logout invalidates token immediately
- Multiple admin sessions can be active (one per browser/client)

## 🔄 Logout

```bash
curl -X POST http://forum.onion/admin/logout \
  -H "Cookie: sessionToken=...; adminToken=..."
```

## 🛡️ Security Features

✅ **Two-Factor Authentication**
  - Factor 1: Password (bcrypt hashed)
  - Factor 2: GPG signature (cryptographic proof)

✅ **Server-Side Tokens**
  - Tokens stored on server only
  - Cannot be forged by client
  - Cannot be extended by client

✅ **Fresh Challenges**
  - New random challenge each time
  - Cannot replay old signatures
  - 5-minute challenge expiration

✅ **Short-Lived Access**
  - 30-minute admin sessions
  - Forces re-authentication regularly
  - Automatic timeout protection

## ⚠️ Common Issues

### "Admin user not found"
- Verify admin was seeded: `npx ts-node server/scripts/seed-admin.ts`
- Check database: `psql -U forum_user -d forum_db -c "SELECT * FROM admin_users;"`

### "Invalid credentials"
- Verify password is correct: `Qzz908kasr15!`
- Passwords are case-sensitive
- Try step-up again from the beginning

### "Invalid GPG signature"
- Verify you signed with correct key: `gpg --list-keys | grep Trippies`
- Verify fingerprint matches: `DABAE797242CC5B30ED062A2988B42DDC3066B6E`
- Challenge may have expired - get new challenge from step-up-init
- Verify echo command doesn't add newline: use `-n` flag

### "Admin session expired"
- Get new admin token via step-up-verify
- Token lifetime is 30 minutes

### "Challenge expired"
- Challenges only valid for 5 minutes
- Request new challenge from /admin/step-up-init

## 📝 Changing Admin Credentials

### Change Admin Password

```bash
# Connect to database
psql -U forum_user -d forum_db

# Hash new password (need bcrypt tool)
# Use: https://bcrypt-generator.com/ or npm bcrypt

# Update:
UPDATE admin_users 
SET passwordHash = '$2b$12$...' 
WHERE username = 'Trippies';
```

### Change GPG Key

Get their new public key block, then:

```bash
psql -U forum_user -d forum_db

UPDATE admin_users 
SET publicGpgKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----
...' 
WHERE username = 'Trippies';
```

### Disable Admin Account

```bash
psql -U forum_user -d forum_db

UPDATE admin_users 
SET isActive = false 
WHERE username = 'Trippies';
```

To re-enable:

```bash
UPDATE admin_users 
SET isActive = true 
WHERE username = 'Trippies';
```

## 🔍 Monitoring Admin Access

Check logs for admin activity:

```bash
# View tor-gate logs
journalctl -u tor-gate -f

# Search for admin attempts
journalctl -u tor-gate | grep "admin"
journalctl -u tor-gate | grep "step-up"
journalctl -u tor-gate | grep "SECURITY"

# Check Flarum logs
tail -f /var/log/flarum/admin.log
```

Monitor for suspicious patterns:

```
[SECURITY] Failed admin password attempt for: Trippies
[SECURITY] Failed admin GPG signature for: Trippies
[ADMIN] Logout: Trippies
```

Repeated failed attempts may indicate brute-force attack.

## 🧪 Testing Admin Flow

### Automated Test Script

```bash
#!/bin/bash

BASE_URL="http://forum.onion"
ADMIN_USER="Trippies"
ADMIN_PASS="Qzz908kasr15!"
SESSION_TOKEN="..."  # Get from login flow
CHALLENGE_FILE="/tmp/challenge.txt"

# Step 1: Request challenge
echo "Requesting challenge..."
RESPONSE=$(curl -s -X POST $BASE_URL/admin/step-up-init \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionToken=$SESSION_TOKEN" \
  -d '{"adminUsername": "'$ADMIN_USER'"}')

CHALLENGE=$(echo $RESPONSE | jq -r '.challenge')
CHALLENGE_ID=$(echo $RESPONSE | jq -r '.challengeId')

echo "Challenge: $CHALLENGE"
echo "Challenge ID: $CHALLENGE_ID"

# Step 2: Sign challenge
echo "Signing challenge with GPG..."
GPG_SIGNATURE=$(echo -n "$CHALLENGE" | gpg --sign --armor --default-key Trippies)

# Step 3: Verify credentials
echo "Verifying credentials..."
curl -s -X POST $BASE_URL/admin/step-up-verify \
  -H "Content-Type: application/json" \
  -H "Cookie: sessionToken=$SESSION_TOKEN" \
  -d '{
    "challengeId": "'$CHALLENGE_ID'",
    "password": "'$ADMIN_PASS'",
    "gpgSignature": '"$(echo "$GPG_SIGNATURE" | jq -Rs .)"'
  }' | jq .

# Step 4: Check admin access
curl -s -X GET $BASE_URL/admin/check-access \
  -H "Cookie: sessionToken=$SESSION_TOKEN; adminToken=..." | jq .
```

## 📚 Additional Resources

- [ADMIN-SECURITY.md](./ADMIN-SECURITY.md) - Complete admin security guide
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture documentation
- [GPG Key Management](https://www.gnupg.org/documentation/)
- [OpenPGP.js](https://openpgpjs.org/) - Used for signature verification

## 🆘 Emergency Access

If admin cannot access:

1. **Check service is running**:
   ```bash
   systemctl status tor-gate
   systemctl status nginx
   ```

2. **Check admin user exists**:
   ```bash
   psql -U forum_user -d forum_db -c "SELECT * FROM admin_users;"
   ```

3. **Check logs**:
   ```bash
   journalctl -u tor-gate -f
   tail -f /var/log/nginx/tor-gate-access.log
   ```

4. **Recreate admin user**:
   ```bash
   npx ts-node server/scripts/seed-admin.ts
   ```

5. **Restart services**:
   ```bash
   systemctl restart tor-gate nginx
   ```

---

**Last Updated**: 2024
**Security Level**: Production-Ready
**Encryption**: EdDSA (255-bit) + bcrypt
