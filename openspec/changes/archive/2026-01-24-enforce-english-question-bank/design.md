# Design: 英文题库语言强制规范

## Context
当前系统在AI生成english-oral（英文口语）专项的题目和反馈时，由于提示词没有明确语言要求，导致AI可能返回中文内容。这不符合英语面试训练的真实场景，影响学生的英语学习体验。

**现状问题：**
1. `questionGenerator.ts` 中的提示词对english-oral类别虽然说"题目用英文表达"，但参考答案、标签可能是中文
2. `feedbackGenerator.ts` 中明确要求"所有文字内容使用繁体中文"，导致english-oral的反馈也是中文
3. 前端没有特殊处理，统一显示所有内容

## Goals / Non-Goals

**Goals:**
- 确保english-oral类别的所有AI生成内容（题目、答案、反馈）使用英文
- 保持其他类别（chinese-oral等）的中文输出不变
- 提供清晰的语言规范，便于未来扩展其他语言类别

**Non-Goals:**
- 不处理用户输入的答案语言（由用户自由选择）
- 不翻译现有数据库中的历史数据（仅影响新生成的内容）
- 不改变前端UI界面的语言（仍使用中文UI）

## Decisions

### 决策1：按类别动态切换提示词语言，明确限定输出语言

**选择：** 在AI服务层根据category动态调整提示词的语言和示例，并在提示词开头明确指定输出语言

**理由：**
- 集中管理语言规则，易于维护
- 明确的语言指令可以提高AI遵循的准确性
- DeepSeek等模型支持多语言，必须明确指定才能保证输出语言
- 可扩展到未来可能的多语言支持
- 不需要修改API层和前端代码

**关键要求：**
1. **提示词开头必须明确指定语言**：`IMPORTANT: You MUST respond in English ONLY.`
2. **所有说明和示例使用目标语言**：提示词的所有内容都用英文
3. **JSON格式要求中标注字段语言**：明确说明每个字段的值必须是英文

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
  prompt = `你是一位资深的香港升中面试辅导老师。请生成 ${count} 道...`;
}
```

**替代方案：**
- 方案A：所有提示词使用英文，靠AI理解类别自动选择语言
  - 缺点：不可靠，AI可能混用语言
- 方案B：创建单独的englishQuestionGenerator.ts
  - 缺点：代码重复，维护成本高

### 决策2：反馈生成也根据类别切换语言，明确限定输出语言

**选择：** feedbackGenerator.ts 检测到 category === 'english-oral' 时使用英文提示词和英文输出要求，并在开头明确指定语言

**理由：**
- 与题目生成逻辑一致
- 确保完整的英语训练体验
- 学生看到英文反馈更符合真实面试场景
- 明确的语言指令确保AI不会混用中英文

**关键要求：**
1. **提示词开头明确指定语言**：`IMPORTANT: You MUST respond in English ONLY.`
2. **所有字段说明使用英文**
3. **示例内容全部使用英文**

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
  // 原有中文提示词
  prompt = `你是一位资深的香港升中面试辅导老师...`;
}
```

### 决策3：前端不做翻译，保持原样显示

**选择：** 前端显示时不检测语言，直接渲染API返回的内容

**理由：**
- 简单直接，符合"所见即所得"原则
- 避免前端增加复杂的语言检测和翻译逻辑
- 用户界面标签仍然是中文（如"题目：""反馈："），内容语言由后端控制

### 决策4：语言验证作为可选的质量检查

**选择：** 在questionGenerator中添加简单的语言检测，但仅记录警告，不阻止保存

**理由：**
- AI偶尔可能出错，不应完全阻止题目生成
- 记录警告便于后续人工复核
- 保持系统健壮性

**实现：**
```typescript
// 简单的语言检测函数
function detectLanguage(text: string): 'en' | 'zh' | 'mixed' {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  const totalChars = text.replace(/\s/g, '').length;
  const chineseRatio = chineseChars.length / totalChars;
  
  if (chineseRatio > 0.3) return 'zh';
  if (chineseRatio > 0.05) return 'mixed';
  return 'en';
}

// 在生成题目后验证
if (category === 'english-oral') {
  const lang = detectLanguage(q.question_text);
  if (lang !== 'en') {
    console.warn(`⚠️ 题目语言不符合预期: ${lang}, 题目ID=${questionId}`);
  }
}
```

## Risks / Trade-offs

**风险1：AI不遵守语言指令**
- 风险：即使提示词明确要求英文，AI仍可能返回中文
- 缓解：使用temperature=0.7（较低）提高一致性；添加多个英文示例
- 回退：人工复核和编辑有问题的题目

**风险2：现有历史数据语言不统一**
- 风险：数据库中已有的english-oral题目可能是中文
- 缓解：仅影响新生成的内容，不修改历史数据
- 回退：如需清理，可运行数据迁移脚本标记或删除非英文题目

**权衡1：英文反馈 vs 学生理解难度**
- 权衡：全英文反馈可能导致部分学生理解困难
- 决策：坚持英文，因为：
  1. 目标是训练英语面试，理解英文反馈本身就是训练的一部分
  2. 家长可以帮助解释
  3. 未来可以添加"翻译"按钮作为辅助功能
- 监控：收集用户反馈，评估是否需要添加翻译功能

## Migration Plan

**步骤1：代码修改（不影响现有数据）**
1. 修改 questionGenerator.ts
2. 修改 feedbackGenerator.ts
3. 部署到测试环境

**步骤2：测试验证**
1. 生成10道english-oral题目，验证全英文
2. 提交答案并生成反馈，验证全英文
3. 检查前端显示效果

**步骤3：生产部署**
1. 部署后端代码
2. 重启服务
3. 无需数据库迁移

**步骤4：数据清理（可选）**
1. 查询现有english-oral题目的语言分布
2. 标记或删除非英文题目（如果需要）
3. 重新生成英文题目

**回滚计划：**
- 如果发现问题，回滚代码到上一版本
- 不影响现有数据，回滚无风险

## Open Questions

1. **是否需要在前端添加"翻译"按钮？**
   - 决策推迟：先部署全英文版本，收集用户反馈再决定
   
2. **其他类别是否也需要语言规范？**
   - 当前：只处理english-oral
   - 未来：chinese-oral应强制中文，logic-thinking可以中英混合
   
3. **是否需要支持用户手动切换反馈语言？**
   - 决策推迟：MVP阶段不支持，根据用户需求再考虑
