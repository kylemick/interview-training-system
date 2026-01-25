-- 为interview_memories表增加interview_round字段
-- 用于记录面试轮次信息，支持学校-轮次模拟面试功能

USE interview_training;

-- 检查字段是否已存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'interview_memories';
SET @columnname = 'interview_round';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(50) COMMENT ''面试轮次（如：first-round, second-round, final-round）''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 添加索引以支持按学校和轮次查询
DELIMITER $$
CREATE PROCEDURE add_index_if_not_exists()
BEGIN
  DECLARE index_exists INT DEFAULT 0;
  
  SELECT COUNT(*) INTO index_exists
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'interview_memories'
    AND INDEX_NAME = 'idx_school_round';
  
  IF index_exists = 0 THEN
    ALTER TABLE interview_memories
    ADD INDEX idx_school_round (school_code, interview_round);
  END IF;
END$$
DELIMITER ;

CALL add_index_if_not_exists();
DROP PROCEDURE add_index_if_not_exists;

-- 确认迁移成功
SELECT 'Migration completed successfully! interview_round field added to interview_memories table.' as message;
