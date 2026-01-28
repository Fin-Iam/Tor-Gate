# Production Deployment Checklist

## Pre-Deployment (1-2 weeks before)

### Planning & Architecture Review
- [ ] Security audit by external party (recommended)
- [ ] Load testing and capacity planning
- [ ] Disaster recovery plan documented
- [ ] Monitoring strategy defined
- [ ] Backup retention policy documented
- [ ] Admin on-call rotation established

### Infrastructure Preparation
- [ ] Server provisioned (Ubuntu 20.04+ / CentOS 7+ / openSUSE 15+)
- [ ] 2GB+ RAM verified
- [ ] 10GB+ disk space verified
- [ ] Static IP address assigned
- [ ] Domain name secured and configured
- [ ] DNS records prepared (A, CNAME records)
- [ ] Network access verified (ports 80, 443 allowed)

### Security Certificates
- [ ] Let's Encrypt domain validation setup
- [ ] SSL certificate ordering process initiated
- [ ] Certificate renewal automation planned
- [ ] Certificate backup location prepared

### Team & Communication
- [ ] Deployment team identified
- [ ] Communication channels established (Slack, Discord, etc.)
- [ ] Rollback procedures documented
- [ ] Emergency contacts listed

---

## Installation Phase (Day of Deployment)

### System Setup
- [ ] Run `sudo bash install-production.sh`
- [ ] Verify all components installed:
  ```bash
  node --version
  psql --version
  php --version
  nginx -v
  ```
- [ ] Verify ports listening:
  ```bash
  netstat -tlnp | grep -E ":(80|443|5000|9001|5432)"
  ```

### Database Setup
- [ ] **CRITICAL**: Change PostgreSQL password from default
  ```bash
  sudo -u postgres psql -c "ALTER USER forum_user WITH PASSWORD 'YOUR_SECURE_PASSWORD';"
  ```
- [ ] Update password in `/etc/systemd/system/tor-gate.service`
  ```bash
  sudo systemctl daemon-reload
  ```
- [ ] Verify database connection:
  ```bash
  psql -U forum_user -d forum_db -c "SELECT 1;"
  ```

### Application Code Deployment
- [ ] Copy tor-gate source to `/opt/tor-gate/`
  ```bash
  sudo cp -r /path/to/torgate/* /opt/tor-gate/
  sudo chown -R forum:forum /opt/tor-gate
  ```
- [ ] Copy Flarum source to `/opt/flarum/`
  ```bash
  sudo cp -r /path/to/flarum/* /opt/flarum/
  sudo chown -R forum:forum /opt/flarum
  ```
- [ ] Verify correct directory permissions:
  ```bash
  ls -la /opt/tor-gate | head
  ls -la /opt/flarum | head
  ```

### Dependencies Installation
- [ ] Install npm dependencies
  ```bash
  cd /opt/tor-gate
  npm ci  # Use ci for production (not install)
  ```
- [ ] Build TypeScript
  ```bash
  npm run build
  ```
- [ ] Verify build succeeded:
  ```bash
  ls -la dist/
  ```

### Database Migrations
- [ ] Run database migrations
  ```bash
  npm run db:migrate
  ```
- [ ] Verify tables created:
  ```bash
  psql -U forum_user -d forum_db -c "\dt"
  ```

### Admin User Setup
- [ ] Seed admin user "Trippies"
  ```bash
  npx ts-node server/scripts/seed-admin.ts
  ```
- [ ] Verify admin created:
  ```bash
  psql -U forum_user -d forum_db -c "SELECT username, is_active FROM admin_users;"
  ```

### SSL/TLS Setup
- [ ] Generate or obtain SSL certificates
  ```bash
  # Option 1: Self-signed (dev only)
  openssl req -x509 -newkey rsa:4096 -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem -days 365 -nodes
  
  # Option 2: Let's Encrypt (production)
  sudo apt install certbot python3-certbot-nginx
  sudo certbot certonly --nginx -d your-domain.com
  ```
