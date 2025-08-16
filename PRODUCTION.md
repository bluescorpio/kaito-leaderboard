# 生产环境部署清单

## 📦 生产环境文件

需要部署到生产环境的文件：

### 核心文件
- ✅ `server.js` - 服务器主文件 (已配置生产环境逻辑)
- ✅ `package.json` - 生产环境配置 (已移除数据收集功能)
- ✅ `kol.json` - 数据文件 (手动上传最新版本)

### 网站文件
- ✅ `production-api-fallback.html` - 生产首页 (API + 本地数据回退)
- ✅ `production-clean.html` - 纯本地数据页面
- ✅ `demo.html` - 演示页面
- ✅ `index.html` - 完整功能页面  
- ✅ `README.md` - 项目说明

### 支持文件
- ✅ `.gitignore` - Git忽略配置
- ✅ `SECURITY.md` - 安全说明

## � 数据获取机制

### 生产环境数据流
```
1. 用户访问网站
2. 尝试从API获取实时数据
3. 如果API失败 → 自动回退到 kol.json
4. 显示数据源状态 (API/本地/无)
```

### 页面选择
- **生产首页**: `production-api-fallback.html` - API优先 + 本地回退
- **纯本地**: `production-clean.html` - 仅使用本地数据
- **开发模式**: `demo.html` - 完整开发功能

## �🚫 不部署的文件

以下文件仅在本地开发环境使用：

### 数据收集相关
- ❌ `scripts/collectKolData.js` - 数据收集脚本
- ❌ `scripts/testCollect.js` - 收集测试
- ❌ `scripts/testQuery.js` - 查询测试
- ❌ `package-dev.json` - 开发环境配置
- ❌ `LOCAL_DEV.md` - 本地开发说明

### 临时文件
- ❌ `kol_progress.json` - 收集进度
- ❌ `collect_*.json` - 临时数据
- ❌ `.env*` - 环境变量文件

## 🔧 生产环境部署命令

```bash
# 1. 设置生产环境
export NODE_ENV=production

# 2. 安装依赖 (仅生产依赖)
npm install --production

# 3. 启动服务
npm run production

# 或
npm start
```

## 🔗 API设置说明

### 生产环境API行为
- **NODE_ENV=production**: API代理被禁用，网站自动使用本地数据
- **NODE_ENV=development**: API代理启用，可以进行实时请求

### 数据源优先级
1. **首选**: 实时API (如果可用)
2. **回退**: 本地 kol.json 文件
3. **失败**: 显示错误信息

## 📊 数据更新流程

1. **本地收集**: 在开发环境运行数据收集
2. **验证数据**: 检查 `kol.json` 文件
3. **手动上传**: 将新的 `kol.json` 上传到生产服务器
4. **无需重启**: 网站会自动使用新数据

## 🔒 安全检查

- ✅ 数据收集功能已从生产配置移除
- ✅ 生产环境API代理已禁用
- ✅ 生产环境自动回退到本地数据
- ✅ 敏感文件已添加到 `.gitignore`
- ✅ 实现了智能数据源检测和切换
