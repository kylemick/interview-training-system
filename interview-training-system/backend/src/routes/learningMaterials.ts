/**
 * 學習素材管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * 獲取學習素材列表
 * GET /api/learning-materials?weakness_id=&category=&weakness_type=&material_type=&search=&page=&pageSize=
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      weakness_id,
      category,
      weakness_type,
      material_type,
      search,
      page = '1',
      pageSize = '20',
    } = req.query;

    let sql = 'SELECT * FROM learning_materials WHERE 1=1';
    const params: any[] = [];

    if (weakness_id) {
      sql += ' AND weakness_id = ?';
      params.push(weakness_id);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (weakness_type) {
      sql += ' AND weakness_type = ?';
      params.push(weakness_type);
    }

    if (material_type) {
      sql += ' AND material_type = ?';
      params.push(material_type);
    }

    if (search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    // 获取總數
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await query<{ total: number }>(countSql, params);
    const total = countResult?.total || 0;

    // 分页
    // 注意：LIMIT 和 OFFSET 不能使用參數绑定，必须直接拼接，但需要確保是安全的數字
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const pageSizeNum = Math.max(1, Math.min(parseInt(pageSize as string) || 20, 100)); // 限制在1-100之間
    const offset = Math.max(0, (pageNum - 1) * pageSizeNum);

    sql += ` ORDER BY created_at DESC LIMIT ${pageSizeNum} OFFSET ${offset}`;

    const materials = await query(sql, params);

    // 解析JSON字段
    const formattedMaterials = materials.map((m: any) => ({
      ...m,
      tags: m.tags ? (typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags) : [],
    }));

    res.json({
      success: true,
      data: formattedMaterials,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (error) {
    console.error('獲取學習素材列表失敗:', error);
    throw new AppError(500, '獲取學習素材列表失敗');
  }
});

/**
 * 獲取單個學習素材詳情
 * GET /api/learning-materials/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const material = await queryOne(
      'SELECT * FROM learning_materials WHERE id = ?',
      [id]
    );

    if (!material) {
      throw new AppError(404, '學習素材不存在');
    }

    // 解析JSON字段
    const formattedMaterial = {
      ...material,
      tags: material.tags ? (typeof material.tags === 'string' ? JSON.parse(material.tags) : material.tags) : [],
    };

    // 如果關聯了弱點，獲取弱點信息
    if (material.weakness_id) {
      const weakness = await queryOne(
        'SELECT id, category, weakness_type, description, severity, status FROM student_weaknesses WHERE id = ?',
        [material.weakness_id]
      );
      formattedMaterial.weakness = weakness;
    }

    res.json({
      success: true,
      data: formattedMaterial,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取學習素材詳情失敗:', error);
    throw new AppError(500, '獲取學習素材詳情失敗');
  }
});

/**
 * 創建學習素材
 * POST /api/learning-materials
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      weakness_id,
      category,
      weakness_type,
      title,
      content,
      material_type = 'text',
      tags = [],
      created_by = 'manual',
    } = req.body;

    // 验证必填字段
    if (!category || !weakness_type || !title || !content) {
      throw new AppError(400, '缺少必填字段：category, weakness_type, title, content');
    }

    // 如果提供了weakness_id，验证弱點是否存在
    if (weakness_id) {
      const weakness = await queryOne(
        'SELECT id FROM student_weaknesses WHERE id = ?',
        [weakness_id]
      );
      if (!weakness) {
        throw new AppError(404, '關聯的弱點不存在');
      }
    }

    const materialId = await insert(
      `INSERT INTO learning_materials 
       (weakness_id, category, weakness_type, title, content, material_type, tags, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        weakness_id || null,
        category,
        weakness_type,
        title,
        content,
        material_type,
        JSON.stringify(tags),
        created_by,
      ]
    );

    // 獲取創建的素材
    const newMaterial = await queryOne(
      'SELECT * FROM learning_materials WHERE id = ?',
      [materialId]
    );

    res.status(201).json({
      success: true,
      message: '學習素材創建成功',
      data: {
        ...newMaterial,
        tags: newMaterial.tags ? (typeof newMaterial.tags === 'string' ? JSON.parse(newMaterial.tags) : newMaterial.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('創建學習素材失敗:', error);
    throw new AppError(500, '創建學習素材失敗');
  }
});

/**
 * 更新學習素材
 * PUT /api/learning-materials/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, material_type, tags, weakness_id } = req.body;

    // 檢查素材是否存在
    const existing = await queryOne(
      'SELECT id FROM learning_materials WHERE id = ?',
      [id]
    );

    if (!existing) {
      throw new AppError(404, '學習素材不存在');
    }

    // 構建更新SQL
    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }

    if (material_type !== undefined) {
      updates.push('material_type = ?');
      params.push(material_type);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    if (weakness_id !== undefined) {
      if (weakness_id) {
        // 驗證弱點是否存在
        const weakness = await queryOne(
          'SELECT id FROM student_weaknesses WHERE id = ?',
          [weakness_id]
        );
        if (!weakness) {
          throw new AppError(404, '關聯的弱點不存在');
        }
      }
      updates.push('weakness_id = ?');
      params.push(weakness_id || null);
    }

    if (updates.length === 0) {
      throw new AppError(400, '沒有提供要更新的字段');
    }

    params.push(id);

    await execute(
      `UPDATE learning_materials SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    // 獲取更新後的素材
    const updatedMaterial = await queryOne(
      'SELECT * FROM learning_materials WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '學習素材更新成功',
      data: {
        ...updatedMaterial,
        tags: updatedMaterial.tags ? (typeof updatedMaterial.tags === 'string' ? JSON.parse(updatedMaterial.tags) : updatedMaterial.tags) : [],
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新學習素材失敗:', error);
    throw new AppError(500, '更新學習素材失敗');
  }
});

/**
 * 刪除學習素材
 * DELETE /api/learning-materials/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 檢查素材是否存在
    const existing = await queryOne(
      'SELECT id FROM learning_materials WHERE id = ?',
      [id]
    );

    if (!existing) {
      throw new AppError(404, '學習素材不存在');
    }

    await execute('DELETE FROM learning_materials WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '學習素材刪除成功',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('刪除學習素材失敗:', error);
    throw new AppError(500, '刪除學習素材失敗');
  }
});

/**
 * 獲取弱點關聯的學習素材
 * GET /api/learning-materials/by-weakness/:weaknessId
 */
