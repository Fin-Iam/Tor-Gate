-- MariaDB Schema for Flarum Forum Security Gateway
-- Run this script to create the security tables in your existing Flarum database

-- Create the security_users table for GPG authentication
CREATE TABLE IF NOT EXISTS `security_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(100) NOT NULL,
  `public_gpg_key` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login_at` TIMESTAMP NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  INDEX `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create login challenges table (ephemeral, cleanup periodically)
CREATE TABLE IF NOT EXISTS `security_challenges` (
  `id` VARCHAR(50) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `code` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_expires` (`expires_at`),
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create access logs for security auditing
CREATE TABLE IF NOT EXISTS `security_access_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT,
  `action` ENUM('ddos_check', 'pow_attempt', 'pow_success', 'captcha_attempt', 'captcha_success', 'login_attempt', 'login_success', 'login_failed', 'register') NOT NULL,
  `username` VARCHAR(100) NULL,
  `success` TINYINT(1) DEFAULT 0,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_ip` (`ip_address`),
  INDEX `idx_action` (`action`),
  INDEX `idx_created` (`created_at`),
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rate limiting table
CREATE TABLE IF NOT EXISTS `security_rate_limits` (
  `ip_address` VARCHAR(45) NOT NULL,
  `endpoint` VARCHAR(100) NOT NULL,
  `request_count` INT UNSIGNED DEFAULT 1,
  `window_start` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ip_address`, `endpoint`),
  INDEX `idx_window` (`window_start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blocked IPs (for persistent bans)
CREATE TABLE IF NOT EXISTS `security_blocked_ips` (
  `ip_address` VARCHAR(45) NOT NULL,
  `reason` VARCHAR(255),
  `blocked_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `blocked_until` TIMESTAMP NULL,
  `is_permanent` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`ip_address`),
  INDEX `idx_until` (`blocked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session tokens for verified users
CREATE TABLE IF NOT EXISTS `security_sessions` (
  `token` VARCHAR(64) NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `last_activity` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`token`),
  INDEX `idx_user` (`user_id`),
  INDEX `idx_expires` (`expires_at`),
  FOREIGN KEY (`user_id`) REFERENCES `security_users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cleanup events (run these periodically via cron or MySQL event scheduler)
DELIMITER //

CREATE EVENT IF NOT EXISTS `cleanup_expired_challenges`
ON SCHEDULE EVERY 5 MINUTE
DO
BEGIN
  DELETE FROM `security_challenges` WHERE `expires_at` < NOW();
END//

CREATE EVENT IF NOT EXISTS `cleanup_expired_sessions`
ON SCHEDULE EVERY 15 MINUTE
DO
BEGIN
  DELETE FROM `security_sessions` WHERE `expires_at` < NOW();
END//

CREATE EVENT IF NOT EXISTS `cleanup_rate_limits`
ON SCHEDULE EVERY 1 MINUTE
DO
BEGIN
  DELETE FROM `security_rate_limits` WHERE `window_start` < DATE_SUB(NOW(), INTERVAL 2 MINUTE);
END//

CREATE EVENT IF NOT EXISTS `cleanup_old_logs`
ON SCHEDULE EVERY 1 DAY
DO
BEGIN
  DELETE FROM `security_access_logs` WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 30 DAY);
END//

DELIMITER ;

-- Enable event scheduler (run as root/admin)
-- SET GLOBAL event_scheduler = ON;

-- Sample insert for testing
-- INSERT INTO security_users (username, public_gpg_key) VALUES 
-- ('testuser', '-----BEGIN PGP PUBLIC KEY BLOCK-----\n...\n-----END PGP PUBLIC KEY BLOCK-----');
