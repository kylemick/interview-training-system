# 學生信息統一從设置获取 - 修正說明

## 修正日期
2026-01-25

## 修正內容

### 問題描述
之前係統中，學生信息（student_name）在多个地方使用，包括：
- 從请求參數获取
- 從弱點記錄中获取
- 從訓練計劃中获取
- 從设置中获取

这導致數據不一致，需要統一從设置获取。

### 修正方案

#### 1. 後端API修正

**文件：`backend/src/routes/plans.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函數
- ✅ 修正 `POST /api/plans` 路由：統一從设置获取學生信息
- ✅ 修正 `POST /api/plans/from-weakness` 路由：統一從设置获取學生信息
- ✅ 移除對请求參數中 `student_name` 的依赖

**文件：`backend/src/routes/ai.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函數
- ✅ 修正 `POST /api/ai/save-weaknesses` 路由：統一從设置获取學生信息
- ✅ 移除對请求參數中 `student_name` 的依赖

**文件：`backend/src/routes/weaknesses.ts`**
- ✅ 添加 `getStudentInfoFromSettings()` 辅助函數
- ✅ 修正 `GET /api/weaknesses` 路由：如果没有提供student_name，從设置获取
- ✅ 修正 `GET /api/weaknesses/stats/summary` 路由：如果没有提供student_name，從设置获取
- ✅ 修正 `GET /api/weaknesses/stats/trends` 路由：如果没有提供student_name，從设置获取

#### 2. 前端修正

**文件：`frontend/src/pages/Weaknesses/index.tsx`**
- ✅ 添加设置信息加载：`loadSettings()`
- ✅ 在創建訓練計劃時，检查设置中是否有學生信息
- ✅ 在創建計劃對話框中显示当前设置的學生信息
- ✅ 移除對请求參數中 `student_name` 的傳递

**文件：`frontend/src/pages/TrainingPlan/index.tsx`**
- ✅ 修正創建訓練計劃邏輯：統一使用设置中的學生信息
- ✅ 移除表单中的 `student_name` 输入字段（改为只读显示）
- ✅ 添加提示：如果未设置學生信息，引導用户前往设置页面

**文件：`frontend/src/pages/InterviewMemory/index.tsx`**
- ✅ 移除保存弱點時傳递的 `student_name` 參數

#### 3. 數據迁移

**文件：`backend/migrations/update_student_name_from_settings.js`**
- ✅ 創建數據迁移脚本，用于更新历史數據
- ✅ 将弱點表和訓練計劃表中的學生姓名統一更新为设置中的值

**文件：`backend/migrations/update_student_name_from_settings.sql`**
- ✅ 創建SQL迁移脚本（參考）

### 修正後的邏輯流程

#### 創建訓練計劃（普通）
1. 前端：從设置获取學生信息，显示在表单中（只读）
2. 前端：提交時不傳递 `student_name`
3. 後端：從设置文件读取學生信息
4. 後端：验证學生信息是否存在
5. 後端：使用设置中的學生信息創建計劃

#### 基于弱點創建訓練計劃
1. 前端：從设置获取學生信息，显示在對話框中
2. 前端：提交時不傳递 `student_name`
3. 後端：從设置文件读取學生信息
4. 後端：验证學生信息是否存在
5. 後端：使用设置中的學生信息創建計劃

#### 保存弱點分析
1. 前端：不傳递 `student_name` 參數
2. 後端：從设置文件读取學生信息
3. 後端：使用设置中的學生信息保存弱點

#### 查询弱點列表/統計
1. 前端：不傳递 `student_name` 參數（可選）
2. 後端：如果没有提供 `student_name`，從设置获取
3. 後端：使用设置中的學生信息進行筛選

### 數據修正

#### 历史數據更新
运行迁移脚本更新历史數據：
```bash
cd backend
node migrations/update_student_name_from_settings.js
```

或者手動执行SQL：
```sql
-- 從设置文件读取學生姓名（例如：'諶芷懿'）
UPDATE student_weaknesses 
SET student_name = '諶芷懿'
WHERE student_name IS NULL OR student_name != '諶芷懿';

UPDATE training_plans 
SET student_name = '諶芷懿'
WHERE student_name IS NULL OR student_name != '諶芷懿';
```

### 验证清单

- [x] 後端API統一從设置获取學生信息
- [x] 前端創建訓練計劃時使用设置中的學生信息
- [x] 前端基于弱點創建計劃時使用设置中的學生信息
- [x] 保存弱點時使用设置中的學生信息
- [x] 查询弱點時自動使用设置中的學生信息
- [ ] 运行數據迁移脚本更新历史數據（需要手動执行）
- [ ] 验证所有功能正常工作

### 注意事項

1. **设置文件位置**：`backend/data/settings.json`
2. **學生信息必须先在设置页面配置**，否則相關功能无法使用
3. **历史數據**：需要运行迁移脚本更新历史數據中的學生信息
4. **向後兼容**：查询API仍然支持 `student_name` 參數，但如果不提供，會自動從设置获取

### 测試建議

1. 在设置页面配置學生姓名和目標學校
2. 测試創建訓練計劃（普通）
3. 测試基于弱點創建訓練計劃
4. 测試保存弱點分析
5. 测試查询弱點列表和統計
6. 验证所有功能都使用设置中的學生信息
