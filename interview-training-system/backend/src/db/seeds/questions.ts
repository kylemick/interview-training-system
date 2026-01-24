/**
 * 题库种子数据
 */
import { insert } from '../index.js';

interface SeedQuestion {
  category: string;
  question_text: string;
  difficulty: string;
  reference_answer: string;
  tags: string[];
  school_code?: string;
}

const seedQuestionsData: SeedQuestion[] = [
  // 英文口语 (English Oral)
  {
    category: 'english-oral',
    difficulty: 'easy',
    question_text: 'Please introduce yourself in English, including your name, age, and one hobby.',
    reference_answer: '参考要点：1. 清晰的自我介绍结构 2. 使用完整句子 3. 正确的语法和发音 4. 展示个人特点。示例：My name is... I am... years old. My hobby is... because...',
    tags: ['自我介绍', '基础口语'],
  },
  {
    category: 'english-oral',
    difficulty: 'medium',
    question_text: 'Describe your favorite book and explain why you like it.',
    reference_answer: '参考要点：1. 书名和作者 2. 故事概要 3. 喜欢的原因（情节、人物、主题）4. 从中学到的东西 5. 使用丰富的形容词和连接词',
    tags: ['阅读', '观点表达'],
  },
  {
    category: 'english-oral',
    difficulty: 'hard',
    question_text: 'If you could change one thing about your school, what would it be and why?',
    reference_answer: '参考要点：1. 批判性思维 2. 提出具体问题 3. 解释原因和影响 4. 提供改进建议 5. 考虑多方面因素 6. 表达要有逻辑性',
    tags: ['批判性思维', '学校生活'],
    school_code: 'SPCC',
  },

  // 中文表达 (Chinese Oral)
  {
    category: 'chinese-oral',
    difficulty: 'easy',
    question_text: '请用中文介绍你最喜欢的一个节日，并说明原因。',
    reference_answer: '参考要点：1. 节日名称和时间 2. 节日传统和习俗 3. 个人经历和感受 4. 喜欢的具体原因 5. 语言流畅，表达清晰',
    tags: ['文化常识', '个人经历'],
  },
  {
    category: 'chinese-oral',
    difficulty: 'medium',
    question_text: '你认为什么是一个好朋友？请举例说明。',
    reference_answer: '参考要点：1. 定义好朋友的特质（诚实、支持、信任等）2. 结合具体例子 3. 个人经验 4. 反思友谊的意义 5. 表达要有深度',
    tags: ['人际关系', '价值观'],
  },
  {
    category: 'chinese-oral',
    difficulty: 'hard',
    question_text: '请朗读以下段落，并解释其中的寓意：「塞翁失马，焉知非福。」',
    reference_answer: '参考要点：1. 正确流畅的朗读 2. 理解故事背景 3. 解释寓意（祸福相依）4. 联系现实生活例子 5. 表达个人见解',
    tags: ['成语典故', '阅读理解'],
  },

  // 逻辑思维 (Logic Thinking)
  {
    category: 'logic-thinking',
    difficulty: 'easy',
    question_text: '如果一个苹果3元，一个橙2元，小明用20元可以买几种不同的水果组合？',
    reference_answer: '参考要点：1. 系统性思考 2. 列举所有可能（6苹果1橙、5苹果1橙+2元找零等）3. 检查答案 4. 表达清晰的计算过程',
    tags: ['数学应用', '组合思维'],
  },
  {
    category: 'logic-thinking',
    difficulty: 'medium',
    question_text: '有三个开关，分别控制三盏灯，你在开关所在的房间看不到灯。你只能进入灯所在的房间一次，如何确定哪个开关控制哪盏灯？',
    reference_answer: '参考要点：1. 创新思维（利用灯泡温度）2. 操作步骤（打开1号一段时间，关闭后打开2号，进入）3. 判断逻辑（亮=2号，热=1号，冷=3号）4. 表达清晰',
    tags: ['逻辑推理', '解难题'],
  },
  {
    category: 'logic-thinking',
    difficulty: 'hard',
    question_text: '一个岛上住着说真话的人和说假话的人，你遇到两个岛民，需要用一个问题判断哪条路通往安全地方。你会问什么？',
    reference_answer: '参考要点：1. 深度逻辑推理 2. 设计问题（问其中一人：另一人会说哪条路安全？）3. 分析两种情况下的答案 4. 得出结论（走相反方向）5. 清晰表达推理过程',
    tags: ['逻辑推理', '批判性思维'],
    school_code: 'QC',
  },

  // 时事常识 (Current Affairs)
  {
    category: 'current-affairs',
    difficulty: 'easy',
    question_text: '你知道最近香港有什么重要的新闻吗？请简单介绍。',
    reference_answer: '参考要点：1. 关注时事的习惯 2. 新闻的基本事实（人物、时间、地点、事件）3. 个人看法或感受 4. 表达清晰',
    tags: ['香港新闻', '时事关注'],
  },
  {
    category: 'current-affairs',
    difficulty: 'medium',
    question_text: '你如何看待环境保护和经济发展之间的关系？',
    reference_answer: '参考要点：1. 理解两者关系（矛盾与平衡）2. 具体例子 3. 多角度思考 4. 提出平衡建议 5. 表达要有深度和逻辑',
    tags: ['环境保护', '社会议题'],
  },
  {
    category: 'current-affairs',
    difficulty: 'hard',
    question_text: '人工智能的发展对未来社会有什么影响？请谈谈你的看法。',
    reference_answer: '参考要点：1. 了解AI基本概念 2. 正面影响（效率、创新）3. 负面影响（就业、隐私）4. 平衡观点 5. 个人思考和建议 6. 逻辑清晰，表达有深度',
    tags: ['科技发展', '未来趋势'],
    school_code: 'SPCC',
  },

  // 科学常识 (Science Knowledge)
  {
    category: 'science-knowledge',
    difficulty: 'easy',
    question_text: '为什么天空是蓝色的？',
    reference_answer: '参考要点：1. 光的散射原理 2. 蓝光波长较短，更容易散射 3. 用简单语言解释科学原理 4. 可以联系生活观察（日出日落时天空颜色变化）',
    tags: ['光学', '自然现象'],
  },
  {
    category: 'science-knowledge',
    difficulty: 'medium',
    question_text: '请解释温室效应是如何产生的，以及它对地球的影响。',
    reference_answer: '参考要点：1. 温室气体的作用 2. 能量吸收和辐射过程 3. 全球变暖的影响 4. 人类活动的关系 5. 减缓措施 6. 表达要科学准确',
    tags: ['环境科学', 'STEM'],
    school_code: 'SPCC',
  },
  {
    category: 'science-knowledge',
    difficulty: 'hard',
    question_text: 'If you were to design a sustainable city, what scientific principles would you apply?',
    reference_answer: '参考要点：1. 可再生能源（太阳能、风能）2. 水循环系统 3. 废物处理和回收 4. 绿色建筑 5. 交通规划 6. 生态平衡 7. 创新思维和系统性规划',
    tags: ['可持续发展', 'STEM', '设计思维'],
    school_code: 'SPCC',
  },

  // 个人成长 (Personal Growth)
  {
    category: 'personal-growth',
    difficulty: 'easy',
    question_text: '请分享一次你克服困难的经历。',
    reference_answer: '参考要点：1. 具体困难情况 2. 遇到的挑战 3. 采取的行动 4. 结果和感受 5. 从中学到的经验 6. 表达要真诚',
    tags: ['个人经历', '成长反思'],
  },
  {
    category: 'personal-growth',
    difficulty: 'medium',
    question_text: '你未来的理想是什么？你打算如何实现它？',
    reference_answer: '参考要点：1. 明确的目标 2. 目标的原因和意义 3. 具体的行动计划 4. 需要培养的能力 5. 可能的挑战和应对 6. 表达要有规划性',
    tags: ['志向抱负', '职业规划'],
  },
  {
    category: 'personal-growth',
    difficulty: 'hard',
    question_text: '你认为失败是什么？请结合自己的经历谈谈对失败的看法。',
    reference_answer: '参考要点：1. 对失败的定义和理解 2. 具体失败经历 3. 情绪和反应 4. 反思和成长 5. 对失败的重新认识 6. 成熟的心态和深度思考',
    tags: ['价值观', '自我认知'],
  },

  // 小组讨论 (Group Discussion)
  {
    category: 'group-discussion',
    difficulty: 'easy',
    question_text: '小组讨论：学校应该允许学生带手机吗？',
    reference_answer: '参考要点：1. 清楚表达观点 2. 提供理由和例子 3. 倾听他人意见 4. 尊重不同观点 5. 参与讨论但不主导 6. 寻求共识',
    tags: ['学校政策', '辩论技巧'],
  },
  {
    category: 'group-discussion',
    difficulty: 'medium',
    question_text: '小组任务：策划一个环保主题的校园活动。',
    reference_answer: '参考要点：1. 主动提出想法 2. 分工合作 3. 时间管理 4. 资源分配 5. 倾听和整合他人建议 6. 领导或协调能力 7. 最终方案的完整性',
    tags: ['合作能力', '项目规划'],
    school_code: 'LSC',
  },
  {
    category: 'group-discussion',
    difficulty: 'hard',
    question_text: '小组讨论：如果你是校长，你会如何改善学校？（每人提出一个建议，小组需要选出最重要的三个）',
    reference_answer: '参考要点：1. 创新建议 2. 逻辑论证 3. 倾听和评估他人建议 4. 协商和妥协 5. 寻求共识的能力 6. 最终决策的合理性 7. 领导力和影响力',
    tags: ['领导力', '决策能力'],
    school_code: 'LSC',
  },
];

/**
 * 导入题库种子数据
 */
export async function seedQuestions(): Promise<void> {
  console.log('🌱 导入题库种子数据...');

  try {
    let successCount = 0;
    let errorCount = 0;

    for (const q of seedQuestionsData) {
      try {
        await insert(
          `INSERT INTO questions (category, question_text, difficulty, reference_answer, tags, school_code, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [q.category, q.question_text, q.difficulty, q.reference_answer, JSON.stringify(q.tags), q.school_code || null, 'seed']
        );
        successCount++;
      } catch (error) {
        console.error(`  ❌ 导入失败: ${q.question_text.substring(0, 50)}...`, error);
        errorCount++;
      }
    }

    console.log(`✅ 题库种子数据导入完成：成功 ${successCount} 条，失败 ${errorCount} 条`);
  } catch (error) {
    console.error('❌ 题库种子数据导入失败:', error);
    throw error;
  }
}
