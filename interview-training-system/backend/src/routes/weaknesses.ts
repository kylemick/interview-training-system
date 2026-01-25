/**
 * 学生弱点管理路由
 */
import { Router, Request, Response } from 'express';
import { query, queryOne, insert, execute } from '../db/index.js';
import { AppError } from '../middleware/errorHandler.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

const router = Router();

/**
 * 从设置文件读取学生信息
 */
async function getStudentInfoFromSettings(): Promise<{ student_name: string; target_school?: string }> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    return {
      student_name: settings.student_name || '学生',
      target_school: settings.target_school,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默认值
      return { student_name: '学生' };
    }
    console.error('读取设置失败:', error);
    return { student_name: '学生' };
  }
}

/**
 * 获取学生弱点列表
 * GET /api/weaknesses?student_name=&category=&status=&severity=
 * 注意：如果没有提供student_name，则从设置获取
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    let { student_name, category, status, severity } = req.query;

    // 如果没有提供student_name，从设置获取
    if (!student_name) {
      const settings = await getStudentInfoFromSettings();
      student_name = settings.student_name;
    }

    let sql = 'SELECT * FROM student_weaknesses WHERE 1=1';
    const params: any[] = [];

    if (student_name) {
      sql += ' AND student_name = ?';
      params.push(student_name);
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (severity) {
      sql += ' AND severity = ?';
      params.push(severity);
    }

    sql += ' ORDER BY severity DESC, created_at DESC';

    const weaknesses = await query(sql, params);

    res.json({
      success: true,
      data: weaknesses,
    });
  } catch (error) {
    console.error('获取弱点列表失败:', error);
    throw new AppError(500, '获取弱点列表失败');
  }
});

/**
 * 获取单个弱点详情
 * GET /api/weaknesses/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const weakness = await queryOne(
      'SELECT * FROM student_weaknesses WHERE id = ?',
      [id]
    );

    if (!weakness) {
      throw new AppError(404, '弱点记录不存在');
    }

    res.json({
      success: true,
      data: weakness,
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('获取弱点详情失败:', error);
    throw new AppError(500, '获取弱点详情失败');
  }
});

/**
 * 更新弱点状态
 * PATCH /api/weaknesses/:id/status
 * Body: { status: 'active' | 'improved' | 'resolved' }
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'improved', 'resolved'].includes(status)) {
      throw new AppError(400, '无效的状态值');
    }

    await execute(
      'UPDATE student_weaknesses SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    res.json({
      success: true,
      message: '状态已更新',
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error('更新弱点状态失败:', error);
    throw new AppError(500, '更新状态失败');
  }
});

/**
 * 删除弱点记录
 * DELETE /api/weaknesses/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await execute('DELETE FROM student_weaknesses WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '弱点记录已删除',
    });
  } catch (error) {
    console.error('删除弱点记录失败:', error);
    throw new AppError(500, '删除失败');
  }
});

/**
 * 获取弱点统计
 * GET /api/weaknesses/stats/summary
 * 注意：如果没有提供student_name，则从设置获取
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    let { student_name } = req.query;

    // 如果没有提供student_name，从设置获取
    if (!student_name) {
      const settings = await getStudentInfoFromSettings();
      student_name = settings.student_name;
    }

    let whereClause = '1=1';
    const params: any[] = [];

    if (student_name) {
      whereClause = 'student_name = ?';
      params.push(student_name);
    }

    // 按类别统计
    const byCategory = await query(
      `SELECT category, COUNT(*) as count FROM student_weaknesses WHERE ${whereClause} GROUP BY category`,
      params
    );

    // 按弱点类型统计
    const byType = await query(
      `SELECT weakness_type, COUNT(*) as count FROM student_weaknesses WHERE ${whereClause} GROUP BY weakness_type`,
      params
    );

    // 按严重程度统计
    const bySeverity = await query(
      `SELECT severity, COUNT(*) as count FROM student_weaknesses WHERE ${whereClause} GROUP BY severity`,
      params
    );

    // 按状态统计
    const byStatus = await query(
      `SELECT status, COUNT(*) as count FROM student_weaknesses WHERE ${whereClause} GROUP BY status`,
      params
    );

    // 总数
    const [total] = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM student_weaknesses WHERE ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: {
        total: total?.count || 0,
        by_category: byCategory,
        by_type: byType,
        by_severity: bySeverity,
        by_status: byStatus,
      },
    });
  } catch (error) {
    console.error('获取弱点统计失败:', error);
    throw new AppError(500, '获取统计失败');
  }
});

/**
 * 获取弱点趋势分析
 * GET /api/weaknesses/stats/trends?student_name=&days=30
 * 注意：如果没有提供student_name，则从设置获取
 */
