# Change: 更新項目文檔并添加AI調用和前端組件規范

## Why

当前項目文檔需要更新以反映最新的实现狀態，并且需要明確两个重要的開發規范：

1. **AI調用超時規范**：AI处理可能需要较長時間（生成題目、反馈、計劃等），不应该因为超時而中断。虽然代碼中已经部分实现了无超時设置，但需要在項目文檔中明確規范，確保所有AI調用都遵循此規則。

2. **前端通用悬浮框組件規范**：係統已经实现了AI思考展示組件（`AiThinkingDisplay`），但需要在文檔中明確要求所有AI調用页面都应使用此通用組件，而不是各自实现不同的loading提示，以保持用户体验的一致性。

3. **文檔同步要求**：項目文檔（`openspec/project.md`）需要与当前代碼实现保持同步，反映最新的技術栈、項目結构和能力列表。

## What Changes

- **更新項目文檔**（`openspec/project.md`）：
  - 添加"AI調用超時規范"约束条件
  - 添加"前端AI交互組件規范"约束条件
  - 更新已实现能力列表，反映当前狀態
  - 更新項目結构，包含新增的AI思考展示組件

- **更新文檔規范**（`openspec/specs/documentation/spec.md`）：
  - 添加AI調用超時規范的文檔要求
  - 添加前端通用組件使用的文檔要求
  - 明確文檔更新检查清单应包含这些規范

## Impact

- **Affected specs**: 
  - `documentation` - 需要添加新的文檔要求和規范
- **Affected code**: 
  - `openspec/project.md` - 添加新的约束条件和更新內容
  - `openspec/specs/documentation/spec.md` - 添加新的文檔要求
- **Breaking changes**: 无
- **Migration needed**: 无
