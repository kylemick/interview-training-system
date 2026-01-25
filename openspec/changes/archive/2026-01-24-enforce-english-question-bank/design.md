# Design: 英文題庫語言强制規范

## Context
当前係統在AI生成english-oral（英文口語）專項的題目和反馈時，由于提示詞没有明確語言要求，導致AI可能返回中文內容。这不符合英語面試訓練的真实场景，影响學生的英語學習体验。

**现狀問題：**
1. `questionGenerator.ts` 中的提示詞對english-oral類別虽然說"題目用英文表達"，但參考答案、標籤可能是中文
2. `feedbackGenerator.ts` 中明確要求"所有文字內容使用繁体中文"，導致english-oral的反馈也是中文
3. 前端没有特殊处理，統一显示所有內容

## Goals / Non-Goals

**Goals:**
- 確保english-oral類別的所有AI生成內容（題目、答案、反馈）使用英文
- 保持其他類別（chinese-oral等）的中文输出不变
- 提供清晰的語言規范，便于未來扩展其他語言類別

**Non-Goals:**
- 不处理用户输入的答案語言（由用户自由選擇）
- 不翻译现有數據庫中的历史數據（仅影响新生成的內容）
- 不改变前端UI界面的語言（仍使用中文UI）

## Decisions

### 决策1：按類別動態切换提示詞語言，明確限定输出語言

**選擇：** 在AI服務层根據category動態調整提示詞的語言和示例，并在提示詞開头明確指定输出語言

**理由：**
- 集中管理語言規則，易于維护
- 明確的語言指令可以提高AI遵循的準確性
- DeepSeek等模型支持多語言，必须明確指定才能保证输出語言
- 可扩展到未來可能的多語言支持
- 不需要修改API层和前端代碼

**關键要求：**
1. **提示詞開头必须明確指定語言**：`IMPORTANT: You MUST respond in English ONLY.`
2. **所有說明和示例使用目標語言**：提示詞的所有內容都用英文
3. **JSON格式要求中標注字段語言**：明確說明每个字段的值必须是英文

**实现：**
```typescript
// questionGenerator.ts
if (category === 'english-oral') {
  prompt = `IMPORTANT: You MUST respond in English ONLY. All content must be in English.

You are an experienced Hong Kong secondary school interview tutor. 
Please generate ${count} interview questions for the English Oral category.

Requirements:
- ALL content MUST be in English (question text, reference answer, tags)
- Difficulty: ${difficultyName}
- Suitable for P5-P6 students (10-12 years old)
- Focus on: self-introduction, daily conversation, picture description, impromptu speech
- Assess: grammar, vocabulary, fluency, expression ability

Return in JSON array format with ALL fields in English:
[
  {
    "question_text": "Please introduce yourself in English, including your name, hobbies, and why you want to join our school.",
    "reference_answer": "Key points: 1. Clear self-introduction structure (name-hobbies-reason) 2. Use complete sentences and correct grammar 3. Show understanding and aspiration for the school 4. Demonstrate personal characteristics and strengths",
    "tags": ["self-introduction", "English oral", "school awareness"]
  }
]

Now generate ${count} questions:`;
} else {
  prompt = `你是一位資深的香港升中面試辅導老师。请生成 ${count} 道...`;
}
```

**替代方案：**
- 方案A：所有提示詞使用英文，靠AI理解類別自動選擇語言
  - 缺點：不可靠，AI可能混用語言
- 方案B：創建单独的englishQuestionGenerator.ts
  - 缺點：代碼重复，維护成本高

### 决策2：反馈生成也根據類別切换語言，明確限定输出語言

**選擇：** feedbackGenerator.ts 检测到 category === 'english-oral' 時使用英文提示詞和英文输出要求，并在開头明確指定語言

**理由：**
- 与題目生成邏輯一致
- 確保完整的英語訓練体验
- 學生看到英文反馈更符合真实面試场景
- 明確的語言指令確保AI不會混用中英文

**關键要求：**
1. **提示詞開头明確指定語言**：`IMPORTANT: You MUST respond in English ONLY.`
2. **所有字段說明使用英文**
3. **示例內容全部使用英文**

**实现：**
```typescript
// feedbackGenerator.ts
if (category === 'english-oral') {
  prompt = `IMPORTANT: You MUST respond in English ONLY. All feedback content must be in English.

You are an experienced Hong Kong secondary school interview tutor.
Please analyze the student's English oral response and provide detailed feedback in English.

Question Information:
Category: English Oral
Question: ${question_text}${schoolContext}

Student's Answer:
${answer_text}
${reference_answer ? `\nReference Answer:\n${reference_answer}` : ''}

