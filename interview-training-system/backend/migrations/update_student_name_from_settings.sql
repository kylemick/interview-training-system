-- 迁移脚本：将历史数据中的学生信息统一更新为设置中的值
-- 注意：此脚本需要手动运行，根据实际设置文件中的student_name更新

-- 1. 查看当前设置中的学生姓名
-- SELECT * FROM settings (如果settings存储在数据库中)
-- 或者从 settings.json 文件读取

-- 2. 更新弱点表中的学生姓名（将NULL或旧值更新为设置中的值）
-- 注意：需要根据实际的设置值替换 '设置中的学生姓名'
-- UPDATE student_weaknesses 
-- SET student_name = '设置中的学生姓名'
-- WHERE student_name IS NULL OR student_name != '设置中的学生姓名';

-- 3. 更新训练计划表中的学生姓名（如果需要）
-- UPDATE training_plans 
-- SET student_name = '设置中的学生姓名'
-- WHERE student_name IS NULL OR student_name != '设置中的学生姓名';

-- 注意：此迁移脚本仅供参考，实际执行时需要：
-- 1. 先读取 settings.json 获取当前学生姓名
-- 2. 根据实际情况决定是否更新历史数据
-- 3. 建议在更新前备份数据库
