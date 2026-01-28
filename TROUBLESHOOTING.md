# Troubleshooting Guide

## Table of Contents
1. [Service Issues](#service-issues)
2. [Authentication Issues](#authentication-issues)
3. [Admin Access Issues](#admin-access-issues)
4. [Database Issues](#database-issues)
5. [Nginx/Proxy Issues](#nginxproxy-issues)
6. [Performance Issues](#performance-issues)
7. [Security Issues](#security-issues)
8. [Common Error Messages](#common-error-messages)

---

## Service Issues

### tor-gate service not starting

**Symptoms:**
```
● tor-gate.service - tor-gate Security Gateway
   Loaded: loaded (/etc/systemd/system/tor-gate.service; enabled; preset: enabled)
   Active: failed (Result: exit-code) since Mon 2024-01-01 10:00:00 UTC; 5s ago
```

**Diagnosis:**
```bash
# Check logs
journalctl -u tor-gate -n 50 --no-pager

# Check if port is already in use
netstat -tlnp | grep 5000
lsof -i :5000

# Check if database is accessible
psql -U forum_user -d forum_db -c "SELECT 1;"

# Check if code builds
cd /opt/tor-gate
npm run build
```

**Solutions:**

1. **Port already in use:**
   ```bash
   # Kill process using port 5000
   fuser -k 5000/tcp
   
   # Or restart tor-gate
   sudo systemctl restart tor-gate
   ```

2. **Database connection failed:**
   ```bash
   # Check password in service file
   sudo nano /etc/systemd/system/tor-gate.service
   
   # Verify database user and password
   psql -U forum_user -d forum_db -c "SELECT 1;"
   
   # If password wrong, update:
   sudo -u postgres psql -c "ALTER USER forum_user WITH PASSWORD 'new_password';"
   ```

3. **Code build failed:**
   ```bash
   cd /opt/tor-gate
   npm ci              # Clean install
   npm run build       # Build TypeScript
   npm run db:migrate  # Run migrations
   
   sudo systemctl restart tor-gate
   ```

4. **Node.js not found:**
   ```bash
   which node
   node --version
   
   # If not found, install
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install nodejs
   ```

### Nginx not serving traffic

**Symptoms:**
```
curl: (7) Failed to connect to localhost port 80: Connection refused
```

**Diagnosis:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Check if listening on port 80
netstat -tlnp | grep :80

# Test configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
```

**Solutions:**

1. **Configuration error:**
   ```bash
   # Fix syntax errors
   sudo nginx -t
   
   # Reload configuration
   sudo systemctl reload nginx
   ```

2. **Port already in use:**
   ```bash
   # Find what's using port 80
   sudo lsof -i :80
   
   # Kill or move to different port
   sudo fuser -k 80/tcp
   sudo systemctl restart nginx
   ```

3. **Permissions issue:**
   ```bash
   # Check Nginx user
   ps aux | grep nginx
   
   # Check socket permissions
   ls -la /run/php-fpm-flarum.sock
   
   # Fix permissions
   sudo usermod -a -G forum www-data
   sudo chmod g+rx /opt/flarum
   ```

### PostgreSQL not responding

**Symptoms:**
```
psql: could not connect to server: Connection refused
```

**Diagnosis:**
```bash
# Check service status
sudo systemctl status postgresql

# Check if listening
sudo netstat -tlnp | grep 5432

# Check logs
sudo tail -f /var/log/postgresql/postgresql.log
```

**Solutions:**

1. **Service not running:**
   ```bash
   # Start PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   
   # Verify
   sudo systemctl status postgresql
   ```

2. **Corrupted database:**
   ```bash
   # Stop service
   sudo systemctl stop postgresql
   
   # Reinitialize (warning: deletes all data)
   sudo -u postgres /usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/14/main
   
   # Restore from backup
   cd /opt/backups
   tar -xzf forum_backup_YYYYMMDD_HHMMSS.tar.gz
   sudo -u postgres psql -d forum_db < forum_db.sql
   
   # Restart
   sudo systemctl start postgresql
   ```

3. **Disk full:**
   ```bash
   # Check disk usage
   df -h
   
   # Clean up old backups
   find /opt/backups -name "*.tar.gz" -mtime +7 -delete
   
   # Check log files
   ls -lah /var/log/postgresql/
   ```

---

## Authentication Issues

### User cannot authenticate (stuck on delay gate)

**Symptoms:**
```
Page shows: "Waiting for security delay... (15s remaining)"
But timer never decreases or gets stuck
```

**Diagnosis:**
```bash
# Check tor-gate logs
journalctl -u tor-gate | grep delay

# Check if backend is responding
curl http://localhost:5000/health

# Check Nginx logs
tail -f /var/log/nginx/tor-gate-access.log
```

**Solutions:**

1. **Backend timeout:**
   ```bash
   # Increase Nginx timeouts
   sudo nano /etc/nginx/sites-available/tor-gate
   
   # Change:
   proxy_connect_timeout 120s;
   proxy_send_timeout 120s;
   proxy_read_timeout 120s;
   
   # Reload
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Too many requests:**
   ```bash
   # Check rate limiting in nginx
   tail -f /var/log/nginx/tor-gate-error.log | grep "limiting"
   
   # Increase rate limits in /etc/nginx/sites-available/tor-gate
   limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;
   ```

3. **Browser cache:**
   - Open DevTools
   - Go to Network tab
   - Disable cache
   - Reload page

### PoW challenge not solving

**Symptoms:**
```
Page shows: "Solving proof-of-work challenge..."
Challenge never completes or times out
```

**Diagnosis:**
```bash
# Check browser console for errors
# Open DevTools → Console
# Look for JavaScript errors

# Check if backend PoW endpoint working
curl -X POST http://localhost:5000/pow-challenge

# Check tor-gate logs
journalctl -u tor-gate | grep pow
```

**Solutions:**

1. **Browser too slow:**
   - Close other tabs/applications
   - Use faster browser (Chrome > Firefox > Safari)
   - Refresh page and try again

2. **Backend PoW issue:**
   ```bash
   # Check if PoW endpoint responds
   curl -X POST http://localhost:5000/pow-challenge
   
   # Should return JSON with challenge
   
   # If error, check logs:
   journalctl -u tor-gate -f
   ```

3. **Network latency:**
   - Check internet connection
   - Try connecting from different network
   - Check if firewall blocking

### Captcha not displaying

**Symptoms:**
```
Captcha image shows broken/404
Cannot read captcha text
```

**Diagnosis:**
```bash
# Check if captcha file exists
ls -la /opt/tor-gate/public/captcha/

# Check if endpoint responds
curl http://localhost/captcha/generate

# Check tor-gate logs
journalctl -u tor-gate | grep captcha
```

**Solutions:**

1. **Missing captcha files:**
   ```bash
   # Generate test captcha
   ls /opt/tor-gate/public/
   
   # If captcha directory missing, create it
   mkdir -p /opt/tor-gate/public/captcha
   chmod 755 /opt/tor-gate/public/captcha
   ```

2. **Endpoint not working:**
   ```bash
   # Restart tor-gate
   sudo systemctl restart tor-gate
   
   # Check if port 5000 accessible
   curl http://localhost:5000/captcha/generate
   ```

---

## Admin Access Issues

### Cannot request admin step-up (404 error)

**Symptoms:**
```
POST /admin/step-up-init → 404 Not Found
```

**Diagnosis:**
```bash
# Check admin routes registered
grep -n "step-up-init" /opt/tor-gate/server/routes/admin.ts

# Check routes loaded
journalctl -u tor-gate | grep "admin"

# Verify endpoint syntax
curl -X POST http://localhost/admin/step-up-init
```

**Solutions:**

1. **Routes not registered:**
   ```bash
   # Check if admin.ts is imported in routes.ts
   grep "admin" /opt/tor-gate/server/routes.ts
   
   # Should have:
   import { registerAdminRoutes } from "./routes/admin"
   registerAdminRoutes(app)
   
   # If missing, add and rebuild
   npm run build
   sudo systemctl restart tor-gate
   ```

2. **Old code still running:**
   ```bash
   # Verify fresh build
   rm -rf /opt/tor-gate/dist/
   npm run build
   sudo systemctl restart tor-gate
   ```

### Admin step-up returns "Admin user not found"

**Symptoms:**
```json
{
  "error": "Admin user not found"
}
```

**Diagnosis:**
```bash
# Check if admin user exists in database
psql -U forum_user -d forum_db -c "SELECT * FROM admin_users;"

# Check spelling of admin username
echo "Trippies" | md5sum  # to verify exact string
```

**Solutions:**

1. **Admin never seeded:**
   ```bash
   # Create admin user
   cd /opt/tor-gate
   npx ts-node server/scripts/seed-admin.ts
   
   # Verify created
   psql -U forum_user -d forum_db -c "SELECT * FROM admin_users;"
   ```

2. **Database schema issue:**
   ```bash
   # Check if table exists
   psql -U forum_user -d forum_db -c "\dt admin_users"
   
   # If not, run migration
   cd /opt/tor-gate
   npm run db:migrate
   
   # Re-seed admin
   npx ts-node server/scripts/seed-admin.ts
   ```

### Admin credentials rejected (invalid password)

**Symptoms:**
```json
{
  "error": "Invalid credentials"
}
```

**Diagnosis:**
```bash
# Verify admin password hash in database
psql -U forum_user -d forum_db -c "SELECT username, password_hash FROM admin_users WHERE username='Trippies';"

# Test bcrypt locally
node -e "require('bcrypt').compare('Qzz908kasr15!', '\$2b\$12\$...').then(console.log)"
```

**Solutions:**

1. **Wrong password entered:**
   - Password is case-sensitive
   - Verify exactly: `Qzz908kasr15!`
   - Note: Contains capital Q, numbers, and exclamation mark

2. **Hash corrupted:**
   ```bash
   # Reset password
   node << 'EOF'
   const bcrypt = require('bcrypt');
   bcrypt.hash('Qzz908kasr15!', 12).then(hash => {
     console.log("UPDATE admin_users SET password_hash = '" + hash + "' WHERE username='Trippies';");
   });
   EOF
   
   # Run the UPDATE query in psql
   ```

### Admin GPG signature fails

**Symptoms:**
```json
{
  "error": "Invalid GPG signature"
}
```

**Diagnosis:**
```bash
# Verify GPG key fingerprint
gpg --list-keys Trippies

# Should show: DABAE797242CC5B30ED062A2988B42DDC3066B6E

# Check if stored public key matches
psql -U forum_user -d forum_db -c "SELECT public_gpg_key FROM admin_users WHERE username='Trippies';"

# Try signing locally
echo "test challenge" | gpg --sign --armor --default-key DABAE797242CC5B30ED062A2988B42DDC3066B6E
```

**Solutions:**

1. **GPG key not imported:**
   ```bash
   # Import key
   gpg --import << 'EOF'
   -----BEGIN PGP PUBLIC KEY BLOCK-----
   [paste key from ADMIN-SECURITY.md]
   -----END PGP PUBLIC KEY BLOCK-----
   EOF
   
   # Verify fingerprint
   gpg --list-keys Trippies
   ```

2. **Wrong key used for signing:**
   ```bash
   # Check default signing key
   gpg --list-keys | grep -A1 "uid"
   
   # Explicitly use correct key
   echo -n "challenge" | gpg --sign --armor --default-key DABAE797242CC5B30ED062A2988B42DDC3066B6E
   ```

3. **Challenge expired:**
   - Challenge valid for 5 minutes only
   - Request new challenge from /admin/step-up-init

4. **Signature format wrong:**
   ```bash
   # Ensure plain text signature (not binary)
   echo -n "challenge" | gpg --sign --armor ...  # NOT --output
   
   # Copy entire signature including BEGIN/END lines
   ```

### Admin token expired

**Symptoms:**
```
Cannot access /admin/panel
Redirected to login
```

**Diagnosis:**
```bash
# Check token in browser cookies
# DevTools → Application → Cookies

# Check token expiration
curl http://localhost/admin/check-access \
  -H "Cookie: adminToken=..."
```

**Solutions:**

1. **Token older than 30 minutes:**
   - Re-authenticate with admin step-up
   - Tokens expire after 30 minutes for security

2. **Token invalid/revoked:**
   - Logout and login again
   - Clear browser cookies

---

## Database Issues

### Database connection pool exhausted

**Symptoms:**
```
Error: too many connections
Error: ECONNREFUSED at 127.0.0.1:5432
```

**Diagnosis:**
```bash
# Check active connections
sudo -u postgres psql -d forum_db -c "SELECT count(*) FROM pg_stat_activity;"

# See who's connected
sudo -u postgres psql -d forum_db -c "SELECT * FROM pg_stat_activity;"
```

**Solutions:**

1. **Too many tor-gate instances:**
   ```bash
   # Check running processes
   ps aux | grep node | grep -v grep
   
   # Kill extra processes
   pkill -f "tor-gate"
   sudo systemctl restart tor-gate
   ```

2. **Connection leak in code:**
   ```bash
   # Monitor connections over time
   watch "psql -U forum_user -d forum_db -c 'SELECT count(*) FROM pg_stat_activity;'"
   
   # If growing, connection not being released
   # Check code for missing .end() or .close() calls
   ```

3. **Increase connection pool:**
   ```bash
   # Edit /etc/postgresql/14/main/postgresql.conf
   sudo nano /etc/postgresql/14/main/postgresql.conf
   
   # Change:
   max_connections = 200
   
   # Restart
   sudo systemctl restart postgresql
   ```

### Slow database queries

**Symptoms:**
```
Admin authentication taking 5+ seconds
API endpoints timing out
```

**Diagnosis:**
```bash
# Enable query logging
sudo -u postgres psql -d forum_db -c "ALTER DATABASE forum_db SET log_min_duration_statement=1000;"

# Check logs
sudo tail -f /var/log/postgresql/postgresql.log | grep "duration:"

# Analyze slow query
sudo -u postgres psql -d forum_db -c "EXPLAIN ANALYZE SELECT ..."
```

**Solutions:**

1. **Missing database indexes:**
   ```bash
   # Run migrations to create indexes
   cd /opt/tor-gate
   npm run db:migrate
   
   # Verify indexes exist
   sudo -u postgres psql -d forum_db -c "\d admin_users"
   ```

2. **Outdated query statistics:**
   ```bash
   # Refresh statistics
   sudo -u postgres psql -d forum_db -c "VACUUM ANALYZE;"
   ```

---

## Nginx/Proxy Issues

### Flarum directly accessible (bypasses tor-gate)

**Symptoms:**
```
Can reach http://localhost:9001 directly (should NOT work)
```

**This is CRITICAL SECURITY ISSUE!**

**Solution:**

1. **Ensure Flarum only listens on localhost:**
   ```bash
   # Check /etc/nginx/sites-available/flarum-internal
   # Should have: listen 127.0.0.1:9001
   
   # NOT: listen 0.0.0.0:9001 or listen 9001
   
   sudo systemctl restart nginx
   ```

2. **Verify with:**
   ```bash
   # This should fail
   curl http://192.168.1.100:9001/
   
   # This works (only from localhost)
   ssh user@server "curl http://localhost:9001/"
   ```

### Reverse proxy not forwarding headers

**Symptoms:**
```
Flarum cannot verify X-Verified-By header
Admin guard fails
```

**Diagnosis:**
```bash
# Check what headers tor-gate sends
curl -v http://localhost/health | grep "X-"

# Check what Nginx receives
sudo tail -f /var/log/nginx/flarum-access.log | grep "X-"
```

**Solutions:**

1. **Missing fastcgi_param in Nginx:**
   ```bash
   # Check /etc/nginx/sites-available/flarum-internal
   
   # Should have:
   fastcgi_param HTTP_X_VERIFIED_BY $http_x_verified_by;
   fastcgi_param HTTP_X_VERIFIED_USER $http_x_verified_user;
   fastcgi_param HTTP_X_ADMIN_MODE $http_x_admin_mode;
   
   # If missing, add and reload Nginx
   sudo systemctl reload nginx
   ```

### SSL certificate issues

**Symptoms:**
```
WARNING: Potential security vulnerability (browser warning)
Certificate expired
```

**Diagnosis:**
```bash
# Check certificate validity
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep -E "Not|Subject"

# Check certificate chain
openssl s_client -connect your-domain.com:443
```

**Solutions:**

1. **Certificate expired:**
   ```bash
   # Generate new certificate
   sudo certbot renew --force-renewal
   
   # Or manually
   openssl req -x509 -newkey rsa:4096 \
     -keyout /etc/nginx/ssl/key.pem \
     -out /etc/nginx/ssl/cert.pem \
     -days 365 -nodes
   
   # Reload Nginx
   sudo systemctl reload nginx
   ```

---

## Performance Issues

### High CPU usage

**Symptoms:**
```
CPU constantly at 80-100%
tor-gate process consuming lots of CPU
```

**Diagnosis:**
```bash
# Check top processes
top -b -n 1 | head -20

# Check tor-gate specifically
ps aux | grep node

# Monitor in real-time
watch "ps aux | grep node | grep -v grep"

# Check for infinite loops
strace -p $(pgrep node) -c
```

**Solutions:**

1. **PoW computation too expensive:**
   ```bash
   # Reduce difficulty in tor-gate config
   # Edit /opt/tor-gate/server/config.ts
   
   # POW_DIFFICULTY = 20  (reduce from 24)
   
   npm run build
   sudo systemctl restart tor-gate
   ```

2. **Too many connections:**
   ```bash
   # Check connections
   netstat -an | grep ESTABLISHED | wc -l
   
   # Increase connection handling
   # Edit Nginx config: worker_connections
   ```

### High memory usage

**Symptoms:**
```
Memory usage growing over time
Reaches 90%+ and doesn't decrease
```

**Diagnosis:**
```bash
# Check memory usage
free -h

# Check tor-gate process
ps aux | grep node

# Monitor growth
watch "free -h && ps aux | grep node"
```

**Solutions:**

1. **Memory leak in Node.js:**
   ```bash
   # Heap snapshot
   node --inspect --expose-gc /opt/tor-gate/dist/server/index.js
   
   # Open chrome://inspect
   # Take heap snapshots
   # Look for growing objects
   ```

2. **Too many stored sessions/tokens:**
   ```bash
   # Check in-memory storage
   # Edit /opt/tor-gate/server/storage.ts
   
   # Ensure cleanup runs:
   setInterval(() => { cleanup() }, 60000)
   
   npm run build
   sudo systemctl restart tor-gate
   ```

---

## Security Issues

### Unauthorized access to admin panel

**Symptoms:**
```
Attacker accessing /admin/panel without credentials
User gaining admin access without step-up
```

**Response (CRITICAL):**

1. **Immediate actions:**
   ```bash
   # Kill all sessions
   psql -U forum_user -d forum_db -c "DELETE FROM admin_tokens;"
   
   # Disable admin account
   psql -U forum_user -d forum_db -c "UPDATE admin_users SET is_active=false WHERE username='Trippies';"
   
   # Restart services
   sudo systemctl restart tor-gate nginx
   ```

2. **Investigation:**
   ```bash
   # Check access logs
   grep "admin" /var/log/nginx/tor-gate-access.log | tail -100
   
   # Check tor-gate logs
   journalctl -u tor-gate | grep "admin"
   
   # Identify attacker IP
   awk '{print $1}' /var/log/nginx/tor-gate-access.log | sort | uniq -c
   ```

3. **Countermeasures:**
   ```bash
   # Block attacker IP
   sudo ufw deny from 192.168.1.100
   
   # Or in Nginx
   # Add to server block:
   deny 192.168.1.100;
   ```

4. **Audit:**
   - Check if private keys compromised
   - Change all admin passwords
   - Review and rotate credentials
   - Update firewall rules

### Brute-force attacks detected

**Symptoms:**
```
Many failed admin authentication attempts from single IP
Repeated "Invalid credentials" errors in logs
```

**Response:**

1. **Identify attacker:**
   ```bash
   # Find IPs with many failed attempts
   grep "Failed admin" /var/log/nginx/tor-gate-access.log | awk '{print $1}' | sort | uniq -c | sort -rn
   ```

2. **Block attacker:**
   ```bash
   # Firewall
   sudo ufw deny from 192.168.1.100
   
   # Or rate limit more strictly in Nginx
   limit_req_zone $binary_remote_addr zone=login:10m rate=3r/m;
   ```

3. **Monitor:**
   ```bash
   # Watch for continued attacks
   tail -f /var/log/nginx/tor-gate-access.log | grep "Failed admin"
   ```

### DDoS attack

**Symptoms:**
```
Massive traffic spike
Many requests from different IPs
Service becomes unresponsive
```

**Response:**

1. **Enable rate limiting (already configured):**
   ```bash
   # Nginx rate limits should kick in
   # Check:
   tail -f /var/log/nginx/tor-gate-error.log | grep "limiting"
   ```

2. **Increase rate limit thresholds:**
   ```bash
   # Edit /etc/nginx/sites-available/tor-gate
   limit_req zone=general burst=20 nodelay;  # was 50
   
   # Reload
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. **Use external DDoS protection:**
   - Cloudflare
   - AWS Shield
   - DigitalOcean DDoS Protection

---

## Common Error Messages

### "413 Payload Too Large"
```
POST request with large body rejected
```
**Fix:** Increase `client_max_body_size` in Nginx
```
client_max_body_size 100m;
```

### "502 Bad Gateway"
```
Nginx cannot reach tor-gate backend
```
**Fix:**
```bash
sudo systemctl status tor-gate
curl http://localhost:5000/health
```

### "504 Gateway Timeout"
```
tor-gate taking too long to respond
```
**Fix:** Increase timeouts
```nginx
proxy_connect_timeout 120s;
proxy_read_timeout 120s;
```

### "Connection refused"
```
Cannot connect to backend service
```
**Fix:** Service not running
```bash
sudo systemctl start tor-gate postgresql nginx
```

### "ENOENT: no such file or directory"
```
Application file or config missing
```
**Fix:** Verify directory structure
```bash
ls -la /opt/tor-gate/
ls -la /opt/flarum/
```

---

## Getting Help

If issue not resolved:

1. **Collect logs:**
   ```bash
   journalctl -u tor-gate -n 100 > /tmp/tor-gate.log
   tail -100 /var/log/nginx/*.log > /tmp/nginx.log
   sudo tail -100 /var/log/postgresql/*.log > /tmp/postgresql.log
   ```

2. **System info:**
   ```bash
   uname -a > /tmp/system.info
   df -h >> /tmp/system.info
   free -h >> /tmp/system.info
   ```

3. **Service status:**
   ```bash
   check-services > /tmp/services.status
   ```

4. **Share logs** (without sensitive data) with support

---

**Last Updated**: 2024
**Status**: Production-Ready
