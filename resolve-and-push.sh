#!/bin/bash
# 解決衝突並推送的腳本

set -e

echo "🔄 開始解決衝突並推送..."

# 1. 拉取遠程更改並使用 rebase 策略
echo "📥 拉取遠程更改..."
git pull --rebase origin main

# 2. 檢查是否有衝突
if [ -f .git/rebase-apply/applying ] || [ -d .git/rebase-merge ]; then
    echo "⚠️  檢測到衝突，需要手動解決"
    echo "請解決衝突後運行: git rebase --continue"
    exit 1
fi

# 3. 如果沒有衝突，直接推送
echo "✅ 沒有衝突，開始推送..."
git push origin main

echo "🎉 完成！代碼已成功推送到遠程倉庫"