router.get('/by-weakness/:weaknessId', async (req: Request, res: Response) => {
  try {
    const { weaknessId } = req.params;

    // 驗證弱點是否存在
    const weakness = await queryOne(
      'SELECT id FROM student_weaknesses WHERE id = ?',
      [weaknessId]
    );

    if (!weakness) {
      throw new AppError(404, '弱點不存在');
    }

    const materials = await query(
      'SELECT * FROM learning_materials WHERE weakness_id = ? ORDER BY created_at DESC',
      [weaknessId]
    );

    // 解析JSON字段
    const formattedMaterials = materials.map((m: any) => ({
      ...m,
      tags: m.tags ? (typeof m.tags === 'string' ? JSON.parse(m.tags) : m.tags) : [],
    }));

    res.json({
      success: true,
      data: formattedMaterials,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('獲取弱點關聯的學習素材失敗:', error);
    throw new AppError(500, '獲取弱點關聯的學習素材失敗');
  }
});

/**
 * 增加素材使用次數
 * POST /api/learning-materials/:id/increment-usage
 */
router.post('/:id/increment-usage', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await execute(
      'UPDATE learning_materials SET usage_count = usage_count + 1 WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '使用次數已更新',
    });
  } catch (error) {
    console.error('更新使用次數失敗:', error);
    throw new AppError(500, '更新使用次數失敗');
  }
});

export default router;