Return in JSON format with ALL FIELDS IN ENGLISH:
{
  "score": 7.5,
  "strengths": "Good grammar, fluent expression",
  "weaknesses": "Limited vocabulary, lack of specific examples",
  "suggestions": "Consider adding specific examples to support your points. You could use more sophisticated vocabulary...",
  "reference_thinking": "To answer this question: First, introduce yourself clearly. Second, explain your hobbies with details. Finally, connect your interests with the school's values.",
  "reference_answer": "An excellent response would be: Hello, my name is... I am passionate about... I would like to join your school because...",
  "language_score": 85,
  "content_score": 78,
  "overall_score": 82
}

Scoring Criteria:
- score (simplified): 0-10 scale (decimal), easy for students to understand
- language_score: 0-100, assess grammar, vocabulary, fluency
- content_score: 0-100, assess relevance, completeness, depth of insight
- overall_score: 0-100

Requirements:
1. score is simplified version (0-10), 6-8 is reasonable for primary students
2. strengths: briefly list 2-3 strong points in English
3. weaknesses: briefly list 2-3 areas for improvement in English
4. suggestions: specific actionable improvement suggestions in English (80-150 words)
5. reference_thinking: MUST provide clear answer structure in English (3-5 key points)
6. reference_answer: MUST provide an excellent sample answer in English (150-250 words)

Now analyze and return the feedback:`;
} else {
  // 原有中文提示詞
  prompt = `你是一位資深的香港升中面試辅導老师...`;
}
```

### 决策3：前端不做翻译，保持原樣显示

**選擇：** 前端显示時不检测語言，直接渲染API返回的內容

**理由：**
- 简单直接，符合"所见即所得"原則
- 避免前端增加复杂的語言检测和翻译邏輯
- 用户界面標籤仍然是中文（如"題目：""反馈："），內容語言由後端控制

### 决策4：語言验证作为可選的质量检查

**選擇：** 在questionGenerator中添加简单的語言检测，但仅記錄警告，不阻止保存

**理由：**
- AI偶尔可能出错，不应完全阻止題目生成
- 記錄警告便于後续人工复核
- 保持係統健壮性

**实现：**
```typescript
// 简单的語言检测函數
function detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const totalChars = text.replace(/\s/g, '').length;
  const chineseRatio = chineseChars.length / totalChars;
  
  if (chineseRatio > 0.3) return 'zh';
  if (chineseRatio > 0.05) return 'mixed';
  return 'en';
}

// 在生成題目後验证
if (category === 'english-oral') {
  const lang = detectLanguage(q.question_text);
  if (lang !== 'en') {
    console.warn(`⚠️ 題目語言不符合预期: ${lang}, 題目ID=${questionId}`);
  }
}
```

## Risks / Trade-offs

**風险1：AI不遵守語言指令**
- 風险：即使提示詞明確要求英文，AI仍可能返回中文
- 缓解：使用temperature=0.7（较低）提高一致性；添加多个英文示例
- 回退：人工复核和编輯有問題的題目

**風险2：现有历史數據語言不統一**
- 風险：數據庫中已有的english-oral題目可能是中文
- 缓解：仅影响新生成的內容，不修改历史數據
- 回退：如需清理，可运行數據迁移脚本標記或删除非英文題目

**权衡1：英文反馈 vs 學生理解難度**
- 权衡：全英文反馈可能導致部分學生理解困難
- 决策：坚持英文，因为：
  1. 目標是訓練英語面試，理解英文反馈本身就是訓練的一部分
  2. 家長可以帮助解释
  3. 未來可以添加"翻译"按钮作为辅助功能
- 监控：收集用户反馈，評估是否需要添加翻译功能

## Migration Plan

**步骤1：代碼修改（不影响现有數據）**
1. 修改 questionGenerator.ts
2. 修改 feedbackGenerator.ts
3. 部署到测試环境

**步骤2：测試验证**
1. 生成10道english-oral題目，验证全英文
2. 提交答案并生成反馈，验证全英文
3. 检查前端显示效果

**步骤3：生产部署**
1. 部署後端代碼
2. 重启服務
3. 无需數據庫迁移

**步骤4：數據清理（可選）**
1. 查询现有english-oral題目的語言分布
2. 標記或删除非英文題目（如果需要）
3. 重新生成英文題目

**回滚計劃：**
- 如果發现問題，回滚代碼到上一版本
- 不影响现有數據，回滚无風险

## Open Questions

1. **是否需要在前端添加"翻译"按钮？**
   - 决策推迟：先部署全英文版本，收集用户反馈再决定
   
2. **其他類別是否也需要語言規范？**
   - 当前：只处理english-oral
   - 未來：chinese-oral应强制中文，logic-thinking可以中英混合
   
3. **是否需要支持用户手動切换反馈語言？**
   - 决策推迟：MVP阶段不支持，根據用户需求再考虑
