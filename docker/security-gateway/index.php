<?php
/**
 * Security Gateway for Flarum Forum (No JavaScript Version)
 * 3-Layer Security: DDOS Protection, Captcha, GPG Auth
 */

session_start();

// Configuration
define('ONION_URL', getenv('ONION_URL') ?: 'hiynu3jeowprbbp2haydjrakwmyjrf2ltqebplixdbgew7l33hfsjbad.onion');
define('MIN_WAIT', 5);
define('MAX_WAIT', 45);
define('POW_DIFFICULTY', 4);

// Database connection
function getDB(): PDO {
    static $pdo;
    if (!$pdo) {
        $host = getenv('DB_HOST') ?: 'mariadb';
        $db = getenv('DB_DATABASE') ?: 'flarum';
        $user = getenv('DB_USERNAME') ?: 'flarum';
        $pass = getenv('DB_PASSWORD') ?: '';
        
        $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    }
    return $pdo;
}

// Rate limiting
function checkRateLimit(string $ip, string $endpoint, int $maxRequests = 30, int $windowSeconds = 60): bool {
    $db = getDB();
    
    $stmt = $db->prepare("SELECT request_count, window_start FROM security_rate_limits WHERE ip_address = ? AND endpoint = ?");
    $stmt->execute([$ip, $endpoint]);
    $record = $stmt->fetch();
    
    $now = new DateTime();
    
    if (!$record) {
        $stmt = $db->prepare("INSERT INTO security_rate_limits (ip_address, endpoint, request_count, window_start) VALUES (?, ?, 1, NOW())");
        $stmt->execute([$ip, $endpoint]);
        return true;
    }
    
    $windowStart = new DateTime($record['window_start']);
    $diff = $now->getTimestamp() - $windowStart->getTimestamp();
    
    if ($diff > $windowSeconds) {
        $stmt = $db->prepare("UPDATE security_rate_limits SET request_count = 1, window_start = NOW() WHERE ip_address = ? AND endpoint = ?");
        $stmt->execute([$ip, $endpoint]);
        return true;
    }
    
    if ($record['request_count'] >= $maxRequests) {
        return false;
    }
    
    $stmt = $db->prepare("UPDATE security_rate_limits SET request_count = request_count + 1 WHERE ip_address = ? AND endpoint = ?");
    $stmt->execute([$ip, $endpoint]);
    return true;
}

