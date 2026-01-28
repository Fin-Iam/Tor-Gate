# Architecture Diagrams

## Current Architecture (What You Have Now)

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET / TOR NETWORK                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────────┐
        │    NGINX Port 80/443       │
        │   (Public Entry Point)     │
        └─────────┬──────────────────┘
                  │
       ┌──────────┴──────────┐
       ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│  TOR-GATE        │  │  FLARUM          │
│  (Port 5000)     │  │  (Port 9001)     │
│                  │  │  localhost only  │
│ 1. Delay Gate    │  │                  │
│ 2. PoW Challenge │  │ ← Protected by   │
│ 3. Captcha       │  │   verification   │
│ 4. GPG Auth      │  │   headers        │
│                  │  │                  │
│ Issues Token +   │  │ Trusts:          │
│ Verification     │  │ - X-Verified-By  │
│ Headers          │  │ - X-Verified-User│
└────────┬─────────┘  │ - X-Verified-GPG │
         │            │                  │
         └────────────→ Proxy Request    │
                      │ Add Headers      │
                      │                  │
                      │ Return Content   │
                      └──────┬───────────┘
                             │
                             ↓
                      Response to Client
```

## Request Lifecycle (Step-by-Step)

### 1. Initial Request

```
Browser: GET http://example.onion/
         │
         ↓
NGINX:   Route to port 80 handler
         │
         ↓ (redirects to tor-gate)
tor-gate: /nojs landing
         │
         Response: Delay page (5-45 sec countdown)
```

### 2. After Delay

```
Browser: Auto-refresh or click "continue"
         │
         ↓
tor-gate: /nojs/pow (Proof of Work)
         │
         Challenge: "Find nonce where SHA256('ABC123' + nonce) has 4 leading zeros"
         │
         Response: Form to submit nonce
```

### 3. After PoW

```
Browser: POST nonce
         │
         ↓
tor-gate: Verify nonce
         │
         ✓ Valid: Proceed to captcha
         ✗ Invalid: Retry PoW
         │
         Response: Captcha page (onion URL matching)
```

### 4. After Captcha

```
Browser: Match 6 characters from onion address
         │
         ↓
tor-gate: Verify characters
         │
         ✓ Correct: Proceed to login
         ✗ Incorrect: Retry captcha
         │
         Response: Login/Register form
```

### 5. GPG Authentication

```
Browser: Enter username
         │
         ↓
tor-gate: loginInit endpoint
         │
         Generate challenge code
         Encrypt with user's public key
         │
         Response: Encrypted message

Browser: User decrypts with private GPG key
         │
         ↓
         POST decrypted code

tor-gate: Verify code matches
         │
         ✓ Match: Issue auth token
         ✗ No match: Retry
         │
         Response: Success + Auth token
```

### 6. Forum Access

```
Browser: GET /forum?token=AUTH_TOKEN
         │
         ↓
NGINX:   Route to tor-gate (port 80)
         │
tor-gate: Validate token, build headers:
         ├─ X-Verified-By: tor-gate
         ├─ X-Verified-User: username
         ├─ X-Verified-GPG-Key: user_key
         └─ X-Verification-Time: timestamp
         │
         Proxy to Flarum (port 9001)
         │
         ↓
NGINX:   Route to localhost:9001
         │
         Check headers:
         ├─ X-Verified-By == "tor-gate"? YES → continue
         ├─ Headers present? YES → continue
         ├─ No headers? NO → 401 Unauthorized
         │
         ↓
PHP-FPM: Execute Flarum
         │
         Read from $_SERVER:
         ├─ HTTP_X_VERIFIED_USER
         ├─ HTTP_X_VERIFIED_GPG_KEY
         └─ HTTP_X_VERIFICATION_TIME
         │
         Trust user identity
         Serve forum
         │
         Response: Forum page
```

## Admin Authentication Flow

```
User logged in as regular user
         │
         ↓
POST /admin/settings (admin route)
         │
         ↓
tor-gate: Check if admin route
         │
         ✓ Yes, check admin token
         │
         ✗ No admin token: Require step-up
         │
         ↓
tor-gate: /admin/step-up form
         │
         Fields:
         ├─ Admin Password
         ├─ "Sign this challenge with your private key"
         └─ Challenge: random 256-byte string
         │
         Response: Form

Admin: Enter password + sign challenge locally
         │
         ↓
         POST step-up credentials
         │
         ↓
tor-gate: Verify both:
         ├─ password_hash == bcrypt(password)? YES
         └─ GPG_signature_valid(challenge)? YES
         │
         ✓ Both valid: Issue admin token (30 min)
         ✗ Either fails: Retry or redirect
         │
         ↓
tor-gate: Add admin headers:
         ├─ X-Admin-Mode: true
         └─ X-Admin-Verified-At: timestamp
         │
         Proxy original /admin request
         │
         ↓
Flarum: Check X-Admin-Mode
         │
         ✓ Present + valid: Serve admin panel
         ✗ Missing/expired: 403 Forbidden
         │
         Response: Admin panel
