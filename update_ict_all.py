import os
import re

# 主要的HTML文件列表
html_files = [
    'production-clean.html',
    'production-debug.html', 
    'debug.html',
    'fixed-index.html'
]

print("🚀 开始批量更新ICT功能到所有HTML文件...")

for filename in html_files:
    if not os.path.exists(filename):
        print(f"⚠️ 文件 {filename} 不存在，跳过")
        continue
        
    print(f"🔄 检查文件: {filename}")
    
    # 检查文件是否已经有ICT功能
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 检查是否有coming-soon的ICT模块
    if 'ICT 名单功能正在开发中' in content:
        print(f"  📝 {filename} 需要更新ICT模块")
    elif 'loadICTList()' in content:
        print(f"  ✅ {filename} 已有ICT功能")
    else:
        print(f"  ❓ {filename} ICT状态未知")

print("✅ 检查完成！需要手动更新带有'ICT 名单功能正在开发中'的文件")
