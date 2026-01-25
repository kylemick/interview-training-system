# Change: 更新项目文档并添加AI调用和前端组件规范

## Why

当前项目文档需要更新以反映最新的实现状态，并且需要明确两个重要的开发规范：

1. **AI调用超时规范**：AI处理可能需要较长时间（生成题目、反馈、计划等），不应该因为超时而中断。虽然代码中已经部分实现了无超时设置，但需要在项目文档中明确规范，确保所有AI调用都遵循此规则。

2. **前端通用悬浮框组件规范**：系统已经实现了AI思考展示组件（`AiThinkingDisplay`），但需要在文档中明确要求所有AI调用页面都应使用此通用组件，而不是各自实现不同的loading提示，以保持用户体验的一致性。

3. **文档同步要求**：项目文档（`openspec/project.md`）需要与当前代码实现保持同步，反映最新的技术栈、项目结构和能力列表。

## What Changes

- **更新项目文档**（`openspec/project.md`）：
  - 添加"AI调用超时规范"约束条件
  - 添加"前端AI交互组件规范"约束条件
  - 更新已实现能力列表，反映当前状态
  - 更新项目结构，包含新增的AI思考展示组件

- **更新文档规范**（`openspec/specs/documentation/spec.md`）：
  - 添加AI调用超时规范的文档要求
  - 添加前端通用组件使用的文档要求
  - 明确文档更新检查清单应包含这些规范

## Impact

- **Affected specs**: 
  - `documentation` - 需要添加新的文档要求和规范
- **Affected code**: 
  - `openspec/project.md` - 添加新的约束条件和更新内容
  - `openspec/specs/documentation/spec.md` - 添加新的文档要求
- **Breaking changes**: 无
- **Migration needed**: 无
