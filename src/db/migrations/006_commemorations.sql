-- G8: Coptic 40-day and 1-year memorial commemorations.
--
-- When Abouna logs a reposed parishioner, the server auto-schedules two
-- announcements at +40 days and +1 year. Reuses the existing scheduled-
-- announcement infrastructure (cron/send-due + status state machine).
--
-- The announcement IDs are stored on the commemoration row so the cancel
-- path can delete them if the commemoration is later removed.

CREATE TABLE IF NOT EXISTS commemorations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name_ar VARCHAR(200) NOT NULL,
  name_ru VARCHAR(200),
  name_en VARCHAR(200),
  date_of_repose DATE NOT NULL,
  notes TEXT,
  announcement_40d_id INT NULL,
  announcement_1y_id INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_repose (date_of_repose),
  CONSTRAINT fk_commem_admin FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE RESTRICT,
  CONSTRAINT fk_commem_ann_40d FOREIGN KEY (announcement_40d_id) REFERENCES announcements(id) ON DELETE SET NULL,
  CONSTRAINT fk_commem_ann_1y FOREIGN KEY (announcement_1y_id) REFERENCES announcements(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
