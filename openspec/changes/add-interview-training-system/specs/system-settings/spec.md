# Capability: System Settings (系统设置管理)

## ADDED Requirements

### Requirement: 基本设置管理
系统SHALL允许用户管理系统基本设置，包括学生信息和训练参数。

#### Scenario: 配置学生信息
- **WHEN** 用户首次使用系统或需要更新学生信息
- **THEN** 系统提供表单输入学生姓名
- **AND** 选择目标学校（SPCC、QC、LSC、DBS、DGS等）
- **AND** 设置默认每日训练时长（15/30/45/60分钟）
- **AND** 保存后自动应用到新创建的训练计划

#### Scenario: 读取已保存的设置
- **WHEN** 用户打开设置页面
- **THEN** 系统从本地文件读取已保存的设置
- **AND** 在表单中显示当前配置
- **AND** 如果没有设置文件，使用默认值（30分钟训练时长）

### Requirement: AI API配置
系统SHALL管理DeepSeek API密钥配置，确保安全存储。

#### Scenario: 配置API密钥
- **WHEN** 用户输入DeepSeek API Key
- **THEN** 系统将密钥加密存储到本地文件（data/settings.json）
- **AND** 不将密钥上传到任何远程服务器
- **AND** 更新当前运行时的环境变量
- **AND** 提示用户配置成功

#### Scenario: 测试API连接
- **WHEN** 用户点击"测试连接"按钮
- **THEN** 系统使用当前配置的API Key调用DeepSeek API
- **AND** 发送一个简单的测试请求
- **AND** 如果成功，显示"API Key验证成功"
- **AND** 如果失败，显示具体错误信息（无效密钥/网络错误/配额用尽）

#### Scenario: 安全显示API密钥
- **WHEN** 用户查看已保存的设置
- **THEN** API密钥只显示前10个字符加省略号（如"sk-1234567..."）
- **AND** 完整密钥不在前端显示
- **AND** 用户需要重新输入才能更新密钥

### Requirement: 数据备份与恢复
系统SHALL提供数据导出和清空功能，保障数据安全。

#### Scenario: 导出所有数据
- **WHEN** 用户点击"导出所有数据"按钮
- **THEN** 系统从数据库读取所有表数据：
  - 训练计划（training_plans）
  - 每日任务（daily_tasks）
  - 练习会话（sessions）
  - 问答记录（qa_records）
  - 反馈数据（feedback）
  - 题库（questions）
  - 学校档案（school_profiles）
- **AND** 生成JSON格式的备份文件
- **AND** 文件名包含时间戳（如"interview-training-backup-1706198400000.json"）
- **AND** 自动下载到用户本地
- **AND** 显示导出成功提示

#### Scenario: 清空训练数据
- **WHEN** 用户点击"清空所有数据"按钮
- **THEN** 系统显示确认对话框，警告操作不可恢复
- **AND** 用户确认后，删除以下表的数据：
  - qa_records（问答记录）
  - feedback（反馈数据）
  - sessions（会话）
  - daily_tasks（每日任务）
  - training_plans（训练计划）
- **AND** 保留题库（questions）和学校档案（school_profiles）
- **AND** 显示清空成功提示

#### Scenario: 防止误操作
- **WHEN** 用户点击清空数据按钮
- **THEN** 系统显示红色警告对话框
- **AND** 明确说明将删除的内容和保留的内容
- **AND** 要求用户确认才执行
- **AND** 提供"取消"按钮随时中止操作

### Requirement: 系统信息展示
系统SHALL在设置页面显示应用信息和技术栈。

#### Scenario: 查看应用信息
- **WHEN** 用户打开"关于"标签页
- **THEN** 系统显示应用版本号（如"1.0.0"）
- **AND** 显示应用描述和主要功能列表
- **AND** 显示技术栈信息（前端/后端/AI）
- **AND** 显示版权信息

### Requirement: 设置持久化
系统SHALL确保设置数据持久化存储并安全管理。

#### Scenario: 设置文件存储
- **WHEN** 用户保存设置
- **THEN** 系统将设置写入JSON文件（backend/data/settings.json）
- **AND** 文件包含字段：
  - student_name（学生姓名）
  - target_school（目标学校）
  - deepseek_api_key（API密钥）
  - daily_duration（每日时长）
  - notification_enabled（通知开关）
  - created_at（创建时间）
  - updated_at（更新时间）
- **AND** 文件权限设为仅当前用户可读写
- **AND** 自动创建data目录（如果不存在）

#### Scenario: 重置为默认值
- **WHEN** 用户选择重置设置
- **THEN** 系统恢复默认配置：
  - daily_duration: 30分钟
  - notification_enabled: true
- **AND** 清空学生姓名和目标学校
- **AND** 保留API密钥（除非用户明确删除）
- **AND** 提示重置成功

## Implementation Notes

### 技术实现
- **后端路由**: `/api/settings` (GET/POST/DELETE)
- **数据存储**: 本地JSON文件（backend/data/settings.json）
- **前端页面**: Settings.tsx，使用Ant Design Tabs分隔不同设置类别
- **安全措施**: 
  - API密钥加密存储
  - 前端只显示密钥前缀
  - 设置文件不包含在版本控制中（.gitignore）

### 数据导出格式
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
按照外键依赖关系逆序删除：
1. qa_records（依赖sessions）
2. feedback（依赖sessions）
3. sessions（依赖plans和tasks）
4. daily_tasks（依赖plans）
5. training_plans（根表）

保留：
- questions（题库）
- school_profiles（学校档案）
