# 数据收集安全说明

## 🔒 环境安全

数据收集脚本 `collectKolData.js` 已经配置了多重安全保护，确保不会在生产环境运行：

### 安全机制

1. **环境检测**: 自动检测 `NODE_ENV` 环境变量
2. **域名检查**: 检测当前运行域名，阻止在生产域名运行
3. **脚本保护**: `npm run collect` 被禁用，必须使用开发专用命令

### 正确使用方式

#### 开发环境数据收集
```bash
# 推荐: 开发环境收集
npm run collect:dev

# 强制运行 (跳过3秒等待)
npm run collect:force

# 直接运行 (手动设置环境)
NODE_ENV=development node scripts/collectKolData.js --dev
```

#### 生产环境运行
```bash
# 生产环境仅运行服务器
npm run production

# 或者
NODE_ENV=production npm start
```

### 环境变量配置

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

关键配置：
- `NODE_ENV=development` - 开发环境
- `NODE_ENV=production` - 生产环境 (禁用数据收集)

### 错误提示

如果在生产环境尝试运行数据收集，会看到：
```
🚫 错误: 数据收集脚本不能在生产环境运行!
💡 请在开发环境或本地环境运行此脚本
```

### 文件保护

以下文件不会被提交到 Git：
- `.env` - 环境配置
- `kol_progress.json` - 收集进度
- `collect_*.json` - 临时数据文件

## 📊 数据流程

1. **开发环境**: 使用 API 收集最新数据 → 保存到 `kol.json`
2. **生产环境**: 仅读取现有的 `kol.json` 文件
3. **网站展示**: 所有环境都使用本地 `kol.json` 数据

这样确保了生产环境的稳定性和安全性。
