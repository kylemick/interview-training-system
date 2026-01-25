# Capability: System Settings (係統设置管理)

## ADDED Requirements

### Requirement: 基本设置管理
係統SHALL允许用户管理係統基本设置，包括學生信息和訓練參數。

#### Scenario: 配置學生信息
- **WHEN** 用户首次使用係統或需要更新學生信息
- **THEN** 係統提供表单输入學生姓名
- **AND** 選擇目標學校（SPCC、QC、LSC、DBS、DGS等）
- **AND** 设置默认每日訓練時長（15/30/45/60分鐘）
- **AND** 保存後自動应用到新創建的訓練計劃

#### Scenario: 读取已保存的设置
- **WHEN** 用户打開设置页面
- **THEN** 係統從本地文件读取已保存的设置
- **AND** 在表单中显示当前配置
- **AND** 如果没有设置文件，使用默认值（30分鐘訓練時長）

### Requirement: AI API配置
係統SHALL管理DeepSeek API密钥配置，確保安全存储。

#### Scenario: 配置API密钥
- **WHEN** 用户输入DeepSeek API Key
- **THEN** 係統将密钥加密存储到本地文件（data/settings.json）
- **AND** 不将密钥上傳到任何远程服務器
- **AND** 更新当前运行時的环境变量
- **AND** 提示用户配置成功

#### Scenario: 测試API连接
- **WHEN** 用户點击"测試连接"按钮
- **THEN** 係統使用当前配置的API Key調用DeepSeek API
- **AND** 發送一个简单的测試请求
- **AND** 如果成功，显示"API Key验证成功"
- **AND** 如果失敗，显示具体错误信息（无效密钥/网络错误/配额用尽）

#### Scenario: 安全显示API密钥
- **WHEN** 用户查看已保存的设置
- **THEN** API密钥只显示前10个字符加省略號（如"sk-1234567..."）
- **AND** 完整密钥不在前端显示
- **AND** 用户需要重新输入才能更新密钥

### Requirement: 數據備份与恢复
係統SHALL提供數據導出和清空功能，保障數據安全。

#### Scenario: 導出所有數據
- **WHEN** 用户點击"導出所有數據"按钮
- **THEN** 係統從數據庫读取所有表數據：
  - 訓練計劃（training_plans）
  - 每日任務（daily_tasks）
  - 練習會話（sessions）
  - 問答記錄（qa_records）
  - 反馈數據（feedback）
  - 題庫（questions）
  - 學校檔案（school_profiles）
- **AND** 生成JSON格式的備份文件
- **AND** 文件名包含時間戳（如"interview-training-backup-1706198400000.json"）
- **AND** 自動下载到用户本地
- **AND** 显示導出成功提示

#### Scenario: 清空訓練數據
- **WHEN** 用户點击"清空所有數據"按钮
- **THEN** 係統显示確认對話框，警告操作不可恢复
- **AND** 用户確认後，删除以下表的數據：
  - qa_records（問答記錄）
  - feedback（反馈數據）
  - sessions（會話）
  - daily_tasks（每日任務）
  - training_plans（訓練計劃）
- **AND** 保留題庫（questions）和學校檔案（school_profiles）
- **AND** 显示清空成功提示

#### Scenario: 防止误操作
- **WHEN** 用户點击清空數據按钮
- **THEN** 係統显示红色警告對話框
- **AND** 明確說明将删除的內容和保留的內容
- **AND** 要求用户確认才执行
- **AND** 提供"取消"按钮随時中止操作

### Requirement: 係統信息展示
係統SHALL在设置页面显示应用信息和技術栈。

#### Scenario: 查看应用信息
- **WHEN** 用户打開"關于"標籤页
- **THEN** 係統显示应用版本號（如"1.0.0"）
- **AND** 显示应用描述和主要功能列表
- **AND** 显示技術栈信息（前端/後端/AI）
- **AND** 显示版权信息

### Requirement: 设置持久化
係統SHALL確保设置數據持久化存储并安全管理。

#### Scenario: 设置文件存储
- **WHEN** 用户保存设置
- **THEN** 係統将设置写入JSON文件（backend/data/settings.json）
- **AND** 文件包含字段：
  - student_name（學生姓名）
  - target_school（目標學校）
  - deepseek_api_key（API密钥）
  - daily_duration（每日時長）
  - notification_enabled（通知開關）
  - created_at（創建時間）
  - updated_at（更新時間）
- **AND** 文件权限设为仅当前用户可读写
- **AND** 自動創建data目錄（如果不存在）

#### Scenario: 重置为默认值
- **WHEN** 用户選擇重置设置
- **THEN** 係統恢复默认配置：
  - daily_duration: 30分鐘
  - notification_enabled: true
- **AND** 清空學生姓名和目標學校
- **AND** 保留API密钥（除非用户明確删除）
- **AND** 提示重置成功

## Implementation Notes

### 技術实现
- **後端路由**: `/api/settings` (GET/POST/DELETE)
- **數據存储**: 本地JSON文件（backend/data/settings.json）
- **前端页面**: Settings.tsx，使用Ant Design Tabs分隔不同设置類別
- **安全措施**: 
  - API密钥加密存储
  - 前端只显示密钥前缀
  - 设置文件不包含在版本控制中（.gitignore）

### 數據導出格式
```json
{
  "exported_at": "2026-01-25T10:30:00Z",
  "version": "1.0.0",
  "data": {
    "training_plans": [...],
    "daily_tasks": [...],
    "sessions": [...],
    "qa_records": [...],
    "feedback": [...],
    "questions": [...],
    "school_profiles": [...]
  },
  "stats": {
    "plans": 5,
    "tasks": 150,
    "sessions": 42,
    "qa_records": 380,
    "feedback": 42,
    "questions": 294,
    "schools": 5
  }
}
```

### 清空操作顺序
按照外键依赖關係逆序删除：
1. qa_records（依赖sessions）
2. feedback（依赖sessions）
3. sessions（依赖plans和tasks）
4. daily_tasks（依赖plans）
5. training_plans（根表）

保留：
- questions（題庫）
- school_profiles（學校檔案）
