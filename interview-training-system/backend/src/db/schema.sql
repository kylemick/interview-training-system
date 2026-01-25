-- 升中面試訓練系統數據庫 Schema (MySQL)

-- 學校檔案表
CREATE TABLE IF NOT EXISTS school_profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '學校代碼 (如 SPCC, QC, LSC)',
  name VARCHAR(200) NOT NULL COMMENT '學校全名',
  name_zh VARCHAR(200) NOT NULL COMMENT '學校中文名',
  focus_areas JSON NOT NULL COMMENT '面試重點領域數組',
  interview_style VARCHAR(100) NOT NULL COMMENT '面試風格',
  notes TEXT COMMENT '備註說明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='學校檔案';

-- 題庫表
CREATE TABLE IF NOT EXISTS questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  question_text TEXT NOT NULL COMMENT '題目內容',
  difficulty VARCHAR(20) NOT NULL COMMENT '難度: easy, medium, hard',
  reference_answer TEXT COMMENT '參考答案',
  tags JSON COMMENT '標籤數組',
  school_code VARCHAR(50) COMMENT '關聯學校',
  source VARCHAR(100) DEFAULT 'seed' COMMENT '來源: seed, ai_generated, interview_memory',
  notes TEXT COMMENT '備註信息（如原始回答）',
  classification_confidence DECIMAL(3,2) COMMENT '分類置信度 (0-1)',
  classification_source VARCHAR(20) DEFAULT 'auto' COMMENT '分類來源: auto, manual',
  last_classified_at TIMESTAMP NULL COMMENT '最後分類更新時間',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_difficulty (difficulty),
  INDEX idx_school_code (school_code),
  INDEX idx_source (source),
  INDEX idx_classification_confidence (classification_confidence),
  INDEX idx_classification_source (classification_source),
  FOREIGN KEY (school_code) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='題庫';

-- 學生弱點分析表（從面試回憶中提取）
CREATE TABLE IF NOT EXISTS student_weaknesses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) COMMENT '學生姓名（可選）',
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱點類型: vocabulary, grammar, logic, knowledge_gap, confidence, expression',
  description TEXT NOT NULL COMMENT '弱點描述',
  example_text TEXT COMMENT '示例文本（從面試回憶中提取）',
  severity VARCHAR(20) DEFAULT 'medium' COMMENT '嚴重程度: low, medium, high',
  improvement_suggestions TEXT COMMENT '改進建議',
  related_topics JSON COMMENT '相關話題標籤',
  source_text TEXT COMMENT '來源面試回憶全文',
  identified_by VARCHAR(50) DEFAULT 'ai' COMMENT '識別方式: ai, manual',
  status VARCHAR(20) DEFAULT 'active' COMMENT '狀態: active, improved, resolved',
  practice_count INT DEFAULT 0 COMMENT '已針對性練習次數',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student (student_name),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  INDEX idx_severity (severity),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='學生弱點分析';

-- 學習素材表
CREATE TABLE IF NOT EXISTS learning_materials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weakness_id INT COMMENT '關聯的弱點ID（可選）',
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  weakness_type VARCHAR(50) NOT NULL COMMENT '弱點類型: vocabulary, grammar, logic, knowledge_gap, confidence, expression',
  title VARCHAR(200) NOT NULL COMMENT '素材標題',
  content TEXT NOT NULL COMMENT '素材內容（Markdown格式）',
  material_type VARCHAR(50) DEFAULT 'text' COMMENT '素材類型: text, link, example, tip, practice',
  tags JSON COMMENT '標籤',
  usage_count INT DEFAULT 0 COMMENT '使用次數',
  created_by VARCHAR(50) DEFAULT 'ai' COMMENT '創建方式: ai, manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_weakness (weakness_id),
  INDEX idx_category (category),
  INDEX idx_weakness_type (weakness_type),
  INDEX idx_material_type (material_type),
  INDEX idx_category_weakness_type (category, weakness_type),
  FOREIGN KEY (weakness_id) REFERENCES student_weaknesses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='學習素材';

-- 訓練計劃表
CREATE TABLE IF NOT EXISTS training_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(100) NOT NULL COMMENT '學生姓名',
  target_school VARCHAR(50) COMMENT '目標學校',
  start_date DATE NOT NULL COMMENT '開始日期',
  end_date DATE NOT NULL COMMENT '結束日期',
  total_days INT NOT NULL COMMENT '總天數',
  daily_duration INT NOT NULL COMMENT '每日時長(分鐘)',
  category_allocation JSON NOT NULL COMMENT '類別分配 {category: percentage}',
  ai_suggestions TEXT COMMENT 'AI生成的建議',
  status VARCHAR(20) DEFAULT 'active' COMMENT '狀態: active, completed, paused',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_student (student_name),
  INDEX idx_target_school (target_school),
  INDEX idx_status (status),
  FOREIGN KEY (target_school) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='訓練計劃';

