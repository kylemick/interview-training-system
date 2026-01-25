/**
 * AI 生成工具路由
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { generateSchoolProfile } from '../ai/schoolProfile.js';
import { generateQuestions } from '../ai/questionGenerator.js';
import { insert, query } from '../db/index.js';

const router = Router();

/**
 * AI 生成学校档案
 * POST /api/ai/generate-school
 * Body: { schoolName: string }
 */
router.post('/generate-school', async (req: Request, res: Response) => {
  try {
    const { schoolName } = req.body;

    if (!schoolName || !schoolName.trim()) {
      throw new AppError(400, '请提供学校名称');
    }

    console.log(`🤖 AI 生成学校档案: ${schoolName}`);

    // 调用 AI 服务生成学校档案
    const schoolProfile = await generateSchoolProfile(schoolName.trim());

    res.json({
      success: true,
      data: schoolProfile,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 生成学校档案失败:', error);
    throw new AppError(500, 'AI 生成失败，请重试');
  }
});

/**
 * AI 生成题目
 * POST /api/ai/generate-questions
 * Body: { category, difficulty, count?, school_code?, topic?, save? }
 */
router.post('/generate-questions', async (req: Request, res: Response) => {
  try {
    const { category, difficulty, count = 5, school_code, topic, save = false } = req.body;

    // 验证必填字段
    if (!category || !difficulty) {
      throw new AppError(400, '缺少必填字段：category, difficulty');
    }

    // 验证数量
    const questionCount = parseInt(count);
    if (isNaN(questionCount) || questionCount < 1 || questionCount > 20) {
      throw new AppError(400, '题目数量必须在 1-20 之间');
    }

    console.log(`🤖 AI 生成题目: ${category} (${difficulty}) x ${questionCount}`);
    const questions = await generateQuestions({
      category,
      difficulty,
      count: questionCount,
      school_code,
      topic,
    });

    // 如果需要保存到数据库
    if (save) {
      console.log(`💾 保存 ${questions.length} 道题目到数据库...`);
      const savedIds: number[] = [];

      for (const q of questions) {
        const id = await insert(
          `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [category, q.question_text, difficulty, q.reference_answer, JSON.stringify(q.tags), school_code || null, 'ai_generated']
        );
        savedIds.push(id);
      }

      console.log(`✅ 已保存 ${savedIds.length} 道题目`);

      res.json({
        success: true,
        message: `成功生成并保存 ${questions.length} 道题目`,
        data: questions.map((q, i) => ({ ...q, id: savedIds[i] })),
      });
    } else {
      res.json({
        success: true,
        message: `成功生成 ${questions.length} 道题目（未保存）`,
        data: questions,
      });
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 生成题目失败:', error);
    throw new AppError(500, 'AI 生成失败，请重试');
  }
});

/**
 * AI 分析面试回忆文本并提取问答对
 * POST /api/ai/extract-interview-memory
 * Body: { text, category?, school_code? }
 */
router.post('/extract-interview-memory', async (req: Request, res: Response) => {
  try {
    const { text, category, school_code } = req.body;

    if (!text || !text.trim()) {
      throw new AppError(400, '请提供面试回忆文本');
    }

    console.log(`🤖 AI 分析面试回忆文本 (${text.length} 字)...`);

    // 调用 DeepSeek API 分析文本
    const { deepseekClient } = await import('../ai/deepseek.js');
    
    const prompt = `你是一个面试题目提取和弱点分析专家。请从以下香港升中面试回忆文本中：
1. 提取所有的面试问题
2. 分析学生的表现弱点
3. 对每个问题的分类进行置信度评估

面试回忆文本：
"""
${text.trim()}
"""

专项类别定义（七大类别）：
- english-oral: 英文口语（自我介绍、日常对话、看图说话、即兴演讲）
- chinese-oral: 中文表达（朗读、时事讨论、阅读理解、观点阐述）
- logic-thinking: 逻辑思维（数学应用题、推理题、解难题、脑筋急转弯）
- current-affairs: 时事常识（新闻热点、社会议题、香港本地事务、国际事件）
- science-knowledge: 科学常识（科学原理、生活中的科学、环境保护、科技发展、STEM相关话题）
- personal-growth: 个人成长（兴趣爱好、学习经历、志向抱负、自我认知）
- group-discussion: 小组讨论（合作技巧、表达观点、倾听回应、领导协调）

分类示例（正确分类）：
- "Tell me about your favorite book." → english-oral (置信度: 0.95)
- "你觉得什么是领导力？" → chinese-oral (置信度: 0.90)
- "如果1+1=2，那么2+2等于多少？" → logic-thinking (置信度: 0.98)
- "你对香港最近的新闻有什么看法？" → current-affairs (置信度: 0.85)
- "为什么天空是蓝色的？" → science-knowledge (置信度: 0.92)
- "你平时有什么兴趣爱好？" → personal-growth (置信度: 0.88)
- "在小组讨论中，你如何表达不同意见？" → group-discussion (置信度: 0.90)

常见误分类模式（避免）：
- 不要将英文问题误分类为 chinese-oral
- 不要将逻辑题误分类为 science-knowledge
- 不要将个人成长问题误分类为 group-discussion
- 注意区分 current-affairs 和 chinese-oral（时事讨论类）

请按照以下JSON格式返回分析结果：
{
  "questions": [
    {
      "question_text": "面试官问的问题",
      "category": "专项类别（必须从七大类别中选择一个）",
      "classification_confidence": 0.85,
      "difficulty": "难度（easy/medium/hard）",
      "reference_answer": "建议答案要点",
      "tags": ["标签1", "标签2"],
      "notes": "从文本中提取的原始回答或备注"
    }
  ],
  "weaknesses": [
    {
      "category": "专项类别",
      "weakness_type": "弱点类型（vocabulary/grammar/logic/knowledge_gap/confidence/expression）",
      "description": "弱点描述（具体说明问题所在）",
      "example_text": "体现弱点的原文片段",
      "severity": "严重程度（low/medium/high）",
      "improvement_suggestions": "具体的改进建议",
      "related_topics": ["相关话题1", "相关话题2"]
    }
  ],
  "summary": "对这次面试的整体分析和特点总结"
}

注意：
1. 问题提取：只提取明确的问题，不要臆造
2. 分类要求：
   - 必须从七大类别中选择一个最合适的类别
   - 每个分类必须提供置信度分数（0-1之间的小数）
   - 置信度低于0.7的分类应标记为"待确认"
   - 如果问题涉及多个类别，选择最主要的类别
3. 弱点分析：基于学生的实际回答进行分析
4. 弱点类型说明：
   - vocabulary: 词汇量不足
   - grammar: 语法错误
   - logic: 逻辑不清晰
   - knowledge_gap: 知识盲区
   - confidence: 信心不足、表达犹豫
   - expression: 表达能力弱
5. 严重程度评估要客观合理
6. 改进建议要具体可操作`;

    const response = await deepseekClient.chat([
      { role: 'user', content: prompt }
    ]);
    
    // 解析返回的JSON
    let extractedData;
    try {
      // 尝试从返回的文本中提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从AI响应中提取JSON');
      }
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      throw new AppError(500, 'AI返回格式错误，请重试');
    }

    // 如果用户指定了类别或学校，覆盖AI的判断
    if (category || school_code) {
      extractedData.questions = extractedData.questions.map((q: any) => ({
        ...q,
        ...(category && { category }),
        ...(school_code && { school_code }),
      }));
    }

    // 确保每个问题都有分类置信度，如果没有则设置为默认值
    extractedData.questions = extractedData.questions.map((q: any) => ({
      ...q,
      classification_confidence: q.classification_confidence ?? 0.8,
      classification_source: 'auto',
    }));

    console.log(`✅ 成功提取 ${extractedData.questions.length} 个问题`);

    res.json({
      success: true,
      message: `成功提取 ${extractedData.questions.length} 个问题`,
      data: extractedData,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('AI 分析面试回忆失败:', error);
    throw new AppError(500, 'AI 分析失败，请重试');
  }
});

/**
 * 保存学生弱点分析
 * POST /api/ai/save-weaknesses
 * Body: { weaknesses: Array<Weakness>, student_name?, source_text? }
 */
router.post('/save-weaknesses', async (req: Request, res: Response) => {
  try {
    const { weaknesses, student_name, source_text } = req.body;

    if (!weaknesses || !Array.isArray(weaknesses) || weaknesses.length === 0) {
      throw new AppError(400, '请提供要保存的弱点分析列表');
    }

    console.log(`💾 保存 ${weaknesses.length} 条弱点分析...`);
    const savedIds: number[] = [];

    for (const w of weaknesses) {
      const id = await insert(
        `INSERT INTO student_weaknesses 
        (student_name, category, weakness_type, description, example_text, severity, improvement_suggestions, related_topics, source_text, identified_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          student_name || null,
          w.category,
          w.weakness_type,
          w.description,
          w.example_text || null,
          w.severity || 'medium',
          w.improvement_suggestions || '',
          JSON.stringify(w.related_topics || []),
          source_text || null,
          'ai',
        ]
      );
      savedIds.push(id);
    }

    console.log(`✅ 已保存 ${savedIds.length} 条弱点分析`);

    res.json({
      success: true,
      message: `成功保存 ${savedIds.length} 条弱点分析`,
      data: { savedIds },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('保存弱点分析失败:', error);
    throw new AppError(500, '保存失败，请重试');
  }
});

/**
 * 保存面试回忆提取的问题到题库
 * POST /api/ai/save-interview-questions
 * Body: { questions: Array<Question>, source_text?: string }
 */
router.post('/save-interview-questions', async (req: Request, res: Response) => {
  try {
    const { questions, source_text } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new AppError(400, '请提供要保存的问题列表');
    }

    console.log(`💾 保存 ${questions.length} 道面试回忆题目...`);
    const savedIds: number[] = [];

    // 检查新字段是否存在（只检查一次）
    let hasNotes = false;
    let hasClassificationFields = false;
    try {
      const columns = await query(`SHOW COLUMNS FROM questions`);
      const columnNames = columns.map((col: any) => col.Field);
      hasNotes = columnNames.includes('notes');
      hasClassificationFields = columnNames.includes('classification_confidence');
    } catch (e) {
      console.warn('无法检查表结构，使用基础字段:', e);
    }

    for (const q of questions) {
      let sql = `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source`;
      let values: any[] = [
        q.category,
        q.question_text,
        q.difficulty || 'medium',
        q.reference_answer || '',
        JSON.stringify(q.tags || []),
        q.school_code || null,
        'interview_memory',
      ];

      if (hasNotes) {
        sql += `, notes`;
        values.push(q.notes || source_text || null);
      }

      if (hasClassificationFields) {
        sql += `, classification_confidence, classification_source, last_classified_at`;
        values.push(q.classification_confidence ?? 0.8);
        values.push(q.classification_source || 'auto');
        values.push(new Date());
      }

      sql += `) VALUES (${values.map(() => '?').join(', ')})`;

      const id = await insert(sql, values);
      savedIds.push(id);
    }

    console.log(`✅ 已保存 ${savedIds.length} 道题目到题库`);

    res.json({
      success: true,
      message: `成功保存 ${savedIds.length} 道题目到题库`,
      data: { savedIds },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('保存面试回忆题目失败:', error);
    throw new AppError(500, '保存失败，请重试');
  }
});

/**
 * 根据学生弱点生成针对性题目
 * POST /api/ai/generate-questions-from-weaknesses
 * Body: { weakness_ids?: number[], category?, count? }
 */
router.post('/generate-questions-from-weaknesses', async (req: Request, res: Response) => {
  try {
    const { weakness_ids, category, count = 5 } = req.body;

    // 获取弱点信息
    let weaknesses: any[] = [];
    const { query } = await import('../db/index.js');

    if (weakness_ids && weakness_ids.length > 0) {
      // 根据ID获取指定弱点
      const placeholders = weakness_ids.map(() => '?').join(',');
      weaknesses = await query(
        `SELECT * FROM student_weaknesses WHERE id IN (${placeholders}) AND status = 'active'`,
        weakness_ids
      );
    } else if (category) {
      // 获取该类别的所有活跃弱点
      weaknesses = await query(
        `SELECT * FROM student_weaknesses WHERE category = ? AND status = 'active' ORDER BY severity DESC, created_at DESC LIMIT 5`,
        [category]
      );
    } else {
      throw new AppError(400, '请提供 weakness_ids 或 category');
    }

    if (weaknesses.length === 0) {
      throw new AppError(404, '未找到相关弱点记录');
    }

    console.log(`🤖 根据 ${weaknesses.length} 个弱点生成针对性题目...`);

    // 构建AI提示词
    const weaknessDescriptions = weaknesses.map((w: any) => 
      `- ${w.description} (类型: ${w.weakness_type}, 严重程度: ${w.severity})`
    ).join('\n');

    const { deepseekClient } = await import('../ai/deepseek.js');
    
    const prompt = `你是一个香港升中面试题目生成专家。请根据以下学生的弱点，生成 ${count} 道针对性的练习题目。

学生弱点分析：
${weaknessDescriptions}

要求：
1. 题目要针对上述弱点进行强化训练
2. 难度要适中，既能挑战学生又不会过难
3. 题目要实用，贴近真实面试场景
4. 每道题目要有清晰的训练目标

请按照以下JSON格式返回：
{
  "questions": [
    {
      "question_text": "题目内容",
      "category": "专项类别",
      "difficulty": "medium",
      "reference_answer": "参考答案要点",
      "tags": ["标签1", "标签2"],
      "target_weakness": "针对的弱点类型",
      "training_focus": "训练重点说明"
    }
  ]
}`;

    const response = await deepseekClient.chat([
      { role: 'user', content: prompt }
    ]);

    // 解析返回的JSON
    let generatedData;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('无法从AI响应中提取JSON');
      }
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      throw new AppError(500, 'AI返回格式错误，请重试');
    }

    // 保存生成的题目到数据库
    const savedIds: number[] = [];
    for (const q of generatedData.questions) {
      const id = await insert(
        `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, source, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          q.category,
          q.question_text,
          q.difficulty || 'medium',
          q.reference_answer || '',
          JSON.stringify(q.tags || []),
          'ai_generated_targeted',
          `针对弱点: ${q.target_weakness}. ${q.training_focus || ''}`,
        ]
      );
      savedIds.push(id);
    }

    // 更新弱点的练习次数
    for (const weakness of weaknesses) {
      await query(
        `UPDATE student_weaknesses SET practice_count = practice_count + 1, updated_at = NOW() WHERE id = ?`,
        [weakness.id]
      );
    }

    console.log(`✅ 已生成并保存 ${savedIds.length} 道针对性题目`);

    res.json({
      success: true,
      message: `成功生成 ${savedIds.length} 道针对性题目`,
      data: {
        questions: generatedData.questions.map((q: any, i: number) => ({
          ...q,
          id: savedIds[i],
        })),
        targeted_weaknesses: weaknesses.map((w: any) => ({
          id: w.id,
          description: w.description,
          weakness_type: w.weakness_type,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('生成针对性题目失败:', error);
    throw new AppError(500, '生成失败，请重试');
  }
});

/**
 * 测试 API 连接
 * POST /api/ai/test-connection
 * Body: { api_key?: string }
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { api_key } = req.body;
    
    // 临时设置API Key（如果提供）
    const originalKey = process.env.DEEPSEEK_API_KEY;
    if (api_key) {
      process.env.DEEPSEEK_API_KEY = api_key;
    }

    console.log('🔍 测试 DeepSeek API 连接...');

    const { deepseekClient } = await import('../ai/deepseek.js');
    const response = await deepseekClient.chat([
      { role: 'user', content: '请回复"连接成功"' }
    ]);

    // 恢复原始API Key
    if (api_key && originalKey) {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }

    console.log('✅ API 连接测试成功');

    res.json({
      success: true,
      message: 'API Key 验证成功',
      data: { response: response.substring(0, 100) },
    });
  } catch (error: any) {
    console.error('API 连接测试失败:', error);
    
    // 根据错误类型返回不同消息
    let message = 'API Key 验证失败';
    if (error.message?.includes('401')) {
      message = 'API Key 无效或已过期';
    } else if (error.message?.includes('429')) {
      message = 'API 调用频率超限，请稍后重试';
    } else if (error.message?.includes('network') || error.code === 'ECONNREFUSED') {
      message = '网络连接失败，请检查网络设置';
    }
    
    throw new AppError(400, message);
  }
});

export default router;
