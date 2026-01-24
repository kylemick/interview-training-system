/**
 * AI 生成工具路由
 */
import { Router, Request, Response } from 'express';
import { generateSchoolProfile } from '../ai/schoolProfile.js';
import { AppError } from '../middleware/errorHandler.js';

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

export default router;