-- 每日任務表
CREATE TABLE IF NOT EXISTS daily_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL COMMENT '關聯訓練計劃',
  task_date DATE NOT NULL COMMENT '任務日期',
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  duration INT NOT NULL COMMENT '時長(分鐘)',
  question_ids JSON COMMENT '題目ID數組',
  status VARCHAR(20) DEFAULT 'pending' COMMENT '狀態: pending, in_progress, completed',
  completed_at TIMESTAMP NULL COMMENT '完成時間',
  metadata JSON COMMENT '元數據(如 skipped 標記)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_plan_id (plan_id),
  INDEX idx_task_date (task_date),
  INDEX idx_status (status),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日任務';

-- 練習會話表
CREATE TABLE IF NOT EXISTS sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  task_id INT COMMENT '關聯任務(可選)',
  category VARCHAR(50) NOT NULL COMMENT '專項類別',
  mode VARCHAR(50) NOT NULL COMMENT '模式: text_qa, ai_interview, custom',
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '開始時間',
  end_time TIMESTAMP NULL COMMENT '結束時間',
  status VARCHAR(20) DEFAULT 'in_progress' COMMENT '狀態: in_progress, completed',
  question_ids JSON COMMENT '題目ID數組（會話創建時選擇的完整題目列表）',
  INDEX idx_task_id (task_id),
  INDEX idx_category (category),
  INDEX idx_start_time (start_time),
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='練習會話';

-- 問答記錄表
CREATE TABLE IF NOT EXISTS qa_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL COMMENT '關聯會話',
  plan_id INT COMMENT '關聯訓練計劃（通過 session -> task -> plan 關聯）',
  question_id INT COMMENT '關聯題目(可選)',
  question_text TEXT NOT NULL COMMENT '問題內容',
  answer_text TEXT NOT NULL COMMENT '回答內容',
  response_time INT COMMENT '回答時長(秒)',
  ai_feedback JSON COMMENT 'AI反饋',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  INDEX idx_plan_id (plan_id),
  INDEX idx_question_id (question_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE SET NULL,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='問答記錄';

-- 會話總結表
CREATE TABLE IF NOT EXISTS session_summaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL UNIQUE COMMENT '關聯會話',
  total_questions INT NOT NULL COMMENT '總問題數',
  total_duration INT NOT NULL COMMENT '總時長(秒)',
  average_score DECIMAL(5,2) COMMENT '平均分數',
  strengths JSON COMMENT '優勢點數組',
  weaknesses JSON COMMENT '薄弱點數組',
  suggestions TEXT COMMENT '改進建議',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session_id (session_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='會話總結';

-- 計劃調整記錄表
CREATE TABLE IF NOT EXISTS plan_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL COMMENT '關聯計劃',
  adjustment_type VARCHAR(50) NOT NULL COMMENT '調整類型',
  old_value JSON COMMENT '舊值',
  new_value JSON COMMENT '新值',
  reason TEXT COMMENT '調整原因',
  adjusted_by VARCHAR(50) DEFAULT 'system' COMMENT '調整者: system, user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_plan_id (plan_id),
  INDEX idx_adjustment_type (adjustment_type),
  FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='計劃調整記錄';

-- 面試回憶表
CREATE TABLE IF NOT EXISTS interview_memories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  school_code VARCHAR(50) COMMENT '關聯學校',
  interview_date DATE COMMENT '面試日期',
  interview_round VARCHAR(50) COMMENT '面試輪次（如：first-round, second-round, final-round）',
  memory_text TEXT NOT NULL COMMENT '回憶內容(文字)',
  extracted_questions JSON COMMENT 'AI提取的題目數組',
  feedback JSON COMMENT 'AI反饋分析',
  tags JSON COMMENT '標籤',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_school_code (school_code),
  INDEX idx_interview_date (interview_date),
  INDEX idx_school_round (school_code, interview_round),
  FOREIGN KEY (school_code) REFERENCES school_profiles(code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='面試回憶';

-- 題目分類歷史表
CREATE TABLE IF NOT EXISTS question_category_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question_id INT NOT NULL COMMENT '關聯題目',
  old_category VARCHAR(50) NOT NULL COMMENT '舊分類',
  new_category VARCHAR(50) NOT NULL COMMENT '新分類',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '更新時間',
  updated_by VARCHAR(50) DEFAULT 'system' COMMENT '更新者: system, user',
  reason TEXT COMMENT '更新原因',
  INDEX idx_question_id (question_id),
  INDEX idx_updated_at (updated_at),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='題目分類歷史';

-- 分類規則表
CREATE TABLE IF NOT EXISTS category_classification_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(20) NOT NULL COMMENT '規則版本號',
  prompt_template TEXT NOT NULL COMMENT '提示詞模板',
  examples JSON COMMENT '分類示例數據',
  accuracy DECIMAL(5,2) COMMENT '分類準確率 (0-100)',
  is_active BOOLEAN DEFAULT FALSE COMMENT '是否激活',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_version (version),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分類規則';
