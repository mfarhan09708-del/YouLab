-- YouLab relational schema: MySQL 8.0+. Select the target database before importing.

CREATE TABLE IF NOT EXISTS app_sessions (
  session_id VARCHAR(128) NOT NULL,
  session_data MEDIUMBLOB NOT NULL,
  expires_at DATETIME NOT NULL,
  PRIMARY KEY (session_id),
  KEY idx_app_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  goal_preference ENUM('energy','better_sleep','strength','focus','stress_management') NULL,
  experience_level ENUM('beginner','intermediate','advanced') NULL,
  reminder_time TIME NULL,
  theme ENUM('light','dark','system') NOT NULL DEFAULT 'system',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  onboarding_complete TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_demo (is_demo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS templates (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  owner_user_id BIGINT UNSIGNED NULL,
  slug VARCHAR(80) NOT NULL,
  title VARCHAR(150) NOT NULL,
  icon VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  test_condition TEXT NOT NULL,
  normal_condition TEXT NOT NULL,
  suggested_duration TINYINT UNSIGNED NOT NULL DEFAULT 14,
  outcome_name VARCHAR(100) NOT NULL,
  instructions TEXT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_templates_slug (slug),
  KEY idx_templates_active (is_active),
  KEY idx_templates_owner (owner_user_id),
  CONSTRAINT fk_templates_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experiments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  template_id BIGINT UNSIGNED NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  test_condition TEXT NOT NULL,
  normal_condition TEXT NOT NULL,
  outcome_name VARCHAR(100) NOT NULL,
  duration_days TINYINT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('scheduled','active','paused','completed','stopped') NOT NULL DEFAULT 'scheduled',
  paused_at DATETIME NULL,
  completed_at DATETIME NULL,
  stopped_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_experiments_user_status (user_id, status),
  KEY idx_experiments_user_dates (user_id, start_date, end_date),
  KEY idx_experiments_template (template_id),
  CONSTRAINT fk_experiments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_experiments_template FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL,
  CONSTRAINT chk_experiments_duration CHECK (duration_days IN (7, 14, 21)),
  CONSTRAINT chk_experiments_dates CHECK (end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS experiment_days (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  experiment_id BIGINT UNSIGNED NOT NULL,
  day_number TINYINT UNSIGNED NOT NULL,
  scheduled_date DATE NOT NULL,
  condition_type ENUM('test','normal') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_days_experiment_number (experiment_id, day_number),
  UNIQUE KEY uq_days_experiment_date (experiment_id, scheduled_date),
  KEY idx_days_date_condition (scheduled_date, condition_type),
  CONSTRAINT fk_days_experiment FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
  CONSTRAINT chk_days_number CHECK (day_number BETWEEN 1 AND 21)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS checkins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  experiment_day_id BIGINT UNSIGNED NOT NULL,
  rating TINYINT UNSIGNED NOT NULL,
  followed_plan TINYINT(1) NOT NULL,
  context_tags JSON NULL,
  note VARCHAR(500) NULL,
  checked_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_checkins_experiment_day (experiment_day_id),
  KEY idx_checkins_checked_in (checked_in_at),
  CONSTRAINT fk_checkins_day FOREIGN KEY (experiment_day_id) REFERENCES experiment_days(id) ON DELETE CASCADE,
  CONSTRAINT chk_checkins_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT chk_checkins_tags CHECK (context_tags IS NULL OR JSON_TYPE(context_tags) = 'ARRAY')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  experiment_id BIGINT UNSIGNED NOT NULL,
  conclusion ENUM('strong_evidence','some_evidence','no_clear_difference','not_enough_data') NOT NULL,
  mean_test DECIMAL(6,3) NULL,
  mean_normal DECIMAL(6,3) NULL,
  mean_difference DECIMAL(6,3) NULL,
  cohens_d DECIMAL(8,4) NULL,
  ci_low DECIMAL(8,4) NULL,
  ci_high DECIMAL(8,4) NULL,
  valid_test_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  valid_normal_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  excluded_days SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL,
  calculation_version VARCHAR(30) NOT NULL,
  calculated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_results_experiment_calculated (experiment_id, calculated_at),
  CONSTRAINT fk_results_experiment FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS playbook_entries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  experiment_id BIGINT UNSIGNED NULL,
  title_snapshot VARCHAR(150) NOT NULL,
  category ENUM('works_for_me','does_not_seem_to_help','still_unclear') NOT NULL,
  conclusion ENUM('strong_evidence','some_evidence','no_clear_difference','not_enough_data') NOT NULL,
  key_finding VARCHAR(500) NOT NULL,
  confidence_label VARCHAR(40) NOT NULL,
  saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_playbook_user_experiment (user_id, experiment_id),
  KEY idx_playbook_user_category_saved (user_id, category, saved_at),
  CONSTRAINT fk_playbook_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_playbook_experiment FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
