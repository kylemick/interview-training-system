#!/bin/bash
# =============================================================================
# verify.sh - 項目驗證腳本
# 用於驗證代碼變更的正確性，確保所有檢查通過
#
# 使用方式:
#   ./scripts/verify.sh              # 驗證所有（前端 + 後端）
#   ./scripts/verify.sh --frontend   # 只驗證前端
#   ./scripts/verify.sh --backend    # 只驗證後端
#   ./scripts/verify.sh --quick      # 快速模式（只做 TypeScript 編譯檢查）
# =============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/interview-training-system/frontend"
BACKEND_DIR="$PROJECT_ROOT/interview-training-system/backend"

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

# 計數器
TOTAL=0
PASSED=0
FAILED=0
SKIPPED=0

log_header() { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════${NC}"; }
log_step() { echo -e "\n${BLUE}▸${NC} $1"; }
log_pass() { echo -e "  ${GREEN}✓ PASS${NC}: $1"; PASSED=$((PASSED + 1)); TOTAL=$((TOTAL + 1)); }
log_fail() { echo -e "  ${RED}✗ FAIL${NC}: $1"; FAILED=$((FAILED + 1)); TOTAL=$((TOTAL + 1)); }
log_skip() { echo -e "  ${YELLOW}⊘ SKIP${NC}: $1"; SKIPPED=$((SKIPPED + 1)); }
log_info() { echo -e "  ${BLUE}ℹ${NC} $1"; }

# 執行檢查並記錄結果
run_check() {
  local name="$1"
  local dir="$2"
  shift 2
  local cmd="$*"

  log_step "$name"
  if (cd "$dir" && eval "$cmd") > /tmp/verify_output_$$.txt 2>&1; then
    log_pass "$name"
    return 0
  else
    log_fail "$name"
    # 顯示錯誤輸出（限制行數）
    echo -e "  ${RED}輸出:${NC}"
    head -30 /tmp/verify_output_$$.txt | sed 's/^/    /'
    local lines
    lines=$(wc -l < /tmp/verify_output_$$.txt)
    if [ "$lines" -gt 30 ]; then
      echo -e "    ${YELLOW}... (共 ${lines} 行，已截斷)${NC}"
    fi
    return 1
  fi
}

# 前端驗證
verify_frontend() {
  log_header "前端驗證 (Frontend)"

  # 檢查 node_modules
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    log_skip "前端依賴未安裝，跳過前端驗證"
    return 0
  fi

  # TypeScript 編譯檢查
  run_check "TypeScript 編譯檢查 (tsc --noEmit)" "$FRONTEND_DIR" "npx tsc --noEmit" || true

  # Vite 構建檢查（非 quick 模式）
  if [ "${QUICK_MODE:-false}" = "false" ]; then
    run_check "Vite 構建檢查 (vite build)" "$FRONTEND_DIR" "npx vite build" || true
  fi
}

# 後端驗證
verify_backend() {
  log_header "後端驗證 (Backend)"

  # 檢查 node_modules
  if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    log_skip "後端依賴未安裝，跳過後端驗證"
    return 0
  fi

  # TypeScript 編譯檢查
  run_check "TypeScript 編譯檢查 (tsc --noEmit)" "$BACKEND_DIR" "npx tsc --noEmit" || true
}

# 輸出結果摘要
print_summary() {
  log_header "驗證結果摘要"

  echo -e "  總共: ${BOLD}${TOTAL}${NC} 項檢查"
  echo -e "  通過: ${GREEN}${BOLD}${PASSED}${NC} 項"
  if [ "$FAILED" -gt 0 ]; then
    echo -e "  失敗: ${RED}${BOLD}${FAILED}${NC} 項"
  else
    echo -e "  失敗: ${BOLD}0${NC} 項"
  fi
  if [ "$SKIPPED" -gt 0 ]; then
    echo -e "  跳過: ${YELLOW}${BOLD}${SKIPPED}${NC} 項"
  fi

  echo ""
  if [ "$FAILED" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}🎉 所有驗證通過！${NC}"
    return 0
  else
    echo -e "  ${RED}${BOLD}❌ 有 ${FAILED} 項驗證失敗，請修復後重試${NC}"
    return 1
  fi
}

# 清理臨時文件
cleanup() {
  rm -f /tmp/verify_output_$$.txt
}
trap cleanup EXIT

# 主函數
main() {
  local mode="${1:-all}"
  QUICK_MODE="false"

  case "$mode" in
    --frontend)
      verify_frontend
      ;;
    --backend)
      verify_backend
      ;;
    --quick)
      QUICK_MODE="true"
      verify_frontend
      verify_backend
      ;;
    --all|*)
      verify_frontend
      verify_backend
      ;;
  esac

  print_summary
}

main "$@"
