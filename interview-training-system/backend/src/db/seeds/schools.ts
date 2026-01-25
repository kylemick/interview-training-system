/**
 * 學校檔案種子數據
 */
import { insert, queryOne } from '../index.js';

const seedSchools = [
  {
    code: 'SPCC',
    name: "St. Paul's Co-educational College",
    name_zh: '聖保羅男女中學',
    focus_areas: JSON.stringify([
      'critical-thinking',
      'english-oral',
      'current-affairs',
      'personal-growth',
      'science-knowledge',
    ]),
    interview_style: 'academic-rigorous',
    notes: '注重批判性思維和學術能力，科學素養和STEM教育是重點考察領域。面試風格嚴謹，會深入提問。',
  },
  {
    code: 'QC',
    name: "Queen's College",
    name_zh: '皇仁書院',
    focus_areas: JSON.stringify([
      'logical-thinking',
      'english-oral',
      'current-affairs',
      'group-discussion',
    ]),
    interview_style: 'balanced',
    notes: '傳統名校，注重邏輯思維和時事分析能力。面試形式多樣，包括小組討論。',
  },
  {
    code: 'LSC',
    name: 'La Salle College',
    name_zh: '喇沙書院',
    focus_areas: JSON.stringify([
      'english-oral',
      'chinese-expression',
      'personal-growth',
      'logical-thinking',
    ]),
    interview_style: 'holistic',
    notes: '注重全人發展，關注學生的品格和價值觀。中英文表達能力同樣重要。',
  },
  {
    code: 'DBS',
    name: 'Diocesan Boys\' School',
    name_zh: '拔萃男書院',
    focus_areas: JSON.stringify([
      'english-oral',
      'logical-thinking',
      'personal-growth',
      'group-discussion',
    ]),
    interview_style: 'interactive',
    notes: '注重英語表達和領導能力。面試強調互動性和溝通能力。',
  },
  {
    code: 'DGS',
    name: 'Diocesan Girls\' School',
    name_zh: '拔萃女書院',
    focus_areas: JSON.stringify([
      'english-oral',
      'chinese-expression',
      'personal-growth',
      'current-affairs',
    ]),
    interview_style: 'comprehensive',
    notes: '全面評估學生能力，注重語言表達和社會關懷。面試題目廣泛且深入。',
  },
];

/**
 * 初始化學校檔案種子數據
 */
export async function seedSchoolProfiles(): Promise<void> {
  console.log('🌱 開始初始化學校檔案數據...');

  let insertedCount = 0;
  let skippedCount = 0;

  for (const school of seedSchools) {
    try {
      // 檢查是否已存在
      const existing = await queryOne(
        'SELECT id FROM school_profiles WHERE code = ?',
        [school.code]
      );

      if (existing) {
        console.log(`  ⏭️  ${school.name_zh} (${school.code}) 已存在，跳過`);
        skippedCount++;
        continue;
      }

      // 插入學校數據
      await insert(
        `INSERT INTO school_profiles (code, name, name_zh, focus_areas, interview_style, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [school.code, school.name, school.name_zh, school.focus_areas, school.interview_style, school.notes]
      );

      console.log(`  ✅ ${school.name_zh} (${school.code}) 已添加`);
      insertedCount++;
    } catch (error) {
      console.error(`  ❌ 添加 ${school.name_zh} 失敗:`, error);
    }
  }

  console.log('');
  console.log(`✨ 學校檔案初始化完成：`);
  console.log(`  - 新增: ${insertedCount} 所學校`);
  console.log(`  - 跳過: ${skippedCount} 所學校`);
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