```

## Security Gate Architecture

```
                              START
                               │
                               ↓
                    ┌──────────────────┐
                    │  DELAY GATE      │
                    │                  │
                    │  Random 5-45s    │
                    │  wait imposed    │
                    │                  │
                    │  Purpose: Slow   │
                    │  down attackers  │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │  PoW GATE        │
                    │                  │
                    │  SHA256 hash     │
                    │  challenge:      │
                    │  N leading zeros │
                    │                  │
                    │  Purpose: Prove  │
                    │  computational   │
                    │  effort / human  │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │  CAPTCHA GATE    │
                    │                  │
                    │  Onion URL       │
                    │  matching:       │
                    │  6 characters    │
                    │                  │
                    │  Purpose: Prove  │
                    │  they're on-site │
                    │  (can see page)  │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │  GPG AUTH GATE   │
                    │                  │
                    │  Challenge:      │
                    │  Random code     │
                    │  Encrypted with  │
                    │  user's public   │
                    │  key             │
                    │                  │
                    │  Purpose: Prove  │
                    │  identity via    │
                    │  private key     │
                    └────────┬─────────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │ ISSUE TOKEN      │
                    │                  │
                    │ Create server-   │
                    │ side session     │
                    │                  │
                    │ Add headers:     │
                    │ X-Verified-By    │
                    │ X-Verified-User  │
                    │ X-Verified-GPG   │
                    └────────┬─────────┘
                             │
                             ↓
                ┌────────────────────────┐
                │ ADMIN ROUTE?           │
                └────────┬───────────────┘
                     YES │   NO
                         │    ↓
                         ↓  FORUM ACCESS
                    ┌────────────────┐
                    │ ADMIN STEP-UP  │
                    │                │
                    │ 1. Verify      │
                    │    password    │
                    │    hash        │
                    │                │
                    │ 2. Verify GPG  │
                    │    signature   │
                    │    (separate   │
                    │    challenge)  │
                    │                │
                    │ Both pass:     │
                    │ Issue admin    │
                    │ token (30 min) │
                    └────────┬───────┘
                             │
                             ↓
                    ┌──────────────────┐
                    │ ADMIN PANEL      │
                    │ ACCESS GRANTED   │
                    └──────────────────┘
```

## Data Flow: No-JavaScript User Journey

```
┌────────────────────────────────────────────────────────────────┐
│                      NO-JS USER JOURNEY                        │
└────────────────────────────────────────────────────────────────┘

[ GET / ] 
  → nginx routes to tor-gate (port 80)
  ↓
[ tor-gate /nojs ]
  → HTML response with auto-refresh meta tag
  ↓
[ User sees: "Please wait 23 seconds..." ]
  → Automatic redirect after delay
  ↓
[ GET /nojs/pow?sid=XXX ]
  → tor-gate validates delay
  → Returns HTML form with PoW challenge
  ↓
[ User solves PoW (tries nonces until one matches) ]
  ↓
[ POST /nojs/pow ]
  → Form submit with nonce
  ↓
[ tor-gate verifies nonce ]
  ✓ Success: Redirect to captcha
  ✗ Fail: Show error, form to retry
  ↓
[ GET /nojs/captcha?sid=XXX ]
  → Renders onion URL with 6 blanks
  → Shows positions of missing chars
  ↓
[ User manually types 6 characters ]
  ↓
[ POST /nojs/captcha ]
  → Form submit with characters
  ↓
[ tor-gate verifies characters ]
  ✓ Success: Redirect to login
  ✗ Fail: Show error, form to retry
  ↓
[ GET /nojs/login?sid=XXX ]
  → Tabs for login / register
  → If registering: show GPG public key form
  → If logging in: show username field
  ↓
[ User registers or enters username ]
  ↓
[ POST /nojs/login/init OR /nojs/register ]
  → If register: store GPG key, redirect to login
  → If login: generate challenge, encrypt with user's GPG key
  ↓
[ tor-gate returns encrypted block ]
[ User sees: "Decrypt this with your private key" ]
  ↓
[ User manually decrypts (uses local GPG tool) ]
  ↓
[ GET /nojs/login/verify ]
  [ Form with: challenger_id, decrypted_code ]
  ↓
[ tor-gate verifies code ]
  ✓ Success: Create auth token, show success page
  ✗ Fail: Show error, link back to login
  ↓
[ Success page with link: /forum?token=AUTH_TOKEN ]
  ↓
[ GET /forum?token=AUTH_TOKEN ]
  → tor-gate validates token
  → Proxies to Flarum with verification headers
  ↓
[ Browser now in forum ]
  → Can browse discussions
  → Can post replies
  → All subsequent requests authenticated
  ↓
[ User logout: /nojs/logout?token=AUTH_TOKEN ]
  → Token deleted
  → Redirects to /nojs
  → Must re-enter gates for next session
```

## Comparison: Old vs New

### OLD ARCHITECTURE (What you had)

```
Browser → Port 8080 → Flarum (public)
                        │
                        ├─ Check delay
                        ├─ Check captcha
                        ├─ Check GPG
                        ├─ Manage session
                        ├─ Admin check
                        │
                        └─ Serve forum
```

**Problems:**
- Flarum made all security decisions
- Could bypass tor-gate entirely
- Security duplicated (or missing)
- No clear authority
- Admin was a flag, not an action

### NEW ARCHITECTURE (What you have now)

```
Browser → Port 80 → tor-gate (ONLY ENTRY)
                       │
                       ├─ Delay gate
                       ├─ PoW gate
                       ├─ Captcha gate
                       ├─ GPG gate
                       │
                       ├─ Admin? Yes
                       │ └─ Admin step-up
                       │    ├─ Password verify
                       │    └─ GPG sign verify
                       │
                       └─ Proxy to Flarum
                            │
                            ├─ Check X-Verified-By header
                            ├─ Read X-Verified-User
                            ├─ Trust identity
                            │
                            └─ Serve forum
```

**Improvements:**
- Single security authority (tor-gate)
- Impossible to bypass
- Clear, enforced trust boundary
- Admin is temporary, fresh proof
- No way to reach Flarum without gates

---

**The key difference:** One gate vs. two gates. One authority vs. confusion.
