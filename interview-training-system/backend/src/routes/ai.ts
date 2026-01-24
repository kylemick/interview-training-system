/**
 * AI 生成工具路由
 */
import { Router, Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { generateSchoolProfile } from '../ai/schoolProfile.js';
import { generateQuestions } from '../ai/questionGenerator.js';
import { insert } from '../db/index.js';

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

export default router;
