/**
 * AI学习素材生成服务
 */
import { deepseekClient } from './deepseek.js';
import { AppError } from '../middleware/errorHandler.js';

export interface LearningMaterialRequest {
  weakness_id: number;
  material_type?: 'text' | 'example' | 'tip' | 'practice';
  weakness?: any; // 弱点详细信息
}

export interface GeneratedLearningMaterial {
  title: string;
  content: string;
  material_type: string;
  tags?: string[];
}

/**
 * 根据弱点生成学习素材
 */
export async function generateLearningMaterial(
  params: LearningMaterialRequest
): Promise<GeneratedLearningMaterial> {
  const { weakness_id, material_type = 'text', weakness } = params;

  if (!weakness) {
    throw new AppError(400, '弱点信息不能为空');
  }

  // 弱点类型映射
  const weaknessTypeMap: Record<string, string> = {
    vocabulary: '词汇量',
    grammar: '语法',
    logic: '逻辑思维',
    knowledge_gap: '知识盲区',
    confidence: '自信心',
    expression: '表达能力',
  };

  // 素材类型映射
  const materialTypeMap: Record<string, string> = {
    text: '知识点讲解',
    example: '常见错误示例',
    tip: '改进技巧',
    practice: '练习建议',
  };

  const weaknessTypeName = weaknessTypeMap[weakness.weakness_type] || weakness.weakness_type;
  const materialTypeName = materialTypeMap[material_type] || material_type;

  // 构建AI提示词
  const prompt = `你是一个专业的升中面试培训专家。请为以下学生弱点生成一份${materialTypeName}学习素材。

**弱点信息：**
- 专项类别：${weakness.category}
- 弱点类型：${weaknessTypeName}
- 严重程度：${weakness.severity}
- 弱点描述：${weakness.description}
${weakness.example_text ? `- 示例文本：${weakness.example_text}` : ''}
${weakness.improvement_suggestions ? `- 改进建议：${weakness.improvement_suggestions}` : ''}
${weakness.related_topics ? `- 相关话题：${Array.isArray(weakness.related_topics) ? weakness.related_topics.join('、') : weakness.related_topics}` : ''}

**素材要求：**
1. 针对性强：内容必须针对上述弱点类型和描述
2. 实用性强：提供具体可操作的建议和方法
3. 适合升中面试：内容要贴近香港升中面试场景
4. 结构清晰：使用Markdown格式，包含标题、段落、列表等

**素材类型：${materialTypeName}**

${material_type === 'text' ? `
请生成知识点讲解素材，包括：
- 核心概念说明
- 重要知识点
- 常见应用场景
- 注意事项
` : ''}

${material_type === 'example' ? `
请生成常见错误示例素材，包括：
- 典型错误案例
- 错误原因分析
- 正确做法对比
- 避免错误的技巧
` : ''}

${material_type === 'tip' ? `
请生成改进技巧素材，包括：
- 实用技巧和方法
- 练习建议
- 注意事项
- 快速提升要点
` : ''}

${material_type === 'practice' ? `
请生成练习建议素材，包括：
- 针对性练习方法
- 练习步骤
- 练习重点
- 效果评估方法
` : ''}

请按照以下JSON格式返回：
{
  "title": "素材标题（简洁明了，20字以内）",
  "content": "素材内容（Markdown格式，详细完整）",
  "tags": ["标签1", "标签2", "标签3"]
}

注意：
- title要简洁有力，能概括素材核心内容
- content要详细完整，使用Markdown格式，包含标题、段落、列表等
- tags要相关且有意义，3-5个标签即可
- 内容要针对弱点，实用可操作`;

  try {
    const response = await deepseekClient.chat([
      { role: 'user', content: prompt }
    ]);

    // 解析AI响应
    let material: GeneratedLearningMaterial;
    try {
      let jsonText = response.trim();
      
      // 提取JSON（可能在markdown代码块中）
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }
      
      // 提取JSON对象
      const objMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonText = objMatch[0];
      }
      
      // 清理JSON文本
      jsonText = jsonText.replace(/\/\/.*$/gm, '');
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      material = JSON.parse(jsonText);
      
      // 验证必要字段
      if (!material.title || !material.content) {
        throw new Error('AI返回的素材格式不完整');
      }
      
      // 设置默认值
      material.material_type = material_type;
      material.tags = material.tags || [];
      
    } catch (parseError: any) {
      console.error('解析AI响应失败:', parseError);
      console.error('AI原始响应（前500字符）:', response.substring(0, 500));
      
      // 使用默认模板
      material = generateDefaultMaterial(weakness, material_type, weaknessTypeName);
    }

    return material;
  } catch (error: any) {
    console.error('AI生成学习素材失败:', error);
    throw new AppError(500, `AI生成学习素材失败: ${error.message}`);
  }
}

/**
 * 生成默认素材模板（当AI解析失败时使用）
 */
function generateDefaultMaterial(
  weakness: any,
  materialType: string,
  weaknessTypeName: string
): GeneratedLearningMaterial {
  const baseTitle = `${weaknessTypeName}提升指南`;
  
  const contentTemplates: Record<string, string> = {
    text: `# ${baseTitle}

## 核心概念

${weakness.description}

## 重要知识点

- 理解${weaknessTypeName}的基本要求
- 掌握相关技巧和方法
- 注意常见问题和误区

## 应用场景

在升中面试中，${weaknessTypeName}体现在多个方面，需要系统化地提升。

## 注意事项

${weakness.improvement_suggestions || '请根据具体情况制定提升计划。'}
`,
    example: `# ${weaknessTypeName}常见错误示例

## 典型错误

${weakness.example_text || '暂无示例'}

## 错误原因分析

- 缺乏相关知识和技巧
- 练习不足
- 理解不够深入

## 正确做法

${weakness.improvement_suggestions || '请参考改进建议进行针对性练习。'}

## 避免错误的技巧

- 加强基础知识学习
- 多进行针对性练习
- 及时总结和反思
`,
    tip: `# ${weaknessTypeName}改进技巧

## 实用技巧

${weakness.improvement_suggestions || '请根据具体情况制定改进计划。'}

## 练习建议

- 制定系统化的练习计划
- 注重基础知识的巩固
- 多进行实战练习

## 注意事项

- 保持耐心和坚持
- 及时调整练习方法
- 关注进步和改善

## 快速提升要点

- 针对性练习
- 及时反馈
- 持续改进
`,
    practice: `# ${weaknessTypeName}练习建议

## 针对性练习方法

${weakness.improvement_suggestions || '请根据具体情况制定练习计划。'}

## 练习步骤

1. 理解弱点和问题
2. 制定练习计划
3. 执行针对性练习
4. 评估练习效果
5. 调整和改进

## 练习重点

- 基础知识的巩固
- 技巧和方法的掌握
- 实战能力的提升

## 效果评估

- 定期检查进步情况
- 记录练习成果
- 调整练习策略
`,
  };

  return {
    title: baseTitle,
    content: contentTemplates[materialType] || contentTemplates.text,
    material_type: materialType,
    tags: [weaknessTypeName, weakness.category, materialType],
  };
}