// Log access
function logAccess(string $action, bool $success = true, ?string $username = null, ?array $metadata = null): void {
    $db = getDB();
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    $stmt = $db->prepare("INSERT INTO security_access_logs (ip_address, user_agent, action, username, success, metadata) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([$ip, $ua, $action, $username, $success ? 1 : 0, $metadata ? json_encode($metadata) : null]);
}

// Check if IP is blocked
function isBlocked(string $ip): bool {
    $db = getDB();
    $stmt = $db->prepare("SELECT 1 FROM security_blocked_ips WHERE ip_address = ? AND (blocked_until IS NULL OR blocked_until > NOW() OR is_permanent = 1)");
    $stmt->execute([$ip]);
    return (bool) $stmt->fetch();
}

// Verify Proof of Work
function verifyPow(string $challenge, string $nonce, int $difficulty): bool {
    $hash = hash('sha256', $challenge . $nonce);
    return str_starts_with($hash, str_repeat('0', $difficulty));
}

// GPG encryption using gnupg extension or shell
function encryptWithGPG(string $message, string $publicKey): ?string {
    // Create temp files
    $keyFile = tempnam(sys_get_temp_dir(), 'gpg_key_');
    $msgFile = tempnam(sys_get_temp_dir(), 'gpg_msg_');
    $outFile = tempnam(sys_get_temp_dir(), 'gpg_out_');
    
    file_put_contents($keyFile, $publicKey);
    file_put_contents($msgFile, $message);
    
    // Import key and encrypt
    $homeDir = sys_get_temp_dir() . '/gnupg_' . uniqid();
    mkdir($homeDir, 0700);
    
    $cmd = sprintf(
        'export GNUPGHOME=%s && gpg --batch --yes --import %s 2>/dev/null && gpg --batch --yes --trust-model always --armor --encrypt --recipient-file %s --output %s %s 2>/dev/null',
        escapeshellarg($homeDir),
        escapeshellarg($keyFile),
        escapeshellarg($keyFile),
        escapeshellarg($outFile),
        escapeshellarg($msgFile)
    );
    
    exec($cmd, $output, $returnCode);
    
    $result = null;
    if ($returnCode === 0 && file_exists($outFile)) {
        $result = file_get_contents($outFile);
    }
    
    // Cleanup
    @unlink($keyFile);
    @unlink($msgFile);
    @unlink($outFile);
    @exec("rm -rf " . escapeshellarg($homeDir));
    
    return $result;
}

// HTML template
function render(string $title, string $content, ?string $meta = null): void {
    ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <?= $meta ?>
    <title><?= htmlspecialchars($title) ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { max-width: 600px; width: 100%; border: 1px solid #0f0; padding: 30px; }
        h1 { text-align: center; margin-bottom: 20px; letter-spacing: 3px; }
        form { display: flex; flex-direction: column; gap: 15px; }
        input, textarea { width: 100%; padding: 10px; background: #111; border: 1px solid #0f0; color: #0f0; font-family: inherit; }
        button { padding: 12px; background: #0f0; color: #000; border: none; cursor: pointer; font-weight: bold; }
        .error { color: #f00; border-color: #f00; padding: 10px; margin-bottom: 15px; }
        .success { color: #0f0; padding: 10px; margin-bottom: 15px; border: 1px solid #0f0; }
        pre { background: #111; padding: 15px; overflow-x: auto; margin: 15px 0; font-size: 11px; }
        a { color: #0f0; }
        .ascii { white-space: pre; font-size: 10px; text-align: center; margin: 20px 0; }
        .timer { font-size: 2em; text-align: center; margin: 20px 0; }
        .hidden { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <?= $content ?>
    </div>
</body>
</html>
    <?php
    exit;
}

// Main routing
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$action = $_GET['action'] ?? 'start';

// Check if blocked
if (isBlocked($ip)) {
    render('Blocked', '<h1>ACCESS DENIED</h1><p>Your IP has been blocked.</p>');
}

// Rate limit
if (!checkRateLimit($ip, $action)) {
    render('Rate Limited', '<h1>TOO MANY REQUESTS</h1><p>Please wait before trying again.</p>');
}

switch ($action) {
    case 'start':
        // Stage 1: DDOS wait
        $waitTime = rand(MIN_WAIT, MAX_WAIT);
        $_SESSION['wait_until'] = time() + $waitTime;
        $_SESSION['stage'] = 'ddos';
        
        $meta = '<meta http-equiv="refresh" content="' . $waitTime . ';url=?action=captcha">';
        $content = <<<HTML
        <h1>SECURITY CHECK</h1>
        <div class="ascii">
    O
   /|\\
   / \\
  ANALYZING...
        </div>
        <p class="timer">Please wait {$waitTime} seconds</p>
        <noscript>
            <form action="?action=captcha" method="get">
                <input type="hidden" name="action" value="captcha">
                <button type="submit">CONTINUE</button>
            </form>
        </noscript>
HTML;
        logAccess('ddos_check');
        render('Security Check', $content, $meta);
        break;
        
    case 'captcha':
        if (!isset($_SESSION['wait_until']) || time() < $_SESSION['wait_until']) {
            header('Location: ?action=start');
            exit;
        }
        
        // Generate captcha
        $indices = [];
        while (count($indices) < 6) {
            $idx = rand(0, strlen(ONION_URL) - 1);
            if (!in_array($idx, $indices)) $indices[] = $idx;
        }
        sort($indices);
        $_SESSION['captcha_indices'] = $indices;
        $_SESSION['stage'] = 'captcha';
        
        $masked = str_split(ONION_URL);
        foreach ($indices as $idx) $masked[$idx] = '_';
        
        $inputFields = '';
        foreach ($indices as $i => $idx) {
            $inputFields .= '<input type="text" name="char' . $i . '" maxlength="1" required style="width:40px;text-align:center;">';
        }
        
        $content = <<<HTML
        <h1>ONION CAPTCHA</h1>
        <p>Enter the missing characters:</p>
        <pre style="font-size:14px;letter-spacing:2px;">{$masked}</pre>
        <p>Positions: {$indicesStr}</p>
        <form method="post" action="?action=verify_captcha">
            <div style="display:flex;gap:5px;flex-wrap:wrap;">{$inputFields}</div>
            <input type="text" name="hp" class="hidden" tabindex="-1">
            <button type="submit">VERIFY</button>
        </form>
HTML;
        $content = str_replace('{$masked}', implode('', $masked), $content);
        $content = str_replace('{$indicesStr}', implode(', ', $indices), $content);
        $content = str_replace('{$inputFields}', $inputFields, $content);
        
        render('Captcha', $content);
        break;
        
    case 'verify_captcha':
        if (!isset($_SESSION['captcha_indices'])) {
            header('Location: ?action=start');
            exit;
        }
        
        // Honeypot check
        if (!empty($_POST['hp'])) {
            logAccess('captcha_attempt', false, null, ['reason' => 'honeypot']);
            header('Location: ?action=start');
            exit;
        }
        
        $correct = true;
        foreach ($_SESSION['captcha_indices'] as $i => $idx) {
            $submitted = strtolower($_POST['char' . $i] ?? '');
            if ($submitted !== strtolower(ONION_URL[$idx])) {
                $correct = false;
                break;
            }
        }
        
        if ($correct) {
            $_SESSION['captcha_verified'] = true;
            $_SESSION['stage'] = 'auth';
            logAccess('captcha_success');
            header('Location: ?action=login');
        } else {
            logAccess('captcha_attempt', false);
            header('Location: ?action=captcha&error=1');
        }
        exit;
        
    case 'login':
        if (empty($_SESSION['captcha_verified'])) {
            header('Location: ?action=start');
            exit;
        }
        
        $error = isset($_GET['error']) ? '<div class="error">Invalid credentials</div>' : '';
        $success = isset($_GET['success']) ? '<div class="success">Registered! You can now login.</div>' : '';
        
        $content = <<<HTML
        <h1>AUTHENTICATION</h1>
        {$error}{$success}
        <h2>Login</h2>
        <form method="post" action="?action=login_init">
            <input type="text" name="username" placeholder="Username" required>
            <input type="text" name="hp" class="hidden" tabindex="-1">
            <button type="submit">GET CHALLENGE</button>
        </form>
        <hr style="margin:20px 0;border-color:#0f0;">
        <h2>Register</h2>
        <form method="post" action="?action=register">
            <input type="text" name="username" placeholder="Username" required>
            <textarea name="gpg_key" rows="8" placeholder="Paste your PUBLIC GPG key" required></textarea>
            <input type="text" name="hp" class="hidden" tabindex="-1">
            <button type="submit">REGISTER</button>
        </form>
HTML;
        render('Login', $content);
        break;
        
    case 'register':
        if (empty($_SESSION['captcha_verified']) || !empty($_POST['hp'])) {
            header('Location: ?action=start');
            exit;
        }
        
        $username = trim($_POST['username'] ?? '');
        $gpgKey = trim($_POST['gpg_key'] ?? '');
        
        $db = getDB();
        
        // Check exists
        $stmt = $db->prepare("SELECT 1 FROM security_users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            header('Location: ?action=login&error=1');
            exit;
        }
        
        // Validate GPG key format
        if (!str_contains($gpgKey, 'BEGIN PGP PUBLIC KEY')) {
            header('Location: ?action=login&error=1');
            exit;
        }
        
        $stmt = $db->prepare("INSERT INTO security_users (username, public_gpg_key) VALUES (?, ?)");
        $stmt->execute([$username, $gpgKey]);
        
        logAccess('register', true, $username);
        header('Location: ?action=login&success=1');
        exit;
        
    case 'login_init':
        if (empty($_SESSION['captcha_verified']) || !empty($_POST['hp'])) {
            header('Location: ?action=start');
            exit;
        }
        
        $username = trim($_POST['username'] ?? '');
        
        $db = getDB();
        $stmt = $db->prepare("SELECT id, public_gpg_key FROM security_users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        if (!$user) {
            logAccess('login_attempt', false, $username);
            header('Location: ?action=login&error=1');
            exit;
        }
        
        $code = strtoupper(bin2hex(random_bytes(4)));
        $challengeId = bin2hex(random_bytes(16));
        
        // Store challenge
        $stmt = $db->prepare("INSERT INTO security_challenges (id, username, code, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))");
        $stmt->execute([$challengeId, $username, $code]);
        
        $encrypted = encryptWithGPG("Your Login Code: $code", $user['public_gpg_key']);
        
        if (!$encrypted) {
            header('Location: ?action=login&error=1');
            exit;
        }
        
        $_SESSION['challenge_id'] = $challengeId;
        $_SESSION['challenge_username'] = $username;
        
        $content = <<<HTML
        <h1>GPG CHALLENGE</h1>
        <p>Decrypt this with your private key:</p>
        <pre>{$encrypted}</pre>
        <form method="post" action="?action=login_verify">
            <input type="text" name="code" placeholder="Enter decrypted code" required>
            <input type="text" name="hp" class="hidden" tabindex="-1">
            <button type="submit">VERIFY</button>
        </form>
HTML;
        logAccess('login_attempt', true, $username);
        render('GPG Challenge', $content);
        break;
        
    case 'login_verify':
        if (empty($_SESSION['challenge_id']) || !empty($_POST['hp'])) {
            header('Location: ?action=start');
            exit;
        }
        
        $code = strtoupper(trim($_POST['code'] ?? ''));
        $challengeId = $_SESSION['challenge_id'];
        $username = $_SESSION['challenge_username'];
        
        $db = getDB();
        $stmt = $db->prepare("SELECT code FROM security_challenges WHERE id = ? AND username = ? AND expires_at > NOW()");
        $stmt->execute([$challengeId, $username]);
        $challenge = $stmt->fetch();
        
        if (!$challenge || !str_contains($code, $challenge['code'])) {
            logAccess('login_failed', false, $username);
            header('Location: ?action=login&error=1');
            exit;
        }
        
        // Delete challenge
        $stmt = $db->prepare("DELETE FROM security_challenges WHERE id = ?");
        $stmt->execute([$challengeId]);
        
        // Create session
        $token = bin2hex(random_bytes(32));
        $stmt = $db->prepare("SELECT id FROM security_users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();
        
        $stmt = $db->prepare("INSERT INTO security_sessions (token, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))");
        $stmt->execute([$token, $user['id'], $ip, $_SERVER['HTTP_USER_AGENT'] ?? '']);
        
        setcookie('security_token', $token, time() + 86400, '/', '', true, true);
        
        logAccess('login_success', true, $username);
        
        $content = <<<HTML
        <h1 style="color:#0f0;text-shadow:0 0 20px #0f0;">ACCESS GRANTED</h1>
        <div class="ascii">
  ██████╗ ██████╗  █████╗ ███╗   ██╗████████╗███████╗██████╗ 
 ██╔════╝ ██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝██╔════╝██╔══██╗
 ██║  ███╗██████╔╝███████║██╔██╗ ██║   ██║   █████╗  ██║  ██║
        </div>
        <p style="text-align:center;">Welcome, {$username}</p>
        <p style="text-align:center;margin-top:20px;"><a href="/">Enter Forum</a></p>
HTML;
        render('Access Granted', $content);
        break;
        
    default:
        header('Location: ?action=start');
        exit;
}
