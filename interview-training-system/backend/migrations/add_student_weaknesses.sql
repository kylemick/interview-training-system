-- 添加学生弱点分析表的迁移脚本

USE interview_training;

-- 创建学生弱点分析表
CREATE TABLE IF NOT EXISTS student_weaknesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) COMMENT '学生姓名（可选）',
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱点类型: vocabulary, grammar, logic, knowledge_gap, confidence, expression',
  description TEXT NOT NULL COMMENT '弱点描述',
  example_text TEXT COMMENT '示例文本（从面试回忆中提取）',
  severity VARCHAR(20) DEFAULT 'medium' COMMENT '严重程度: low, medium, high',
  improvement_suggestions TEXT COMMENT '改进建议',
  related_topics JSON COMMENT '相关话题标签',
  source_text TEXT COMMENT '来源面试回忆全文',
  identified_by VARCHAR(50) DEFAULT 'ai' COMMENT '识别方式: ai, manual',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active, improved, resolved',
  practice_count INT DEFAULT 0 COMMENT '已针对性练习次数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student (student_name),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  INDEX idx_severity (severity),
  INDEX idx_status (status),
  INDEX idx_student_category (student_name, category),
  INDEX idx_status_severity (status, severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生弱点分析';

-- 更新 questions 表，添加 notes 字段（如果不存在）
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS notes TEXT COMMENT '备注信息（如原始回答）' 
AFTER source;

-- 确认创建成功
SELECT 'Migration completed successfully!' as message;
