-- Records every cron invocation so operators can answer
-- "did today's scheduled-send actually run?" and
-- "how long has token cleanup been flaky?"
--
-- Populated by the cron routes on entry/exit; surfaces into the future
-- admin-panel System Health page (OB7).

CREATE TABLE IF NOT EXISTS cron_runs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  job VARCHAR(50) NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP NULL,
  duration_ms INT NULL,
  status ENUM('running', 'ok', 'error') NOT NULL DEFAULT 'running',
  result_json JSON NULL,
  error_message TEXT NULL,
  INDEX idx_job_started (job, started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
