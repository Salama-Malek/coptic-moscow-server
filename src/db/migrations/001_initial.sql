-- Migration 001: Initial schema
-- Coptic Orthodox Church Moscow — Notification App
-- All tables, indexes, and foreign keys

CREATE TABLE IF NOT EXISTS admins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  display_name VARCHAR(150) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  language ENUM('ar', 'ru', 'en') NOT NULL DEFAULT 'ar',
  must_change_password TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS device_tokens (
  id INT PRIMARY KEY AUTO_INCREMENT,
  fcm_token VARCHAR(512) NOT NULL UNIQUE,
  platform ENUM('ios', 'android') NOT NULL,
  app_version VARCHAR(20),
  language ENUM('ar', 'ru', 'en') NOT NULL DEFAULT 'ar',
  preferences JSON NOT NULL,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_last_seen (last_seen)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcement_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_ar VARCHAR(150) NOT NULL,
  name_ru VARCHAR(150),
  name_en VARCHAR(150),
  category ENUM('liturgy', 'vespers', 'feast', 'fast', 'meeting', 'custom') NOT NULL,
  body_ar_template TEXT NOT NULL,
  body_ru_template TEXT,
  body_en_template TEXT,
  placeholders JSON NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_templates_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title_ar VARCHAR(200) NOT NULL,
  title_ru VARCHAR(200),
  title_en VARCHAR(200),
  body_ar TEXT NOT NULL,
  body_ru TEXT,
  body_en TEXT,
  priority ENUM('normal', 'high', 'critical') NOT NULL DEFAULT 'normal',
  category ENUM('service', 'announcement') NOT NULL DEFAULT 'announcement',
  status ENUM('draft', 'scheduled', 'sent', 'cancelled') NOT NULL DEFAULT 'sent',
  scheduled_for DATETIME NULL,
  sent_at DATETIME NULL,
  created_by INT NOT NULL,
  template_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scheduled (status, scheduled_for),
  CONSTRAINT fk_announcements_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE RESTRICT,
  CONSTRAINT fk_announcements_template FOREIGN KEY (template_id) REFERENCES announcement_templates(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS calendar_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title_ar VARCHAR(200) NOT NULL,
  title_ru VARCHAR(200),
  title_en VARCHAR(200),
  description_ar TEXT,
  description_ru TEXT,
  description_en TEXT,
  rrule VARCHAR(500),
  starts_at DATETIME NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  reminder_minutes_before INT NOT NULL DEFAULT 30,
  active TINYINT(1) NOT NULL DEFAULT 1,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS snippets (
  `key` VARCHAR(60) PRIMARY KEY,
  value_ar TEXT NOT NULL,
  value_ru TEXT,
  value_en TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS send_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  announcement_id INT,
  sent_count INT NOT NULL,
  failed_count INT NOT NULL,
  ran_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_send_log_announcement FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40),
  target_id INT,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