- [ ] Update Nginx config with SSL paths
- [ ] Verify certificate validity:
  ```bash
  openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep -E "Subject:|Not Before|Not After"
  ```

### Service Startup
- [ ] Enable tor-gate service
  ```bash
  sudo systemctl enable tor-gate
  ```
- [ ] Start tor-gate service
  ```bash
  sudo systemctl start tor-gate
  ```
- [ ] Verify tor-gate running
  ```bash
  sudo systemctl status tor-gate
  ```
- [ ] Check tor-gate logs
  ```bash
  journalctl -u tor-gate -f
  ```
- [ ] Verify tor-gate responding
  ```bash
  curl http://localhost:5000/health
  ```
- [ ] Verify Nginx running
  ```bash
  sudo systemctl status nginx
  ```
- [ ] Test Nginx reverse proxy
  ```bash
  curl -I http://localhost/health
  ```

### Health Checks
- [ ] Run service check script
  ```bash
  check-services
  ```
- [ ] Verify all ports listening correctly
- [ ] Check database connectivity
- [ ] Check file permissions are correct

---

## Pre-Public Launch

### Smoke Testing (Internal Only)
- [ ] Test complete authentication flow
  1. Visit http://localhost/ (or internal IP)
  2. Complete delay gate
  3. Solve PoW challenge
  4. Enter captcha
  5. Sign GPG challenge
  6. Verify authenticated

- [ ] Test admin access
  1. Complete regular auth
  2. Request /admin/step-up-init
  3. Sign challenge with admin GPG key
  4. Verify admin token received
  5. Access /admin/panel

- [ ] Test error conditions
  - Invalid password
  - Invalid GPG signature
  - Expired token
  - Missing headers

### Performance Testing
- [ ] Test under normal load (100 concurrent users)
- [ ] Monitor resource usage
  ```bash
  watch free -h
  watch ps aux
  ```
- [ ] Check response times (should be < 2 seconds)
- [ ] Verify no memory leaks
- [ ] Verify no database connection exhaustion

### Security Testing
- [ ] Test that Flarum unreachable directly
  ```bash
  # Should fail - Flarum only on localhost:9001
  curl http://localhost:9001/
  ```
- [ ] Test that admin requires both factors
  - Wrong password → deny
  - Valid password + invalid signature → deny
  - Valid password + valid signature → allow
- [ ] Test token expiration
- [ ] Test firewall rules
  ```bash
  sudo ufw status
  ```

### Backup & Recovery Testing
- [ ] Create test backup
  ```bash
  sudo backup-forum
  ```
- [ ] Verify backup file exists and is not empty
  ```bash
  ls -lh /opt/backups/
  ```
- [ ] Test backup restoration on separate system
- [ ] Document restore procedure
- [ ] Verify cron job configured
  ```bash
  crontab -l
  ```

### Monitoring Setup
- [ ] Configure log rotation
  ```bash
  sudo logrotate -f /etc/logrotate.d/nginx
  ```
- [ ] Set up log monitoring
  ```bash
  tail -f /var/log/nginx/tor-gate-access.log
  tail -f /var/log/nginx/tor-gate-error.log
  ```
- [ ] Configure system alerts
  - CPU > 80%
  - Memory > 90%
  - Disk > 80%
  - Service down

---

## Launch Day

### Final Pre-Launch Checks (30 minutes before)
- [ ] All systems green:
  ```bash
  check-services
  ```
- [ ] No errors in logs:
  ```bash
  journalctl -u tor-gate | tail -20
  tail -20 /var/log/nginx/tor-gate-error.log
  ```
- [ ] Database responding:
  ```bash
  psql -U forum_user -d forum_db -c "SELECT count(*) FROM admin_users;"
  ```
- [ ] Team ready and on standby
- [ ] Communication channels active
- [ ] Rollback plan reviewed

### Launch (Make Services Public)
- [ ] DNS updated to point to server
  ```bash
  nslookup your-domain.com
  ```
