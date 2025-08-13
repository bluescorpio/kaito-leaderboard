# 🚀 Kaito 影响力排行榜

一个现代化的 Web 应用，用于展示加密货币领域最具影响力的 KOL 和思想领袖。

## ✨ 功能特性

# 🚀 Kaito 影响力排行榜

一个现代化的 Web 应用，用于展示加密货币领域最具影响力的 KOL 和思想领袖。

## ✨ 功能特性

- 🏆 **实时排行榜**: 调用真实的 Kaito API 获取最新数据
- 📊 **项目分类**: 支持 Pre TGE 和 Post TGE 项目分类
- ⏰ **多时间范围**: 7天、30天、3个月、6个月、12个月
- 🎯 **灵活显示**: Top 10/25/50/100 可选
- 📱 **响应式设计**: 完美适配移动端和桌面端
- 🚀 **实时数据更新**: 通过代理服务器避免 CORS 问题

## 🛠 技术栈

- **前端**: HTML5, CSS3, Vanilla JavaScript
- **后端**: Node.js, Express
- **API**: Kaito AI Hub API
- **部署**: 支持 Vercel, Netlify, Heroku 等平台

## 🚀 快速开始

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **启动生产服务器**
```bash
npm start
```

访问 http://localhost:3000 查看应用。

## 📦 部署到生产环境

### Vercel 部署 (推荐)
1. Fork 此仓库到你的 GitHub
2. 在 Vercel 中导入项目
3. 自动部署完成

### Netlify 部署
1. 连接到 GitHub 仓库
2. 构建命令: `npm install`
3. 发布目录: `.`
4. 添加重定向规则支持 SPA

### Heroku 部署
1. 创建 Heroku 应用
2. 连接到 GitHub 仓库
3. 启用自动部署

### 传统服务器部署
1. 上传文件到服务器
2. 运行 `npm install`
3. 使用 PM2 管理进程:
```bash
npm install -g pm2
pm2 start server.js --name kaito-app
```

## ⚙️ 环境变量

- `PORT`: 服务器端口 (默认: 3000)

## 🔧 API 说明

应用通过代理服务器调用 Kaito AI API，解决浏览器 CORS 限制：
- 原始 API: `https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard`
- 代理端点: `/api/kol/mindshare/top-leaderboard`
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔄 **智能降级**: API 失败时自动使用模拟数据

## 🎯 支持的项目

### Pre TGE 项目 (42个)
0G, ALLORA, ANOMA, BLS, BOUNDLESS, CAMP, CYSIC, FOGO, HANAHANA, GOATNETWORK, INFINEX, INFINIT, IRYS, KAT, LOMBARD, LUMITERRA, MEGAETH, MEMEX, MIRA, MITOSIS, MONAD, MULTIBANK, MULTIPLI, NYT, NOYA, OPENLEDGER, PARADEX, PORTALPORTAL, PUFFPAW, SATLAYER, SIDEKICK, SOMNIA, SO, SUCCINCT, SURF, SYMPHONY, THEORIQ, THRIVE, TURTLECLUB, UNION, WARP, YEET

### Post TGE 项目 (47个)
KAITO, ANIME, APT, ARB, BERA, BOOPBOOPFUN, BYBITTRADFI, CALDERA, CORN, CREATORBID, DEFIAPP, DYDX, ECLIPSE, FRAX, FUEL, HUMAFINANCE, HUMANITY, INITIA, INJ, IQ, KAIA, KINTO, MNT, MAPLESTORYUNIVERSE, MOVEMENT, NEAR, NEWTON, ORDERLYNETWORK, PEAQ, PENGU, DOT, PYTH, QUAI, SEI, SKATE, S, SOON, SOPHON, STARKNET, STORYPROTOCOL, UXLINK, VIRTUALECOSYSTEM, WAYFINDER, XION, ZEC

## 🚀 快速开始

### 演示版本
直接在浏览器中打开 `demo.html` 文件即可体验完整功能。

### React 开发版本

1. **安装依赖**
   ```bash
   cd kaito-leaderboard-website
   npm install
   ```

2. **启动开发服务器**
   ```bash
   # 如果遇到 Node.js 版本兼容问题，使用：
   NODE_OPTIONS="--openssl-legacy-provider" npm start
   
   # 或者直接：
   npm start
   ```

3. **访问应用**
   打开浏览器访问 `http://localhost:3000`

## 📊 API 集成

应用使用 Kaito 官方 API：
```
https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard
```

参数：
- `duration`: 时间范围 (7d, 30d, 3m, 6m, 12m)
- `topic_id`: 项目代码 (如 APT, ARB, BERA 等)
- `top_n`: 显示数量 (10, 25, 50, 100)

## 🛠️ 技术栈

- **前端框架**: React + TypeScript
- **样式**: CSS3 + 响应式设计
- **HTTP 客户端**: Axios
- **构建工具**: Create React App
- **数据源**: Kaito AI API

## 📁 项目结构

```
├── demo.html                 # 演示版本（纯 HTML/JS）
├── kaito-leaderboard-website/ # React 应用
│   ├── src/
│   │   ├── api/
│   │   │   └── kaitoApi.ts   # API 调用逻辑
│   │   ├── components/
│   │   │   ├── Leaderboard.tsx    # 主排行榜组件
│   │   │   └── ErrorBoundary.tsx  # 错误边界组件
│   │   ├── styles/
│   │   │   ├── App.css       # 全局样式
│   │   │   └── Leaderboard.css    # 排行榜样式
│   │   ├── App.tsx           # 主应用组件
│   │   └── index.tsx         # 入口文件
│   ├── public/
│   └── package.json
└── README.md
```

## 🔗 相关链接

- [Kaito AI 官方网站](https://yaps.kaito.ai/yapper-leaderboards)
- [API 文档](https://hub.kaito.ai)

## 📝 更新日志

### v1.0.0 (2024-12-19)
- ✅ 初始版本发布
- ✅ 支持 Pre TGE 和 Post TGE 项目分类
- ✅ 集成真实 Kaito API
- ✅ 响应式设计
- ✅ 错误处理和降级机制

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
# kaito-leaderboard
