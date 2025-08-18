#!/bin/bash

# 检查数据收集进度的快速脚本
echo "=== Kaito KOL 数据收集进度检查 ==="
echo "检查时间: $(date)"
echo ""

# 检查进度文件
if [ -f "kol_progress.json" ]; then
    echo "📋 当前进度:"
    cat kol_progress.json | python3 -m json.tool
    echo ""
else
    echo "❌ 进度文件不存在"
fi

# 检查数据文件大小
if [ -f "kol.json" ]; then
    echo "📊 数据文件信息:"
    ls -lh kol.json
    echo ""
    
    # 计算数据条数（粗略估算）
    lines=$(wc -l < kol.json)
    echo "📈 文件行数: $lines"
else
    echo "❌ 数据文件不存在"
fi

# 检查收集脚本是否还在运行
if pgrep -f "collectKolData.js" > /dev/null; then
    echo "✅ 数据收集脚本正在运行"
    echo "进程ID: $(pgrep -f collectKolData.js)"
else
    echo "⚠️  数据收集脚本未运行"
fi

echo ""
echo "💡 提示: 运行此脚本来快速检查进度"
echo "   bash check_progress.sh"
