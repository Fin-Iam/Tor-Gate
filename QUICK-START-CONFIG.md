# Quick Start - Configuration & Customization

## 30-Second Setup

```bash
# 1. Copy configuration template
cp config.env.example config.env

# 2. Edit for your environment (optional - defaults work)
nano config.env

# 3. Run installer with configuration
sudo bash install-production.sh

# 4. Verify everything loaded
check-services
```

## Change the Loading GIF

### Option A: Environment Variable (Temporary)
```bash
export GIF_URL="https://your-gif-url.gif"
sudo systemctl restart tor-gate
```

### Option B: config.env (Permanent)
```bash
# Edit config.env
nano config.env

# Update line:
GIF_URL=https://your-custom-gif-url.gif

# Restart service
sudo systemctl restart tor-gate
```

## Common Configurations

### Custom Installation Path
```env
INSTALL_DIR=/custom/path/tor-gate
FLARUM_DIR=/custom/path/flarum
STORAGE_DIR=/custom/path/storage
LOG_DIR=/custom/path/logs
BACKUP_DIR=/custom/path/backups
```

### Different Database
```env
DB_HOST=db.example.com
DB_PORT=5432
DB_NAME=my_forum
DB_USER=myuser
DB_PASSWORD=MySecurePassword123!
```

### Custom Domain
```env
DOMAIN=my-forum.com
```

### Specific Software Versions
```env
NODE_VERSION=20
PHP_VERSION=8.3
POSTGRES_VERSION=16
```

## Configuration Categories

### 📁 Directory Paths
```env
INSTALL_DIR=/opt/tor-gate
FLARUM_DIR=/opt/flarum
STORAGE_DIR=/var/lib/tor-gate
LOG_DIR=/var/log/tor-gate
BACKUP_DIR=/opt/backups
```

### 👤 System User
```env
FORUM_USER=forum
FORUM_GROUP=forum
```

### 🌐 Network & Domain
```env
DOMAIN=forum.local
TORGATE_LISTEN_HOST=127.0.0.1
TORGATE_LISTEN_PORT=5000
FLARUM_LISTEN_HOST=127.0.0.1
FLARUM_LISTEN_PORT=9001
```

### 📦 Software Versions
```env
NODE_VERSION=18
PHP_VERSION=8.1
POSTGRES_VERSION=14
```

### 🗄️ Database Configuration
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=forum_db
DB_USER=forum_user
DB_PASSWORD=YOUR_SECURE_PASSWORD_HERE
```

### 💾 Backup Settings
```env
BACKUP_RETENTION_DAYS=7
BACKUP_SCHEDULE="0 2 * * *"
```

### 🎨 UI Customization
```env
GIF_URL=https://i.ibb.co/bRCX5wTQ/pak.gif
```

## Find and Host a Custom GIF

### Where to Find GIFs
- [Giphy](https://giphy.com/) - Search "retro loading"
- [Imgur](https://imgur.com/) - Upload your own
- [ImgBB](https://imgbb.com/) - Free hosting with direct URL
- [Tenor](https://tenor.com/) - Search GIFs

### Create a Direct URL

**ImgBB** (Recommended):
1. Go to https://imgbb.com/
2. Upload your GIF
3. Copy the "Direct URL" (ends in `.gif`)
4. Use in config.env: `GIF_URL=https://i.ibb.co/xxxxx/image.gif`

**Imgur** (Alternative):
1. Go to https://imgur.com/
2. Upload your GIF
3. Right-click → Get Image Link
4. Use in config.env: `GIF_URL=https://i.imgur.com/xxxxxx.gif`

### GIF Requirements
- ✅ Small file size (< 500KB)
- ✅ 80x80 to 120x120 pixels
- ✅ Loops infinitely
- ✅ Publicly accessible URL
- ✅ Retro/terminal aesthetic (recommended)

## Verify Configuration

```bash
# Check if config.env exists
ls -la config.env

# View active configuration
cat config.env

# Check if GIF URL is accessible
curl -I YOUR_GIF_URL

# Verify service is using config
grep "GIF_URL" /opt/tor-gate/.env
```

## Troubleshooting

### Config not loading
```bash
# Make sure file exists and is readable
ls -l config.env
chmod 644 config.env

# Check for syntax errors
bash -n config.env
```

### GIF not showing
```bash
# Verify URL works
curl -I https://your-gif-url.gif

# Check logs
journalctl -u tor-gate | grep -i gif

# Update and restart
nano config.env
sudo systemctl restart tor-gate
```

### Services not starting
```bash
# Check service status
sudo systemctl status tor-gate

# View error logs
journalctl -u tor-gate -f

# Verify all config values are valid
cat config.env
```

## Production Checklist

Before deploying:

```bash
# ✅ Copy config template
cp config.env.example config.env

# ✅ Update critical values
nano config.env

# ✅ Verify paths exist (create if needed)
sudo mkdir -p /opt/tor-gate /opt/flarum /var/log/tor-gate /opt/backups

# ✅ Test configuration syntax
source config.env && echo "Config OK"

# ✅ Check GIF URL accessibility
curl -I "$GIF_URL"

# ✅ Run installer
sudo bash install-production.sh

# ✅ Verify services started
sudo systemctl status tor-gate nginx postgresql

# ✅ Test UI loading
curl http://localhost/nojs | grep -i "loading\|gif"
```

## Environment Variable Alternative

If you prefer environment variables over config.env:

```bash
# Set environment variables
export INSTALL_DIR=/custom/path
export GIF_URL=https://my-gif-url.gif
export DB_PASSWORD=MyPassword123!

# Run installer (will use env vars)
sudo -E bash install-production.sh
```

## Deployment Scenarios

### Scenario 1: Default Installation (Ubuntu)
```bash
# Just use defaults
sudo bash install-production.sh
```

### Scenario 2: Custom Paths
```bash
cp config.env.example config.env
# Update paths in config.env
nano config.env
sudo bash install-production.sh
```

### Scenario 3: Custom GIF + Domain
```bash
cp config.env.example config.env
sed -i 's|GIF_URL=.*|GIF_URL=https://my-custom-gif.gif|' config.env
sed -i 's|DOMAIN=.*|DOMAIN=my-forum.com|' config.env
sudo bash install-production.sh
```

### Scenario 4: Complete Customization
```bash
cp config.env.example config.env
# Edit all values for your environment
nano config.env
sudo bash install-production.sh
```

## Advanced: CI/CD Integration

For automated deployments:

```yaml
# GitHub Actions Example
- name: Deploy tor-gate
  env:
    INSTALL_DIR: ${{ secrets.INSTALL_DIR }}
    GIF_URL: ${{ secrets.GIF_URL }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: |
    cp config.env.example config.env
    echo "INSTALL_DIR=$INSTALL_DIR" >> config.env
    echo "GIF_URL=$GIF_URL" >> config.env
    echo "DB_PASSWORD=$DB_PASSWORD" >> config.env
    sudo bash install-production.sh
```

---

**For more details**: See [CONFIG-GUIDE.md](./CONFIG-GUIDE.md)
**Questions?** Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
