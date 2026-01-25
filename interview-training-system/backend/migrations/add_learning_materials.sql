-- 添加学习素材表的迁移脚本

USE interview_training;

-- 创建学习素材表
CREATE TABLE IF NOT EXISTS learning_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weakness_id INT COMMENT '关联的弱点ID（可选）',
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱点类型: vocabulary, grammar, logic, knowledge_gap, confidence, expression',
  title VARCHAR(200) NOT NULL COMMENT '素材标题',
  content TEXT NOT NULL COMMENT '素材内容（Markdown格式）',
  material_type VARCHAR(50) DEFAULT 'text' COMMENT '素材类型: text, link, example, tip, practice',
  tags JSON COMMENT '标签',
  usage_count INT DEFAULT 0 COMMENT '使用次数',
  created_by VARCHAR(50) DEFAULT 'ai' COMMENT '创建方式: ai, manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weakness (weakness_id),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  INDEX idx_material_type (material_type),
  INDEX idx_category_weakness_type (category, weakness_type),
  FOREIGN KEY (weakness_id) REFERENCES student_weaknesses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学习素材';

-- 确认创建成功
SELECT 'Migration completed successfully!' as message;
