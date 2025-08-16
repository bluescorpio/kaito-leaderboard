# 本地开发专用功能

这些功能仅在本地开发环境使用，不会部署到生产环境。

## 🔧 数据收集功能

### 快速使用

```bash
# 直接运行数据收集
node scripts/collectKolData.js --dev

# 或使用开发配置
NODE_ENV=development node scripts/collectKolData.js --dev --force
```

### 文件说明

- `scripts/collectKolData.js` - 主要数据收集脚本 (本地专用)
- `scripts/testCollect.js` - 测试收集功能 (本地专用)  
- `scripts/testQuery.js` - 测试查询功能 (本地专用)
- `package-dev.json` - 开发环境专用配置 (本地专用)
- `kol_progress.json` - 收集进度文件 (本地生成)

### 生产环境部署

生产环境仅部署以下文件：
- `server.js` - 服务器
- `package.json` - 生产配置 (无数据收集功能)
- `kol.json` - 数据文件 (手动上传)
- 网站文件 (`*.html`, `*.css`, `*.js`)

### 安全说明

1. **数据收集脚本** 不会被部署到生产环境
2. **生产环境** 只读取现有的 `kol.json` 文件  
3. **新数据** 需要在本地收集后手动更新到生产环境
4. **API密钥** 等敏感信息仅在本地使用

## 📋 使用流程

1. **本地开发**: 使用数据收集脚本获取最新数据
2. **测试验证**: 在本地测试网站功能
3. **数据更新**: 将新的 `kol.json` 手动上传到生产环境
4. **生产部署**: 仅部署网站代码，不包含数据收集功能

这样确保了生产环境的安全性和稳定性。
