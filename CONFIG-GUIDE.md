# Configuration & Customization Guide

## Environment Configuration

This project now supports environment configuration through `config.env` to avoid hardcoding values.

### Setup

1. **Copy the example configuration:**
   ```bash
   cp config.env.example config.env
   ```

2. **Edit config.env with your values:**
   ```bash
   nano config.env
   ```

### Configuration Options

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSTALL_DIR` | `/opt/tor-gate` | Installation directory for tor-gate |
| `FLARUM_DIR` | `/opt/flarum` | Installation directory for Flarum |
| `STORAGE_DIR` | `/var/lib/tor-gate` | Data storage directory |
| `LOG_DIR` | `/var/log/tor-gate` | Log file location |
| `BACKUP_DIR` | `/opt/backups` | Backup storage location |
| `FORUM_USER` | `forum` | System user for services |
| `FORUM_GROUP` | `forum` | System group for services |
| `DOMAIN` | `forum.local` | Forum domain name |
| `NODE_VERSION` | `18` | Node.js version to install |
| `PHP_VERSION` | `8.1` | PHP version to install |
| `POSTGRES_VERSION` | `14` | PostgreSQL version to install |
| `DB_HOST` | `localhost` | Database hostname |
| `DB_PORT` | `5432` | Database port |
| `DB_NAME` | `forum_db` | Database name |
| `DB_USER` | `forum_user` | Database user |
| `DB_PASSWORD` | `Change_This_Password_12345` | Database password ⚠️ **CHANGE THIS** |
| `GIF_URL` | `https://i.ibb.co/bRCX5wTQ/pak.gif` | Loading animation GIF URL |

### Using Configuration

The `install-production.sh` script automatically loads `config.env` if it exists:

```bash
cd /path/to/project
cp config.env.example config.env
# Edit config.env with your values
sudo bash install-production.sh
```

## UI Customization

### Loading Animation GIF

The no-JavaScript UI now displays a custom GIF instead of ASCII art during the loading phase.

#### Changing the GIF

1. **Option A: Environment Variable**
   ```bash
   export GIF_URL="https://your-custom-gif.com/animation.gif"
   ```

2. **Option B: config.env**
   ```env
   GIF_URL=https://your-custom-gif.com/animation.gif
   ```

3. **Option C: Direct Edit** (not recommended)
   Edit `torgate/server/nojs-routes.ts`:
   ```typescript
   const LOADING_GIF_URL = process.env.GIF_URL || 'https://your-gif-url';
   ```

#### GIF Requirements

- **Format**: GIF (with transparency support recommended)
- **Size**: 80x80px to 120x120px (will be scaled)
- **Animation**: Should loop infinitely
- **URL**: Must be publicly accessible
- **Hosting**: Can be any image hosting service (imgur, ibb.co, etc.)

#### Current GIF

The default GIF is hosted at: `https://i.ibb.co/bRCX5wTQ/pak.gif`

**To use a different GIF:**

```bash
# Find a retro/terminal-style GIF and get its public URL
# Update config.env
GIF_URL=https://your-gif-url.gif

# Restart tor-gate
sudo systemctl restart tor-gate
```

### No-JavaScript UI Styling

The no-JS UI now matches the JavaScript UI with:
- ✅ Terminal green color scheme (#0f0)
- ✅ CRT flicker effect
- ✅ Scanline animation
- ✅ Retro terminal aesthetic
- ✅ Consistent typography (VT323 + Share Tech Mono fonts)
- ✅ Dashed borders matching JS UI
- ✅ Proper spacing and hierarchy

#### CSS Customization

Edit `torgate/server/nojs-routes.ts` in the `htmlTemplate` function:

**Change colors:**
```typescript
// In the :root style section
--foreground: 120 100% 50%; /* Terminal Green - change here */
```

**Change fonts:**
```typescript
// Font imports
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap');

// Then use:
font-family: 'YOUR_FONT', monospace;
```

**Change border style:**
```typescript
border: 1px dashed #0f0; /* Change to: solid, dotted, etc. */
```

## Directory Structure

```
/opt/tor-gate/               # INSTALL_DIR
├── server/                  # Backend code
├── client/                  # React frontend
├── shared/                  # Shared types
├── dist/                    # Compiled code
└── deploy.sh               # Deployment script

/opt/flarum/                # FLARUM_DIR
├── public/                 # Web root
├── nojs/                   # No-JS fallback UI
├── storage/                # User data
└── extensions/             # Installed extensions

/var/lib/tor-gate/          # STORAGE_DIR
├── tokens/                 # Session tokens
├── challenges/             # Auth challenges
└── cache/                  # Temporary data

/var/log/tor-gate/          # LOG_DIR
├── access.log
├── error.log
└── app.log

/opt/backups/               # BACKUP_DIR
├── forum_backup_20240126.tar.gz
├── forum_backup_20240125.tar.gz
└── ...
```

## Production Checklist

Before deploying to production:

- [ ] Copy `config.env.example` to `config.env`
- [ ] Update all paths in `config.env` if using non-standard locations
- [ ] **CRITICAL**: Change `DB_PASSWORD` to a strong password
- [ ] Update `DOMAIN` to your actual domain
- [ ] Update `GIF_URL` if you have a custom loading animation
- [ ] Review all other configuration values
- [ ] Run `install-production.sh` with sudo
- [ ] Verify all services started: `systemctl status tor-gate nginx postgresql`
- [ ] Test the UI with and without JavaScript
- [ ] Check that loading GIF displays correctly

## Troubleshooting

### "config.env not found" warning

This is safe to ignore. The script will use default values if `config.env` doesn't exist.

To remove the warning, create the file:
```bash
cp config.env.example config.env
```

### GIF not loading

1. Check URL is accessible:
   ```bash
   curl -I https://your-gif-url.gif
   ```

2. Verify URL in logs:
   ```bash
   grep "GIF_URL" install-production.sh
   ```

3. Update to a working GIF:
   ```bash
   # Edit config.env
   GIF_URL=https://i.ibb.co/bRCX5wTQ/pak.gif
   
   # Restart
   sudo systemctl restart tor-gate
   ```

### Paths not found

If using non-standard installation paths:

1. Update `config.env`:
   ```env
   INSTALL_DIR=/custom/path/tor-gate
   FLARUM_DIR=/custom/path/flarum
   ```

2. Create directories manually:
   ```bash
   sudo mkdir -p /custom/path/{tor-gate,flarum}
   sudo chown -R forum:forum /custom/path
   ```

3. Run installer with sudo

## Deployment Example

### Ubuntu/Debian

```bash
# 1. Clone/copy project
cd /home/user/myproject

# 2. Prepare configuration
cp config.env.example config.env
nano config.env

# 3. Run installer
sudo bash install-production.sh

# 4. Verify
check-services

# 5. Start services
sudo systemctl start tor-gate nginx postgresql
```

### CentOS/RHEL

```bash
# Same steps, but installer handles yum instead of apt
sudo bash install-production.sh
```

---

**Need Help?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues.
