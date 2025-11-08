-- GameNet Management - MySQL schema
-- This file defines minimal tables used by the app.
-- Default database name (via docker-compose): gamenet

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `code` VARCHAR(50) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_phone` (`phone`),
  UNIQUE KEY `uniq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branches table (optional, referenced in UI)
CREATE TABLE IF NOT EXISTS `branches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ui_id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `phone1` VARCHAR(20) DEFAULT NULL,
  `phone2` VARCHAR(20) DEFAULT NULL,
  `printer_system_key` VARCHAR(100) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_branches_ui` (`ui_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Generic key-value JSON store to persist complex branch data
CREATE TABLE IF NOT EXISTS `app_store` (
  `k` VARCHAR(100) NOT NULL,
  `data` JSON NOT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`k`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Branch meta (arrays that are fine to keep as JSON)
CREATE TABLE IF NOT EXISTS `branch_meta` (
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `buffet_categories` JSON NULL,
  `buffet_items` JSON NULL,
  `kitchen_items` JSON NULL,
  `special_items` JSON NULL,
  `employees` JSON NULL,
  PRIMARY KEY (`branch_id`),
  CONSTRAINT `fk_meta_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Periods per branch
CREATE TABLE IF NOT EXISTS `branch_periods` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ui_id` VARCHAR(64) NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `start_min` INT NOT NULL,
  `end_min` INT NOT NULL,
  `default_prices` JSON NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_period_ui` (`ui_id`),
  KEY `idx_period_branch` (`branch_id`),
  CONSTRAINT `fk_period_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Systems per branch
CREATE TABLE IF NOT EXISTS `systems` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ui_id` VARCHAR(64) NOT NULL,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_system_ui` (`ui_id`),
  KEY `idx_system_branch` (`branch_id`),
  CONSTRAINT `fk_system_branch` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System override prices by period
CREATE TABLE IF NOT EXISTS `system_period_prices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `system_id` BIGINT UNSIGNED NOT NULL,
  `period_id` BIGINT UNSIGNED NOT NULL,
  `prices` JSON NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_sys_period` (`system_id`,`period_id`),
  CONSTRAINT `fk_spp_system` FOREIGN KEY (`system_id`) REFERENCES `systems`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_spp_period` FOREIGN KEY (`period_id`) REFERENCES `branch_periods`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
