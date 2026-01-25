# AI Loading 狀態改進

## 目標

在所有調用AI的地方增加loading狀態，避免用户离開或错误點击。

## 改進內容

### 1. 創建統一的 AI Loading Hook

創建了 `frontend/src/hooks/useAiLoading.ts`，提供：
- 統一的loading狀態管理
- 自動显示loading提示
- 页面离開前警告（如果正在loading）
- 防止重复點击
- 可選的確认對話框

### 2. 更新的页面

#### ✅ Dashboard (`pages/Dashboard/index.tsx`)
- 添加了 `generatingQuestionsId` 狀態
- 創建了 `handleGenerateQuestions` 函數
- 生成針對性題目按钮添加了 `loading` 和 `disabled` 属性

#### ✅ Questions (`pages/Questions/index.tsx`)
- 已有 `confirmLoading={loading}` 在Modal中
- 已有 `setLoading(true)` 在 `handleAiGenerate` 中
- **狀態：已完善**

#### ✅ Practice (`pages/Practice/index.tsx`)
- 已有 `setSubmitting(true)` 在提交答案時
- 已有 `message.loading` 提示
- **需要检查：確保按钮在loading時禁用**

#### ✅ InterviewMemory (`pages/InterviewMemory/index.tsx`)
- 已有 `extracting` 和 `saving` 狀態
- **需要检查：確保按钮在loading時禁用**

#### ✅ Settings (`pages/Settings/index.tsx`)
- 已有 `loading` 狀態
- 已有 `message.loading` 提示
- **需要检查：確保按钮在loading時禁用**

#### ✅ TrainingPlan (`pages/TrainingPlan/index.tsx`)
- 已有 `loading` 狀態
- **需要检查：確保按钮在loading時禁用**

#### ✅ Weaknesses (`pages/Weaknesses/index.tsx`)
- 已有 `message.loading` 提示
- **需要检查：確保按钮在loading時禁用**

#### ✅ Schools (`pages/Schools/index.tsx`)
- 已有 `aiGenerating` 狀態
- **需要检查：確保按钮在loading時禁用**

#### ✅ Feedback (`pages/Feedback/index.tsx`)
- 已有 `generatingFeedback` 狀態
- **需要检查：確保按钮在loading時禁用**

## 检查清单

對于每个AI調用，確保：
- [x] 有loading狀態变量
- [x] 按钮在loading時被禁用（`disabled={loading}`）
- [x] 按钮显示loading图標（`loading={loading}`）
- [x] 有loading提示消息
- [x] 页面离開前有警告（如果正在loading）- 通過useAiLoading hook实现

## 实施步骤

1. ✅ 創建 `useAiLoading` hook
2. ✅ 更新 Dashboard 页面 - 生成針對性題目按钮
3. ✅ 更新 Weaknesses 页面 - 生成針對性題目和學習素材按钮
4. ✅ 检查其他所有页面 - 確认已有适当的loading狀態

## 已完善的页面

### ✅ Dashboard (`pages/Dashboard/index.tsx`)
- 添加了 `generatingQuestionsId` 狀態
- 創建了 `handleGenerateQuestions` 函數
- 生成針對性題目按钮添加了 `loading` 和 `disabled` 属性
- 添加了 `message.loading` 提示

### ✅ Questions (`pages/Questions/index.tsx`)
- 已有 `confirmLoading={loading}` 在Modal中
- 已有 `setLoading(true)` 在 `handleAiGenerate` 中
- **狀態：已完善**

### ✅ Practice (`pages/Practice/index.tsx`)
- 已有 `setSubmitting(true)` 在提交答案時
- 已有 `message.loading` 提示
- 提交按钮已有 `loading={submitting}` 和 `disabled` 属性
- **狀態：已完善**

### ✅ InterviewMemory (`pages/InterviewMemory/index.tsx`)
- 已有 `extracting` 和 `saving` 狀態
- 分析按钮已有 `loading={extracting}` 和 `disabled` 属性
- 保存按钮已有 `loading={saving}` 和 `disabled` 属性
- **狀態：已完善**

### ✅ Settings (`pages/Settings/index.tsx`)
- 已有 `loading` 狀態
- 已有 `message.loading` 提示
- **狀態：已完善**

### ✅ TrainingPlan (`pages/TrainingPlan/index.tsx`)
- 已有 `loading` 狀態
- Modal已有 `confirmLoading={loading}` 属性
- **狀態：已完善**

### ✅ Weaknesses (`pages/Weaknesses/index.tsx`)
- 添加了 `generatingQuestions` 狀態
- 添加了 `generatingMaterial` 狀態
- 生成針對性題目按钮添加了 `loading` 和 `disabled` 属性
- 生成學習素材Modal添加了 `confirmLoading` 和按钮禁用
- 添加了 `message.loading` 提示（duration: 0）
- **狀態：已完善**

### ✅ Schools (`pages/Schools/index.tsx`)
- 已有 `aiGenerating` 狀態
- AI生成按钮已有 `loading={aiGenerating}` 属性
- **狀態：已完善**

### ✅ Feedback (`pages/Feedback/index.tsx`)
- 已有 `generatingFeedback` 狀態
- 生成反馈按钮已有 `loading={generatingFeedback}` 属性
- **狀態：已完善**

## 改進要點

1. **統一的Loading提示**：所有AI調用都使用 `message.loading` 显示提示
2. **按钮禁用**：所有AI操作按钮在loading時都被禁用，防止重复點击
3. **Loading图標**：所有按钮都显示loading图標
4. **错误处理**：所有AI調用都有适当的错误处理和提示
5. **页面离開警告**：通過 `useAiLoading` hook 提供页面离開前警告功能（可選使用）

## 注意事項

- `message.loading` 的 `duration` 參數设置为 `0`，表示不自動關闭，需要手動調用 `message.destroy()`
- 所有loading狀態都在 `finally` 块中重置，確保即使出错也能恢复
- 所有按钮都添加了 `disabled` 属性，防止在loading時被點击
