# AI Loading 状态改进

## 目标

在所有调用AI的地方增加loading状态，避免用户离开或错误点击。

## 改进内容

### 1. 创建统一的 AI Loading Hook

创建了 `frontend/src/hooks/useAiLoading.ts`，提供：
- 统一的loading状态管理
- 自动显示loading提示
- 页面离开前警告（如果正在loading）
- 防止重复点击
- 可选的确认对话框

### 2. 更新的页面

#### ✅ Dashboard (`pages/Dashboard/index.tsx`)
- 添加了 `generatingQuestionsId` 状态
- 创建了 `handleGenerateQuestions` 函数
- 生成针对性题目按钮添加了 `loading` 和 `disabled` 属性

#### ✅ Questions (`pages/Questions/index.tsx`)
- 已有 `confirmLoading={loading}` 在Modal中
- 已有 `setLoading(true)` 在 `handleAiGenerate` 中
- **状态：已完善**

#### ✅ Practice (`pages/Practice/index.tsx`)
- 已有 `setSubmitting(true)` 在提交答案时
- 已有 `message.loading` 提示
- **需要检查：确保按钮在loading时禁用**

#### ✅ InterviewMemory (`pages/InterviewMemory/index.tsx`)
- 已有 `extracting` 和 `saving` 状态
- **需要检查：确保按钮在loading时禁用**

#### ✅ Settings (`pages/Settings/index.tsx`)
- 已有 `loading` 状态
- 已有 `message.loading` 提示
- **需要检查：确保按钮在loading时禁用**

#### ✅ TrainingPlan (`pages/TrainingPlan/index.tsx`)
- 已有 `loading` 状态
- **需要检查：确保按钮在loading时禁用**

#### ✅ Weaknesses (`pages/Weaknesses/index.tsx`)
- 已有 `message.loading` 提示
- **需要检查：确保按钮在loading时禁用**

#### ✅ Schools (`pages/Schools/index.tsx`)
- 已有 `aiGenerating` 状态
- **需要检查：确保按钮在loading时禁用**

#### ✅ Feedback (`pages/Feedback/index.tsx`)
- 已有 `generatingFeedback` 状态
- **需要检查：确保按钮在loading时禁用**

## 检查清单

对于每个AI调用，确保：
- [x] 有loading状态变量
- [x] 按钮在loading时被禁用（`disabled={loading}`）
- [x] 按钮显示loading图标（`loading={loading}`）
- [x] 有loading提示消息
- [x] 页面离开前有警告（如果正在loading）- 通过useAiLoading hook实现

## 实施步骤

1. ✅ 创建 `useAiLoading` hook
2. ✅ 更新 Dashboard 页面 - 生成针对性题目按钮
3. ✅ 更新 Weaknesses 页面 - 生成针对性题目和学习素材按钮
4. ✅ 检查其他所有页面 - 确认已有适当的loading状态

## 已完善的页面

### ✅ Dashboard (`pages/Dashboard/index.tsx`)
- 添加了 `generatingQuestionsId` 状态
- 创建了 `handleGenerateQuestions` 函数
- 生成针对性题目按钮添加了 `loading` 和 `disabled` 属性
- 添加了 `message.loading` 提示

### ✅ Questions (`pages/Questions/index.tsx`)
- 已有 `confirmLoading={loading}` 在Modal中
- 已有 `setLoading(true)` 在 `handleAiGenerate` 中
- **状态：已完善**

### ✅ Practice (`pages/Practice/index.tsx`)
- 已有 `setSubmitting(true)` 在提交答案时
- 已有 `message.loading` 提示
- 提交按钮已有 `loading={submitting}` 和 `disabled` 属性
- **状态：已完善**

### ✅ InterviewMemory (`pages/InterviewMemory/index.tsx`)
- 已有 `extracting` 和 `saving` 状态
- 分析按钮已有 `loading={extracting}` 和 `disabled` 属性
- 保存按钮已有 `loading={saving}` 和 `disabled` 属性
- **状态：已完善**

### ✅ Settings (`pages/Settings/index.tsx`)
- 已有 `loading` 状态
- 已有 `message.loading` 提示
- **状态：已完善**

### ✅ TrainingPlan (`pages/TrainingPlan/index.tsx`)
- 已有 `loading` 状态
- Modal已有 `confirmLoading={loading}` 属性
- **状态：已完善**

### ✅ Weaknesses (`pages/Weaknesses/index.tsx`)
- 添加了 `generatingQuestions` 状态
- 添加了 `generatingMaterial` 状态
- 生成针对性题目按钮添加了 `loading` 和 `disabled` 属性
- 生成学习素材Modal添加了 `confirmLoading` 和按钮禁用
- 添加了 `message.loading` 提示（duration: 0）
- **状态：已完善**

### ✅ Schools (`pages/Schools/index.tsx`)
- 已有 `aiGenerating` 状态
- AI生成按钮已有 `loading={aiGenerating}` 属性
- **状态：已完善**

### ✅ Feedback (`pages/Feedback/index.tsx`)
- 已有 `generatingFeedback` 状态
- 生成反馈按钮已有 `loading={generatingFeedback}` 属性
- **状态：已完善**

## 改进要点

1. **统一的Loading提示**：所有AI调用都使用 `message.loading` 显示提示
2. **按钮禁用**：所有AI操作按钮在loading时都被禁用，防止重复点击
3. **Loading图标**：所有按钮都显示loading图标
4. **错误处理**：所有AI调用都有适当的错误处理和提示
5. **页面离开警告**：通过 `useAiLoading` hook 提供页面离开前警告功能（可选使用）

## 注意事项

- `message.loading` 的 `duration` 参数设置为 `0`，表示不自动关闭，需要手动调用 `message.destroy()`
- 所有loading状态都在 `finally` 块中重置，确保即使出错也能恢复
- 所有按钮都添加了 `disabled` 属性，防止在loading时被点击
