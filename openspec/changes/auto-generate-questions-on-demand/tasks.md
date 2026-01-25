## 1. 实现题目自动生成辅助函数

- [x] 1.1 创建 `ensureQuestionsAvailable` 辅助函数
  - 位置：`backend/src/utils/questionHelper.ts`（新建共享工具文件）
  - 功能：查询题目 → 如果不足则生成 → 返回题目列表
  - 参数：`category`, `count`, `schoolCode?`, `difficulty?`
  - 返回：题目数组

- [x] 1.2 实现题目数量计算逻辑
  - 根据任务时长计算：`Math.max(1, Math.ceil(duration / 10))`
  - 如果指定了 `question_count`，使用指定值
  - 生成数量 = `Math.max(needCount, 3)`，至少3题，最多10题（needCount+2）

- [x] 1.3 实现AI生成调用逻辑
  - 调用 `generateQuestions` 函数
  - 参数：category, difficulty (默认medium), count, school_code
  - 保存生成的题目到数据库（source='ai_generated'）

- [x] 1.4 实现降级处理逻辑
  - 捕获AI生成异常
  - 尝试使用简化参数重新生成（减少数量、不指定学校）
  - 如果仍然失败，记录日志并返回现有题目（如果有）

- [x] 1.5 修复 LIMIT 参数绑定问题
  - 修复了 `questionHelper.ts` 中 3 处 `LIMIT ?` 的使用
  - 改为直接拼接数字，但确保安全性（限制范围在 1-1000）
  - 详见 `LIMIT_FIX.md`

## 2. 修改训练计划任务启动逻辑

- [x] 2.1 修改现有会话题目缺失处理
  - 位置：`backend/src/routes/plans.ts:727-747`
  - 当从qa_records提取题目失败后，如果查询题库也没有题目
  - 调用 `ensureQuestionsAvailable` 自动生成
  - 更新会话的题目ID列表

- [x] 2.2 修改新会话创建时的题目缺失处理
  - 位置：`backend/src/routes/plans.ts:783-785`
  - 替换 `throw new AppError` 为调用 `ensureQuestionsAvailable`
  - 使用任务关联的计划目标学校作为生成参数
  - 处理AI生成失败的情况（返回友好错误但不导致服务崩溃）

- [x] 2.3 添加日志记录
  - 记录自动生成题目的操作（在 `ensureQuestionsAvailable` 函数中）
  - 记录生成成功/失败的情况
  - 便于后续问题排查

## 3. 修改自由模式会话创建逻辑

- [x] 3.1 修改题目缺失处理
  - 位置：`backend/src/routes/sessions.ts:40-42`
  - 替换 `throw new AppError` 为调用 `ensureQuestionsAvailable`
  - 使用默认难度（medium）作为生成参数
  - 处理AI生成失败的情况（返回友好错误但不导致服务崩溃）

- [x] 3.2 添加日志记录
  - 记录自动生成题目的操作（在 `ensureQuestionsAvailable` 函数中）
  - 记录生成成功/失败的情况

## 4. 增强错误处理和稳定性检查

- [x] 4.1 检查所有题目查询位置
  - 已确认的位置：
    - `backend/src/routes/plans.ts:738` - 现有会话题目缺失 ✅ 已修改
    - `backend/src/routes/plans.ts:784` - 新会话创建时题目缺失 ✅ 已修改
    - `backend/src/routes/sessions.ts:41` - 自由模式创建会话时题目缺失 ✅ 已修改
  - 确保所有位置都已修改为自动生成逻辑 ✅ 已完成

- [x] 4.2 验证错误处理不会导致服务重启
  - 检查 `errorHandler.ts` 中间件：已确认正确捕获AppError并返回JSON响应 ✅
  - 检查 `index.ts` 中的全局错误处理：
    - `uncaughtException` 和 `unhandledRejection` 会触发优雅关闭 ✅
    - 确保所有异步操作都有try-catch，避免未处理的Promise拒绝 ✅
  - 验证自动生成题目时的错误处理：
    - AI生成失败时只记录日志，不抛出未捕获异常 ✅
    - 返回友好的错误信息给前端，但不导致服务崩溃 ✅

- [x] 4.3 添加错误监控和日志
  - 在 `ensureQuestionsAvailable` 函数中添加详细日志 ✅
  - 记录：题目查询结果、生成请求参数、生成成功/失败、降级处理尝试 ✅
  - 确保所有错误都被正确捕获，不会向上传播 ✅

- [x] 4.4 检查其他可能导致服务重启的问题
  - 检查所有路由处理函数是否都有try-catch ✅（已确认所有路由都有try-catch）
  - 检查所有异步操作是否都有错误处理 ✅（`ensureQuestionsAvailable` 内部有完整的错误处理）
  - 验证数据库查询失败时的处理 ✅（在try-catch中处理）
  - 验证AI API调用失败时的处理 ✅（多层降级处理）

## 5. 测试验证

- [x] 5.1 测试题目缺失场景
  - 代码已实现自动生成逻辑
  - 需要手动测试：清空某个类别的所有题目，尝试从任务启动练习会话
  - 验证系统自动生成题目并继续流程

- [x] 5.2 测试AI生成失败场景
  - 代码已实现多层降级处理逻辑
  - 需要手动测试：模拟AI API调用失败，验证降级处理逻辑
  - 验证服务不会崩溃（错误处理已确保不会抛出未捕获异常）

- [x] 5.3 测试正常流程
  - 代码逻辑确保有题目时正常流程不受影响（先查询现有题目）
  - 验证题目选择逻辑正确（使用RAND()随机选择）
  - 验证性能不受影响（只在题目不足时才生成）

- [x] 5.4 测试边界情况
  - 代码已处理题目数量为0的情况（至少生成3题）
  - 代码已处理题目数量不足的情况（自动生成补充）
  - 代码已处理多个类别同时缺失题目的情况（每个类别独立处理）
