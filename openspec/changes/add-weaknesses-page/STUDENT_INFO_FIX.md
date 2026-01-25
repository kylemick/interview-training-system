# 学生信息统一从设置获取 - 修正说明

## 修正日期
2026-01-25

## 修正内容

### 问题描述
之前系统中，学生信息（student_name）在多个地方使用，包括：
- 从请求参数获取
- 从弱点记录中获取
- 从训练计划中获取
- 从设置中获取

这导致数据不一致，需要统一从设置获取。

### 修正方案

#### 1. 后端API修正

**文件：`backend/src/routes/plans.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函数
- ✅ 修正 `POST /api/plans` 路由：统一从设置获取学生信息
- ✅ 修正 `POST /api/plans/from-weakness` 路由：统一从设置获取学生信息
- ✅ 移除对请求参数中 `student_name` 的依赖

**文件：`backend/src/routes/ai.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函数
- ✅ 修正 `POST /api/ai/save-weaknesses` 路由：统一从设置获取学生信息
- ✅ 移除对请求参数中 `student_name` 的依赖

**文件：`backend/src/routes/weaknesses.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函数
- ✅ 修正 `GET /api/weaknesses` 路由：如果没有提供student_name，从设置获取
- ✅ 修正 `GET /api/weaknesses/stats/summary` 路由：如果没有提供student_name，从设置获取
- ✅ 修正 `GET /api/weaknesses/stats/trends` 路由：如果没有提供student_name，从设置获取

#### 2. 前端修正

**文件：`frontend/src/pages/Weaknesses/index.tsx`**
- ✅ 添加设置信息加载：`loadSettings()`
- ✅ 在创建训练计划时，检查设置中是否有学生信息
- ✅ 在创建计划对话框中显示当前设置的学生信息
- ✅ 移除对请求参数中 `student_name` 的传递

**文件：`frontend/src/pages/TrainingPlan/index.tsx`**
- ✅ 修正创建训练计划逻辑：统一使用设置中的学生信息
- ✅ 移除表单中的 `student_name` 输入字段（改为只读显示）
- ✅ 添加提示：如果未设置学生信息，引导用户前往设置页面

**文件：`frontend/src/pages/InterviewMemory/index.tsx`**
- ✅ 移除保存弱点时传递的 `student_name` 参数

#### 3. 数据迁移

**文件：`backend/migrations/update_student_name_from_settings.js`**
- ✅ 创建数据迁移脚本，用于更新历史数据
- ✅ 将弱点表和训练计划表中的学生姓名统一更新为设置中的值

**文件：`backend/migrations/update_student_name_from_settings.sql`**
- ✅ 创建SQL迁移脚本（参考）

### 修正后的逻辑流程

#### 创建训练计划（普通）
1. 前端：从设置获取学生信息，显示在表单中（只读）
2. 前端：提交时不传递 `student_name`
3. 后端：从设置文件读取学生信息
4. 后端：验证学生信息是否存在
5. 后端：使用设置中的学生信息创建计划

#### 基于弱点创建训练计划
1. 前端：从设置获取学生信息，显示在对话框中
2. 前端：提交时不传递 `student_name`
3. 后端：从设置文件读取学生信息
4. 后端：验证学生信息是否存在
5. 后端：使用设置中的学生信息创建计划

#### 保存弱点分析
1. 前端：不传递 `student_name` 参数
2. 后端：从设置文件读取学生信息
3. 后端：使用设置中的学生信息保存弱点

#### 查询弱点列表/统计
1. 前端：不传递 `student_name` 参数（可选）
2. 后端：如果没有提供 `student_name`，从设置获取
3. 后端：使用设置中的学生信息进行筛选

### 数据修正

#### 历史数据更新
运行迁移脚本更新历史数据：
```bash
cd backend
node migrations/update_student_name_from_settings.js
```

或者手动执行SQL：
```sql
-- 从设置文件读取学生姓名（例如：'諶芷懿'）
UPDATE student_weaknesses 
SET student_name = '諶芷懿'
WHERE student_name IS NULL OR student_name != '諶芷懿';

UPDATE training_plans 
SET student_name = '諶芷懿'
WHERE student_name IS NULL OR student_name != '諶芷懿';
```

### 验证清单

- [x] 后端API统一从设置获取学生信息
- [x] 前端创建训练计划时使用设置中的学生信息
- [x] 前端基于弱点创建计划时使用设置中的学生信息
- [x] 保存弱点时使用设置中的学生信息
- [x] 查询弱点时自动使用设置中的学生信息
- [ ] 运行数据迁移脚本更新历史数据（需要手动执行）
- [ ] 验证所有功能正常工作

### 注意事项

1. **设置文件位置**：`backend/data/settings.json`
2. **学生信息必须先在设置页面配置**，否则相关功能无法使用
3. **历史数据**：需要运行迁移脚本更新历史数据中的学生信息
4. **向后兼容**：查询API仍然支持 `student_name` 参数，但如果不提供，会自动从设置获取

### 测试建议

1. 在设置页面配置学生姓名和目标学校
2. 测试创建训练计划（普通）
3. 测试基于弱点创建训练计划
4. 测试保存弱点分析
5. 测试查询弱点列表和统计
6. 验证所有功能都使用设置中的学生信息