- [ ] Wait for DNS propagation (5-15 minutes)
- [ ] Test external access
  ```bash
  curl http://your-domain.com/health
  ```
- [ ] Verify SSL certificate valid
  ```bash
  openssl s_client -connect your-domain.com:443
  ```
- [ ] Announce service is live

### Post-Launch Monitoring (First 24 Hours)
- [ ] Monitor error logs closely:
  ```bash
  journalctl -u tor-gate -f
  tail -f /var/log/nginx/tor-gate-error.log
  tail -f /var/log/nginx/flarum-error.log
  ```
- [ ] Monitor performance metrics
- [ ] Monitor user authentication flow
- [ ] Monitor admin access logs
- [ ] Check for DDoS/attack patterns
- [ ] Maintain on-call presence

### Post-Launch Monitoring (First Week)
- [ ] Daily backup verification
- [ ] Daily log review for errors
- [ ] Daily performance metrics review
- [ ] Weekly security audit of logs
- [ ] Weekly admin access review

---

## Post-Deployment

### Documentation & Handoff
- [ ] Update runbooks with actual values
- [ ] Document any deviations from standard setup
- [ ] Create operation manual
- [ ] Train support team
- [ ] Set up knowledge base articles

### Ongoing Maintenance
- [ ] Set up automated monitoring alerts
- [ ] Configure daily backup schedules
- [ ] Plan regular security updates
- [ ] Schedule quarterly backups to offline storage
- [ ] Plan quarterly security audits
- [ ] Plan quarterly disaster recovery drills

### Metrics & Reporting
- [ ] Track uptime (target: 99.5%)
- [ ] Track average response time
- [ ] Track error rates
- [ ] Track user authentication success rates
- [ ] Track admin access patterns

---

## Emergency Procedures

### If tor-gate crashes:
```bash
# Check service status
sudo systemctl status tor-gate

# Check logs
journalctl -u tor-gate -f

# Restart service
sudo systemctl restart tor-gate

# If restart fails, check database connection
psql -U forum_user -d forum_db -c "SELECT 1;"

# If DB down, restart PostgreSQL
sudo systemctl restart postgresql
```

### If Nginx crashes:
```bash
# Test configuration
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Verify
curl http://localhost/health
```

### If database corrupts:
```bash
# Restore from backup
sudo /usr/local/bin/backup-forum  # Create new backup first
# Restore: tar -xzf /opt/backups/forum_backup_YYYYMMDD_HHMMSS.tar.gz
```

### If compromised:
1. Isolate server (firewall off internet)
2. Make copies of logs and data
3. Investigate breach
4. Change all credentials
5. Rebuild from clean backup
6. Resume service

---

## Rollback Procedure (If Critical Issues)

If deployment has critical issues:

```bash
# 1. Stop services
sudo systemctl stop tor-gate
sudo systemctl stop nginx

# 2. Restore from pre-deployment backup
cd /tmp
tar -xzf /opt/backups/forum_backup_BEFORE_DEPLOY.tar.gz

# 3. Restore database
sudo -u postgres psql forum_db < forum_db.sql

# 4. Restore code
sudo cp -r flarum/* /opt/flarum/
sudo cp -r tor-gate/* /opt/tor-gate/

# 5. Restart services
sudo systemctl start tor-gate
sudo systemctl start nginx

# 6. Verify
check-services

# 7. Investigate what went wrong
journalctl -u tor-gate
tail -f /var/log/nginx/*.log
```

---

## Sign-Off

- [ ] **Deployment Lead**: ________________  Date: ______
- [ ] **System Administrator**: ________________  Date: ______
- [ ] **Security Officer**: ________________  Date: ______
- [ ] **Operations Manager**: ________________  Date: ______

---

## Post-Launch Notes

Document any issues encountered, workarounds used, or improvements needed:

```
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
```

---

**Generated**: $(date)
**Version**: 1.0
**Status**: Ready for Production
