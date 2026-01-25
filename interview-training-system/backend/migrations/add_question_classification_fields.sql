-- 添加题目分类相关字段的迁移脚本
-- 执行时间: 2026-01-25
-- 注意：MySQL 不支持 IF NOT EXISTS，使用存储过程安全添加字段

USE interview_training;

-- 使用存储过程安全添加字段
DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_not_exists$$
CREATE PROCEDURE add_column_if_not_exists(
    IN table_name VARCHAR(64),
    IN column_name VARCHAR(64),
    IN column_definition TEXT
)
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = table_name
      AND COLUMN_NAME = column_name;
    
    IF column_exists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', table_name, ' ADD COLUMN ', column_name, ' ', column_definition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        SELECT CONCAT('Added column ', column_name, ' to ', table_name) as result;
    ELSE
        SELECT CONCAT('Column ', column_name, ' already exists in ', table_name) as result;
    END IF;
END$$

DELIMITER ;

-- 添加 notes 字段（如果不存在）
CALL add_column_if_not_exists('questions', 'notes', 'TEXT COMMENT ''备注信息（如原始回答）'' AFTER source');

-- 添加 classification_confidence 字段（如果不存在）
CALL add_column_if_not_exists('questions', 'classification_confidence', 'DECIMAL(3,2) COMMENT ''分类置信度 (0-1)'' AFTER notes');

-- 添加 classification_source 字段（如果不存在）
CALL add_column_if_not_exists('questions', 'classification_source', 'VARCHAR(20) DEFAULT ''auto'' COMMENT ''分类来源: auto, manual'' AFTER classification_confidence');

-- 添加 last_classified_at 字段（如果不存在）
CALL add_column_if_not_exists('questions', 'last_classified_at', 'TIMESTAMP NULL COMMENT ''最后分类更新时间'' AFTER classification_source');

-- 清理存储过程
DROP PROCEDURE IF EXISTS add_column_if_not_exists;

-- 创建分类历史表（如果不存在）
CREATE TABLE IF NOT EXISTS question_category_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL COMMENT '关联题目',
  old_category VARCHAR(50) NOT NULL COMMENT '旧分类',
  new_category VARCHAR(50) NOT NULL COMMENT '新分类',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  updated_by VARCHAR(50) DEFAULT 'system' COMMENT '更新者: system, user',
  reason TEXT COMMENT '更新原因',
  INDEX idx_question_id (question_id),
  INDEX idx_updated_at (updated_at),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题目分类历史';

-- 创建分类规则表（如果不存在）
CREATE TABLE IF NOT EXISTS category_classification_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL COMMENT '规则版本号',
  prompt_template TEXT NOT NULL COMMENT '提示词模板',
  examples JSON COMMENT '分类示例数据',
  accuracy DECIMAL(5,2) COMMENT '分类准确率 (0-100)',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_version (version),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类规则';

-- 确认迁移成功
SELECT 'Migration completed successfully! Added classification fields to questions table.' as message;
