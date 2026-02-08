#!/bin/bash
# =============================================================================
# update-cursor-rules.sh
# 自動分析項目變更並更新 Cursor Rules（項目知識沉淀）
#
# 使用方式:
#   ./scripts/update-cursor-rules.sh           # 基於最近一次 commit 更新
#   ./scripts/update-cursor-rules.sh --full    # 全量重新分析整個項目
#   ./scripts/update-cursor-rules.sh --diff    # 僅基於 staged changes 更新
# =============================================================================

set -euo pipefail

# 配置
CURSOR_CLI="/Applications/Cursor.app/Contents/Resources/app/bin/cursor"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RULES_DIR="$PROJECT_ROOT/.cursor/rules"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 檢查 Cursor CLI
check_cursor_cli() {
  if [ ! -f "$CURSOR_CLI" ]; then
    log_error "Cursor CLI 未找到: $CURSOR_CLI"
    log_info "請確保已安裝 Cursor 編輯器"
    exit 1
  fi
}

# 確保 rules 目錄存在
ensure_rules_dir() {
  mkdir -p "$RULES_DIR"
}

# 獲取最近變更的文件列表
get_changed_files() {
  local mode="${1:-commit}"
  
  case "$mode" in
    commit)
      # 最近一次 commit 變更的文件
      git -C "$PROJECT_ROOT" diff --name-only HEAD~1 HEAD 2>/dev/null || \
        git -C "$PROJECT_ROOT" diff --name-only HEAD 2>/dev/null || \
        echo ""
      ;;
    diff)
      # 當前 staged 的變更
      git -C "$PROJECT_ROOT" diff --cached --name-only 2>/dev/null || echo ""
      ;;
    full)
      # 所有被追蹤的文件
      git -C "$PROJECT_ROOT" ls-files '*.ts' '*.tsx' 2>/dev/null || echo ""
      ;;
  esac
}

# 獲取變更摘要
get_change_summary() {
  local mode="${1:-commit}"
  
  case "$mode" in
    commit)
      git -C "$PROJECT_ROOT" log -1 --pretty=format:"%s" 2>/dev/null || echo "No commit message"
      ;;
    diff)
      git -C "$PROJECT_ROOT" diff --cached --stat 2>/dev/null || echo "No staged changes"
      ;;
    full)
      echo "Full project analysis"
      ;;
  esac
}

# 分析變更並決定需要更新哪些 rules
analyze_changes() {
  local changed_files="$1"
  local rules_to_update=""
  
  # 檢查前端變更
  if echo "$changed_files" | grep -q "frontend/"; then
    rules_to_update="$rules_to_update frontend-patterns"
  fi
  
  # 檢查後端變更
  if echo "$changed_files" | grep -q "backend/"; then
    rules_to_update="$rules_to_update backend-patterns"
  fi
  
  # 檢查 AI 相關變更
  if echo "$changed_files" | grep -qE "(ai/|useAiThinking|AiThinking)"; then
    rules_to_update="$rules_to_update ai-integration"
  fi
  
  # 檢查結構性變更（新頁面、新路由等）
  if echo "$changed_files" | grep -qE "(App\.tsx|index\.ts$|routes/)"; then
    rules_to_update="$rules_to_update project-overview"
  fi
  
  # 如果是 package.json 變更，更新技術棧信息
  if echo "$changed_files" | grep -q "package.json"; then
    rules_to_update="$rules_to_update project-overview"
  fi
  
  echo "$rules_to_update"
}

# 使用 Cursor Agent 生成/更新指定的 rule
update_rule_with_cursor() {
  local rule_name="$1"
  local context="$2"
  local rule_file="$RULES_DIR/${rule_name}.mdc"
  
  if [ ! -f "$rule_file" ]; then
    log_warn "Rule 文件不存在: $rule_file，跳過"
    return
  fi
  
  log_info "使用 Cursor Agent 更新 rule: $rule_name"
  
  local current_content
  current_content=$(cat "$rule_file")
  
  local prompt="你是一個項目知識管理專家。請基於以下變更上下文，更新這個 Cursor Rule 文件。

## 變更上下文
$context

## 當前 Rule 內容
$current_content

## 要求
1. 保持 YAML frontmatter（---...---）不變
2. 根據變更更新或補充相關的模式、約定、注意事項
3. 如果變更引入了新的模式或約定，添加到 rule 中
4. 如果發現了新的陷阱或注意事項，添加到相關部分
5. 保持簡潔，不要添加無關內容
6. 直接輸出完整的更新後的 rule 文件內容（包含 YAML frontmatter）
7. 不要添加任何額外的解釋或說明"
  
  local updated_content
  updated_content=$("$CURSOR_CLI" agent -p --model sonnet-4 "$prompt" 2>/dev/null) || {
    log_warn "Cursor Agent 調用失敗，跳過更新 $rule_name"
    return
  }
  
  # 驗證輸出包含 YAML frontmatter
  if echo "$updated_content" | grep -q "^---"; then
    echo "$updated_content" > "$rule_file"
    log_success "已更新: $rule_file"
  else
    log_warn "Cursor Agent 輸出格式不正確，跳過更新 $rule_name"
  fi
}