router.get('/stats/trends', async (req: Request, res: Response) => {
  try {
    let { student_name, days = 30 } = req.query;

    // 如果没有提供student_name，从设置获取
    if (!student_name) {
      const settings = await getStudentInfoFromSettings();
      student_name = settings.student_name;
    }

    let whereClause = '1=1';
    const params: any[] = [];

    if (student_name) {
      whereClause = 'student_name = ?';
      params.push(student_name);
    }

    // 获取指定天数内的弱点数据
    const weaknesses = await query(
      `SELECT 
        id, category, weakness_type, severity, status, practice_count, 
        created_at, updated_at
       FROM student_weaknesses 
       WHERE ${whereClause} 
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY created_at ASC`,
      [...params, Number(days)]
    );

    // 计算趋势
    const trends = {
      // 按周统计新增弱点数
      weekly_new_weaknesses: [] as any[],
      
      // 按弱点类型统计改善情况
      improvement_by_type: [] as any[],
      
      // 高严重度弱点的变化
      high_severity_trend: [] as any[],
      
      // 练习次数与状态改善的关系
      practice_effectiveness: [] as any[],
    };

    // 1. 按周统计新增弱点
    const weeklyMap = new Map<string, number>();
    weaknesses.forEach((w: any) => {
      const weekStart = new Date(w.created_at);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 周一
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1);
    });
    trends.weekly_new_weaknesses = Array.from(weeklyMap.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // 2. 按类型统计改善情况
    const typeMap = new Map<string, { total: number; improved: number; resolved: number }>();
    weaknesses.forEach((w: any) => {
      if (!typeMap.has(w.weakness_type)) {
        typeMap.set(w.weakness_type, { total: 0, improved: 0, resolved: 0 });
      }
      const stats = typeMap.get(w.weakness_type)!;
      stats.total++;
      if (w.status === 'improved') stats.improved++;
      if (w.status === 'resolved') stats.resolved++;
    });
    trends.improvement_by_type = Array.from(typeMap.entries()).map(([type, stats]) => ({
      weakness_type: type,
      ...stats,
      improvement_rate: stats.total > 0 ? ((stats.improved + stats.resolved) / stats.total * 100).toFixed(1) : '0.0',
    }));

    // 3. 高严重度弱点趋势（按周）
    const highSeverityByWeek = new Map<string, number>();
    weaknesses.filter((w: any) => w.severity === 'high').forEach((w: any) => {
      const weekStart = new Date(w.created_at);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      highSeverityByWeek.set(weekKey, (highSeverityByWeek.get(weekKey) || 0) + 1);
    });
    trends.high_severity_trend = Array.from(highSeverityByWeek.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // 4. 练习效果分析（练习次数与状态改善的关系）
    const practiceRanges = [
      { range: '0', min: 0, max: 0 },
      { range: '1-3', min: 1, max: 3 },
      { range: '4-10', min: 4, max: 10 },
      { range: '10+', min: 11, max: 9999 },
    ];
    trends.practice_effectiveness = practiceRanges.map((r) => {
      const inRange = weaknesses.filter(
        (w: any) => w.practice_count >= r.min && w.practice_count <= r.max
      );
      const improved = inRange.filter((w: any) => w.status === 'improved' || w.status === 'resolved').length;
      return {
        practice_range: r.range,
        total: inRange.length,
        improved,
        improvement_rate: inRange.length > 0 ? ((improved / inRange.length) * 100).toFixed(1) : '0.0',
      };
    });

    res.json({
      success: true,
      data: {
        period_days: Number(days),
        total_weaknesses: weaknesses.length,
        trends,
        // 提供一些关键洞察
        insights: {
          most_common_weakness: trends.improvement_by_type.sort((a, b) => b.total - a.total)[0]?.weakness_type || 'N/A',
          best_improved_type: trends.improvement_by_type.sort((a, b) => 
            parseFloat(b.improvement_rate as string) - parseFloat(a.improvement_rate as string)
          )[0]?.weakness_type || 'N/A',
          high_severity_count: weaknesses.filter((w: any) => w.severity === 'high' && w.status === 'active').length,
        },
      },
    });
  } catch (error) {
    console.error('获取弱点趋势失败:', error);
    throw new AppError(500, '获取趋势失败');
  }
});

export default router;
