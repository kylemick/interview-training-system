#!/usr/bin/env python3
"""
簡體中文轉繁體中文腳本
使用 opencc-python-reimplemented 進行轉換
"""

import os
import sys
import re
from pathlib import Path

try:
    from opencc import OpenCC
except ImportError:
    print("錯誤：請先安裝 opencc-python-reimplemented")
    print("安裝命令：pip3 install opencc-python-reimplemented")
    sys.exit(1)

# 初始化轉換器（簡體轉繁體，使用香港標準）
cc = OpenCC('s2hk')

# 需要轉換的文件擴展名
TARGET_EXTENSIONS = {'.md', '.ts', '.tsx', '.js', '.jsx', '.json', '.sql', '.txt'}

# 需要跳過的目錄
SKIP_DIRS = {
    'node_modules', '.git', 'dist', 'build', '.next', 
    'coverage', '.cache', '__pycache__', '.venv', 'venv'
}

# 需要跳過的文件（包含這些字符串的文件名）
SKIP_FILES = {
    'package-lock.json',
    'yarn.lock',
    '.min.js',
    '.min.css'
}

def should_skip_file(filepath):
    """判斷是否應該跳過該文件"""
    # 檢查文件名
    filename = os.path.basename(filepath)
    for skip_pattern in SKIP_FILES:
        if skip_pattern in filename:
            return True
    
    # 檢查路徑中是否包含跳過的目錄
    path_parts = Path(filepath).parts
    for part in path_parts:
        if part in SKIP_DIRS:
            return True
    
    return False

def convert_file(filepath):
    """轉換單個文件"""
    if should_skip_file(filepath):
        return False
    
    try:
        # 讀取文件
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 轉換內容
        converted = cc.convert(content)
        
        # 如果內容有變化，寫回文件
        if converted != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(converted)
            return True
        return False
    except Exception as e:
        print(f"錯誤：轉換文件 {filepath} 時出錯：{e}")
        return False

def convert_directory(root_dir):
    """遞歸轉換目錄中的所有文件"""
    converted_count = 0
    error_count = 0
    
    for root, dirs, files in os.walk(root_dir):
        # 過濾跳過的目錄
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        
        for file in files:
            filepath = os.path.join(root, file)
            
            # 檢查文件擴展名
            ext = os.path.splitext(file)[1]
            if ext not in TARGET_EXTENSIONS:
                continue
            
            if convert_file(filepath):
                converted_count += 1
                print(f"✓ 已轉換：{filepath}")
    
    print(f"\n轉換完成！")
    print(f"成功轉換：{converted_count} 個文件")
    if error_count > 0:
        print(f"錯誤：{error_count} 個文件")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        target_dir = sys.argv[1]
    else:
        target_dir = '.'
    
    if not os.path.isdir(target_dir):
        print(f"錯誤：{target_dir} 不是一個有效的目錄")
        sys.exit(1)
    
    print(f"開始轉換目錄：{os.path.abspath(target_dir)}")
    print("使用轉換模式：簡體中文 → 繁體中文（香港標準）")
    print("-" * 60)
    
    convert_directory(target_dir)
