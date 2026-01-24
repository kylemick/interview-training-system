/**
 * 学校档案种子数据
 */
import { insert, queryOne } from './index.js';

const seedSchools = [
  {
    code: 'SPCC',
    name: "St. Paul's Co-educational College",
    name_zh: '圣保罗男女中学',
    focus_areas: JSON.stringify([
      'critical-thinking',
      'english-oral',
      'current-affairs',
      'personal-growth',
      'science-knowledge',
    ]),
    interview_style: 'academic-rigorous',
    notes: '注重批判性思维和学术能力，科学素养和STEM教育是重点考察领域。面试风格严谨，会深入提问。',
  },
  {
    code: 'QC',
    name: "Queen's College",
    name_zh: '皇仁书院',
    focus_areas: JSON.stringify([
      'logical-thinking',
      'english-oral',
      'current-affairs',
      'group-discussion',
    ]),
    interview_style: 'balanced',
    notes: '传统名校，注重逻辑思维和时事分析能力。面试形式多样，包括小组讨论。',
  },
  {
    code: 'LSC',
    name: 'La Salle College',
    name_zh: '喇沙书院',
    focus_areas: JSON.stringify([
      'english-oral',
      'chinese-expression',
      'personal-growth',
      'logical-thinking',
    ]),
    interview_style: 'holistic',
    notes: '注重全人发展，关注学生的品格和价值观。中英文表达能力同样重要。',
  },
  {
    code: 'DBS',
    name: 'Diocesan Boys\' School',
    name_zh: '拔萃男书院',
    focus_areas: JSON.stringify([
      'english-oral',
      'logical-thinking',
      'personal-growth',
      'group-discussion',
    ]),
    interview_style: 'interactive',
    notes: '注重英语表达和领导能力。面试强调互动性和沟通能力。',
  },
  {
    code: 'DGS',
    name: 'Diocesan Girls\' School',
    name_zh: '拔萃女书院',
    focus_areas: JSON.stringify([
      'english-oral',
      'chinese-expression',
      'personal-growth',
      'current-affairs',
    ]),
    interview_style: 'comprehensive',
    notes: '全面评估学生能力，注重语言表达和社会关怀。面试题目广泛且深入。',
  },
];

/**
 * 初始化学校档案种子数据
 */
export async function seedSchoolProfiles(): Promise<void> {
  console.log('🌱 开始初始化学校档案数据...');

  let insertedCount = 0;
  let skippedCount = 0;

  for (const school of seedSchools) {
    try {
      // 检查是否已存在
      const existing = await queryOne(
        'SELECT id FROM school_profiles WHERE code = ?',
        [school.code]
      );

      if (existing) {
        console.log(`  ⏭️  ${school.name_zh} (${school.code}) 已存在，跳过`);
        skippedCount++;
        continue;
      }

      // 插入学校数据
      await insert(
        `INSERT INTO school_profiles (code, name, name_zh, focus_areas, interview_style, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [school.code, school.name, school.name_zh, school.focus_areas, school.interview_style, school.notes]
      );

      console.log(`  ✅ ${school.name_zh} (${school.code}) 已添加`);
      insertedCount++;
    } catch (error) {
      console.error(`  ❌ 添加 ${school.name_zh} 失败:`, error);
    }
  }

  console.log('');
  console.log(`✨ 学校档案初始化完成：`);
  console.log(`  - 新增: ${insertedCount} 所学校`);
  console.log(`  - 跳过: ${skippedCount} 所学校`);
  console.log('');
}

// 如果直接运行此文件，执行种子数据初始化
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSchoolProfiles()
    .then(() => {
      console.log('✅ 完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 失败:', error);
      process.exit(1);
    });
}
