-- 升中面试训练系统数据库 Schema (MySQL)

-- 学校档案表
CREATE TABLE IF NOT EXISTS school_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '学校代码 (如 SPCC, QC, LSC)',
  name VARCHAR(200) NOT NULL COMMENT '学校全名',
  name_zh VARCHAR(200) NOT NULL COMMENT '学校中文名',
  focus_areas JSON NOT NULL COMMENT '面试重点领域数组',
  interview_style VARCHAR(100) NOT NULL COMMENT '面试风格',
  notes TEXT COMMENT '备注说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学校档案';

-- 题库表
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  question_text TEXT NOT NULL COMMENT '题目内容',
  difficulty VARCHAR(20) NOT NULL COMMENT '难度: easy, medium, hard',
  reference_answer TEXT COMMENT '参考答案',
  tags JSON COMMENT '标签数组',
  school_code VARCHAR(50) COMMENT '关联学校',
  source VARCHAR(100) DEFAULT 'seed' COMMENT '来源: seed, ai_generated, interview_memory',
  notes TEXT COMMENT '备注信息（如原始回答）',
  classification_confidence DECIMAL(3,2) COMMENT '分类置信度 (0-1)',
  classification_source VARCHAR(20) DEFAULT 'auto' COMMENT '分类来源: auto, manual',
  last_classified_at TIMESTAMP NULL COMMENT '最后分类更新时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_difficulty (difficulty),
  INDEX idx_school_code (school_code),
  INDEX idx_source (source),
  INDEX idx_classification_confidence (classification_confidence),
  INDEX idx_classification_source (classification_source),
  FOREIGN KEY (school_code) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='题库';

-- 学生弱点分析表（从面试回忆中提取）
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
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生弱点分析';

-- 训练计划表
CREATE TABLE IF NOT EXISTS training_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL COMMENT '学生姓名',
  target_school VARCHAR(50) COMMENT '目标学校',
  start_date DATE NOT NULL COMMENT '开始日期',
  end_date DATE NOT NULL COMMENT '结束日期',
  total_days INT NOT NULL COMMENT '总天数',
  daily_duration INT NOT NULL COMMENT '每日时长(分钟)',
  category_allocation JSON NOT NULL COMMENT '类别分配 {category: percentage}',
  ai_suggestions TEXT COMMENT 'AI生成的建议',
  status VARCHAR(20) DEFAULT 'active' COMMENT '状态: active, completed, paused',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student (student_name),
  INDEX idx_target_school (target_school),
  INDEX idx_status (status),
  FOREIGN KEY (target_school) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='训练计划';

-- 每日任务表
CREATE TABLE IF NOT EXISTS daily_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL COMMENT '关联训练计划',
  task_date DATE NOT NULL COMMENT '任务日期',
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  duration INT NOT NULL COMMENT '时长(分钟)',
  question_ids JSON COMMENT '题目ID数组',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '状态: pending, in_progress, completed',
  completed_at TIMESTAMP NULL COMMENT '完成时间',
  metadata JSON COMMENT '元数据(如 skipped 标记)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_id (plan_id),
  INDEX idx_task_date (task_date),
  INDEX idx_status (status),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日任务';

-- 练习会话表
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT COMMENT '关联任务(可选)',
  category VARCHAR(50) NOT NULL COMMENT '专项类别',
  mode VARCHAR(50) NOT NULL COMMENT '模式: text_qa, ai_interview, custom',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '开始时间',
  end_time TIMESTAMP NULL COMMENT '结束时间',
  status VARCHAR(20) DEFAULT 'in_progress' COMMENT '状态: in_progress, completed',
  question_ids JSON COMMENT '题目ID数组（会话创建时选择的完整题目列表）',
  INDEX idx_task_id (task_id),
  INDEX idx_category (category),
  INDEX idx_start_time (start_time),
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习会话';

-- 问答记录表
CREATE TABLE IF NOT EXISTS qa_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL COMMENT '关联会话',
  question_id INT COMMENT '关联题目(可选)',
  question_text TEXT NOT NULL COMMENT '问题内容',
  answer_text TEXT NOT NULL COMMENT '回答内容',
  response_time INT COMMENT '回答时长(秒)',
  ai_feedback JSON COMMENT 'AI反馈',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_question_id (question_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='问答记录';

-- 会话总结表
CREATE TABLE IF NOT EXISTS session_summaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE COMMENT '关联会话',
  total_questions INT NOT NULL COMMENT '总问题数',
  total_duration INT NOT NULL COMMENT '总时长(秒)',
  average_score DECIMAL(5,2) COMMENT '平均分数',
  strengths JSON COMMENT '优势点数组',
  weaknesses JSON COMMENT '薄弱点数组',
  suggestions TEXT COMMENT '改进建议',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话总结';

-- 计划调整记录表
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL COMMENT '关联计划',
  adjustment_type VARCHAR(50) NOT NULL COMMENT '调整类型',
  old_value JSON COMMENT '旧值',
  new_value JSON COMMENT '新值',
  reason TEXT COMMENT '调整原因',
  adjusted_by VARCHAR(50) DEFAULT 'system' COMMENT '调整者: system, user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_id (plan_id),
  INDEX idx_adjustment_type (adjustment_type),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='计划调整记录';

-- 面试回忆表
CREATE TABLE IF NOT EXISTS interview_memories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_code VARCHAR(50) COMMENT '关联学校',
  interview_date DATE COMMENT '面试日期',
  memory_text TEXT NOT NULL COMMENT '回忆内容(文字)',
  extracted_questions JSON COMMENT 'AI提取的题目数组',
  feedback JSON COMMENT 'AI反馈分析',
  tags JSON COMMENT '标签',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_code (school_code),
  INDEX idx_interview_date (interview_date),
  FOREIGN KEY (school_code) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面试回忆';

-- 题目分类历史表
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

-- 分类规则表
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