# 收集變更上下文
collect_context() {
  local changed_files="$1"
  local mode="$2"
  local context=""
  
  # 變更摘要
  local summary
  summary=$(get_change_summary "$mode")
  context="### 變更摘要\n$summary\n\n"
  
  # 變更文件列表
  context+="### 變更文件\n$changed_files\n\n"
  
  # 獲取 diff（限制大小）
  local diff_content
  case "$mode" in
    commit)
      diff_content=$(git -C "$PROJECT_ROOT" diff HEAD~1 HEAD -- '*.ts' '*.tsx' 2>/dev/null | head -500) || diff_content=""
      ;;
    diff)
      diff_content=$(git -C "$PROJECT_ROOT" diff --cached -- '*.ts' '*.tsx' 2>/dev/null | head -500) || diff_content=""
      ;;
    full)
      diff_content="Full project scan - no diff available"
      ;;
  esac
  
  context+="### 變更 Diff（摘要）\n\`\`\`\n${diff_content}\n\`\`\`"
  
  echo -e "$context"
}

# 更新 auto-generated 摘要文件
update_summary() {
  local changed_files="$1"
  local mode="$2"
  
  cat > "$RULES_DIR/auto-last-update.mdc" << EOF
---
description: 自動生成 - 上次更新摘要
globs: 
alwaysApply: false
---

# 上次 Rules 更新摘要

- **更新時間**: ${TIMESTAMP}
- **更新模式**: $mode
- **觸發**: $(get_change_summary "$mode")

## 最近變更的文件
\`\`\`
$changed_files
\`\`\`

## 當前項目統計
- 前端 TS/TSX 文件: $(find "$PROJECT_ROOT/interview-training-system/frontend/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l | tr -d ' ') 個
- 後端 TS 文件: $(find "$PROJECT_ROOT/interview-training-system/backend/src" -name "*.ts" 2>/dev/null | wc -l | tr -d ' ') 個
- 頁面數量: $(ls -d "$PROJECT_ROOT/interview-training-system/frontend/src/pages"/*/ 2>/dev/null | wc -l | tr -d ' ') 個
- API 路由文件: $(ls "$PROJECT_ROOT/interview-training-system/backend/src/routes"/*.ts 2>/dev/null | wc -l | tr -d ' ') 個
- AI 生成器: $(ls "$PROJECT_ROOT/interview-training-system/backend/src/ai"/*.ts 2>/dev/null | wc -l | tr -d ' ') 個
- Cursor Rules: $(ls "$RULES_DIR"/*.mdc 2>/dev/null | wc -l | tr -d ' ') 個
EOF

  log_success "更新摘要已寫入: $RULES_DIR/auto-last-update.mdc"
}

# 快速更新模式（不依賴 Cursor Agent，純腳本分析）
quick_update() {
  local mode="${1:-commit}"
  
  log_info "=== 快速更新模式 ($mode) ==="
  log_info "時間: $TIMESTAMP"
  
  local changed_files
  changed_files=$(get_changed_files "$mode")
  
  if [ -z "$changed_files" ]; then
    log_info "沒有檢測到變更，跳過更新"
    return 0
  fi
  
  log_info "檢測到變更文件:"
  echo "$changed_files" | head -20
  
  # 更新摘要
  update_summary "$changed_files" "$mode"
  
  # 分析需要更新的 rules
  local rules_to_update
  rules_to_update=$(analyze_changes "$changed_files")
  
  if [ -n "$rules_to_update" ]; then
    log_info "需要更新的 rules: $rules_to_update"
  else
    log_info "變更不影響已有 rules"
  fi
  
  # 檢查是否有新的頁面/路由/組件需要記錄
  check_new_patterns "$changed_files"
  
  log_success "快速更新完成"
}

# 檢查新的代碼模式
check_new_patterns() {
  local changed_files="$1"
  
  # 檢查新頁面
  local pages_dir="$PROJECT_ROOT/interview-training-system/frontend/src/pages"
  local current_pages
  current_pages=$(ls -d "$pages_dir"/*/ 2>/dev/null | xargs -I{} basename {} | sort)
  
  # 檢查 App.tsx 中的路由是否與 pages 目錄匹配
  local app_routes
  app_routes=$(grep -o "element={<[A-Z][a-zA-Z]*" "$PROJECT_ROOT/interview-training-system/frontend/src/App.tsx" 2>/dev/null | sed 's/element={<//' | sort)
  
  # 檢查新的 AI 任務類型
  local ai_tasks
  ai_tasks=$(grep -oE "'[a-z-]+'" "$PROJECT_ROOT/interview-training-system/frontend/src/store/useAiThinkingStore.ts" 2>/dev/null | sort -u | tr '\n' ', ')
  
  # 更新項目結構快照
  cat > "$RULES_DIR/auto-project-snapshot.mdc" << EOF
---
description: 自動生成 - 項目結構快照（每次 commit 自動更新）
globs: 
alwaysApply: false
---

# 項目結構快照
> 自動生成於 ${TIMESTAMP}，請勿手動編輯

## 前端頁面 (pages/)
$(for page in $current_pages; do echo "- $page"; done)

## 前端路由 (App.tsx)
$(grep "Route path=" "$PROJECT_ROOT/interview-training-system/frontend/src/App.tsx" 2>/dev/null | sed 's/.*path="/- /' | sed 's/".*//')

## 後端 API 路由
$(grep "app.use('/api/" "$PROJECT_ROOT/interview-training-system/backend/src/index.ts" 2>/dev/null | sed "s/.*app.use('/- /" | sed "s/',.*//" )

## AI 任務類型 (AiTaskType)
$(grep -oE "'[a-z]+-[a-z-]+'" "$PROJECT_ROOT/interview-training-system/frontend/src/store/useAiThinkingStore.ts" 2>/dev/null | sort -u | tr -d "'" | sed 's/^/- /')

## Zustand Stores
$(ls "$PROJECT_ROOT/interview-training-system/frontend/src/store/"*.ts 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /')

## 自定義 Hooks
$(ls "$PROJECT_ROOT/interview-training-system/frontend/src/hooks/"*.ts 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /')

## AI 生成器 (backend/src/ai/)
$(ls "$PROJECT_ROOT/interview-training-system/backend/src/ai/"*.ts 2>/dev/null | xargs -I{} basename {} | sed 's/^/- /')

## 依賴版本（主要）
### 前端
$(grep -E '"(react|antd|zustand|vite|echarts|react-router-dom)"' "$PROJECT_ROOT/interview-training-system/frontend/package.json" 2>/dev/null | sed 's/^//' | tr -d ',')

### 後端
$(grep -E '"(express|mysql2|zod|axios)"' "$PROJECT_ROOT/interview-training-system/backend/package.json" 2>/dev/null | sed 's/^//' | tr -d ',')
EOF

  log_success "項目結構快照已更新: $RULES_DIR/auto-project-snapshot.mdc"
}

# 完整更新模式（使用 Cursor Agent）
full_update() {
  log_info "=== 完整更新模式（使用 Cursor Agent）==="
  check_cursor_cli
  
  local changed_files
  changed_files=$(get_changed_files "full")
  
  local context
  context=$(collect_context "$changed_files" "full")
  
  # 更新每個 rule
  for rule_file in "$RULES_DIR"/*.mdc; do
    local rule_name
    rule_name=$(basename "$rule_file" .mdc)
    
    # 跳過自動生成的文件
    if [[ "$rule_name" == auto-* ]]; then
      continue
    fi
    
    update_rule_with_cursor "$rule_name" "$context"
  done
  
  # 更新摘要和快照
  update_summary "$changed_files" "full"
  check_new_patterns "$changed_files"
  
  log_success "完整更新完成"
}

# 主函數
main() {
  cd "$PROJECT_ROOT"
  ensure_rules_dir
  
  local mode="${1:-}"
  
  case "$mode" in
    --full)
      full_update
      ;;
    --diff)
      quick_update "diff"
      ;;
    --cursor)
      # 使用 Cursor Agent 基於最近 commit 更新
      check_cursor_cli
      local changed_files
      changed_files=$(get_changed_files "commit")
      local context
      context=$(collect_context "$changed_files" "commit")
      local rules_to_update
      rules_to_update=$(analyze_changes "$changed_files")
      
      for rule_name in $rules_to_update; do
        update_rule_with_cursor "$rule_name" "$context"
      done
      
      update_summary "$changed_files" "commit"
      check_new_patterns "$changed_files"
      log_success "Cursor Agent 更新完成"
      ;;
    *)
      quick_update "commit"
      ;;
  esac
}

main "$@"
