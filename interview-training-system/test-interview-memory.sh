#!/bin/bash

# 测试面试回忆分析接口

echo "=== 测试面试回忆分析接口 ==="
echo ""

# 测试1: 基本测试
echo "1. 测试基本功能..."
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天去了SPCC面试。面试官先问我：Tell me about your favorite book. 我回答了Harry Potter。然后问：What do you think about climate change? 我说这是很严重的问题。"
  }' \
  -w "\n状态码: %{http_code}\n" \
  -o /tmp/test-response.json

echo ""
echo "响应内容："
cat /tmp/test-response.json | jq '.'

echo ""
echo "==="
echo ""

# 测试2: 带类别和学校
echo "2. 测试指定类别和学校..."
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": "面试官问：你觉得什么是领导力？",
    "category": "personal-growth",
    "school_code": "SPCC"
  }' \
  -w "\n状态码: %{http_code}\n"

echo ""
echo "==="
echo ""

# 测试3: 空文本（应该失败）
echo "3. 测试空文本（预期失败）..."
curl -X POST http://localhost:3001/api/ai/extract-interview-memory \
  -H "Content-Type: application/json" \
  -d '{
    "text": ""
  }' \
  -w "\n状态码: %{http_code}\n"

echo ""
echo "==="
echo "测试完成"
