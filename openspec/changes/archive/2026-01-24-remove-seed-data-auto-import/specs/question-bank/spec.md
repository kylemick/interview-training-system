# Capability: Question Bank (题库管理)

## MODIFIED Requirements

### Requirement: 题目录入和导入
系统SHALL支持手动录入和批量导入题目，但不自动导入种子数据。

#### Scenario: 系统初始化不自动导入题目
- **WHEN** 系统首次启动或重启
- **THEN** 数据库表结构正确创建
- **AND** 不自动导入任何种子题目数据
- **AND** 题库为空，等待用户手动生成或导入

#### Scenario: 手动触发种子数据导入（可选）
- **WHEN** 用户通过API调用 POST /api/data/seed-questions
- **THEN** 系统导入预定义的种子题目
- **AND** 检查是否已存在相同题目（基于question_text）
- **AND** 跳过已存在的题目，只导入新题目
- **AND** 返回导入统计（新增数、跳过数）

#### Scenario: 推荐通过AI生成题目
- **WHEN** 用户需要题目进行练习
- **THEN** 系统推荐用户使用AI生成题目功能（POST /api/ai/generate-questions）
- **AND** 而不是依赖预置的种子数据
- **AND** AI生成的题目更加多样化和个性化

### Requirement: 数据去重
系统SHALL确保题库中不存在完全相同的题目。

#### Scenario: 防止导入重复题目
- **WHEN** 系统导入题目（种子数据或批量导入）
- **THEN** 检查question_text是否已存在
- **AND** 如果已存在，跳过该题目
- **AND** 记录日志说明跳过原因

#### Scenario: 清理现有重复数据
- **WHEN** 数据库中存在重复题目
- **THEN** 提供数据清理脚本或API
- **AND** 保留每个唯一题目的最早一条记录
- **AND** 删除其他重复记录
- **AND** 记录清理日志（删除数量）
