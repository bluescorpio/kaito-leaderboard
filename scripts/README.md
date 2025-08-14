# Kaito KOL 数据收集和查询系统

这个系统包含两个主要工具：
1. **数据收集工具** - 从Kaito API收集所有项目的KOL数据并保存到本地JSON文件
2. **数据查询工具** - 从本地JSON文件快速查询KOL排名信息

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 收集数据
```bash
# 收集所有项目的KOL数据（大约需要10-20分钟）
npm run collect
```

这将创建一个 `kol.json` 文件，包含所有95个项目在5个时间周期的KOL排名数据。

### 3. 查询数据
```bash
# 搜索特定用户
npm run search vitalik

# 获取项目排行榜
node scripts/queryKolData.js leaderboard post_tge APT 7d 10

# 查看数据统计
npm run stats

# 列出所有项目
npm run projects
```

## 📊 数据结构

生成的 `kol.json` 文件结构如下：

```json
{
  "lastUpdate": "2025-01-14T...",
  "totalProjects": 95,
  "totalDurations": 5,
  "categories": {
    "pre_tge": {
      "MONAD": {
        "7d": [
          {
            "name": "User Name",
            "username": "username",
            "rank": 1,
            "mindshare": 0.0523,
            "community_score": 85,
            "follower_count": 150000,
            "smart_follower_count": 250,
            "icon": "https://...",
            "bio": "Bio text",
            "twitter_user_url": "https://x.com/username"
          }
        ],
        "30d": [...],
        "3m": [...],
        "6m": [...],
        "12m": [...]
      }
    },
    "post_tge": {
      "APT": {
        "7d": [...],
        ...
      }
    }
  },
  "stats": {
    "totalKOLs": 45000,
    "totalDataPoints": 45000,
    "successfulRequests": 450,
    "failedRequests": 25
  }
}
```

## 🔍 查询API

### 基本查询类

```javascript
const KolDataQuery = require('./scripts/queryKolData');
const query = new KolDataQuery();

// 搜索用户的所有排名
const userRankings = await query.getUserAllRankings('vitalik');

// 获取特定项目排行榜
const leaderboard = await query.getLeaderboard('post_tge', 'APT', '7d', 10);

// 获取项目的top KOL
const topKOLs = await query.getProjectTopKOLs('pre_tge', 'MONAD', 20);
```

## 📋 支持的项目

### Pre TGE 项目 (43个)
- 0G, ALLORA, ANOMA, BILLIONS, BLS, BOUNDLESS, CAMP, CYSIC, FALCON, FOGO, HANAHANA
- GOATNETWORK, INFINEX, INFINIT, IRYS, KAT, LOMBARD, LUMITERRA, MEGAETH
- MEMEX, MIRA, MITOSIS, MOMENTUM, MONAD, MULTIBANK, MULTIPLI, NYT, NOYA, OPENLEDGER
- PARADEX, PORTALPORTAL, PUFFPAW, SAPIEN, SOMNIA, SO
- SURF, SYMPHONY, THEORIQ, THRIVE, TURTLECLUB, UNION, WARP, YEET

### Post TGE 项目 (52个)
- KAITO, ANIME, APT, ARB, BERA, BLUE, BOOPBOOPFUN, BYBITTRADFI, CALDERA
- CORN, CREATORBID, DEFIAPP, DYDX, ECLIPSE, FRAX, FUEL, HUMAFINANCE
- HUMANITY, INITIA, INJ, IQ, KAIA, KINTO, MNT, OM, MAPLESTORYUNIVERSE
- MOVEMENT, NEAR, NEWTON, ORDERLYNETWORK, PEAQ, PENGU, DOT, POL, PYTH
- QUAI, SATLAYER, SEI, SIDEKICK, SKATE, S, SOON, SOPHON, STARKNET, STORYPROTOCOL, SUCCINCT, UXLINK
- VIRTUALECOSYSTEM, WAL, WAYFINDER, XION, ZEC

### 时间周期
- 7d (7天)
- 30d (30天)
- 3m (3个月)
- 6m (6个月)
- 12m (12个月)

## 🛠️ 命令行工具

### 数据收集
```bash
# 收集所有数据
npm run collect

# 或直接运行
node scripts/collectKolData.js
```

### 数据查询
```bash
# 搜索用户
node scripts/queryKolData.js search <username>

# 获取排行榜
node scripts/queryKolData.js leaderboard <category> <project> <duration> [limit]

# 列出所有项目
node scripts/queryKolData.js projects

# 显示统计信息
node scripts/queryKolData.js stats
```

### 使用示例
```bash
# 搜索用户
node scripts/queryKolData.js search vitalik

# 获取APT项目7天排行榜前10名
node scripts/queryKolData.js leaderboard post_tge APT 7d 10

# 获取MONAD项目30天排行榜前20名
node scripts/queryKolData.js leaderboard pre_tge MONAD 30d 20
```

## ⚡ 性能优势

- **快速查询**: 本地JSON文件查询，毫秒级响应
- **完整数据**: 一次收集，包含所有475个数据集
- **离线可用**: 无需网络连接即可查询
- **数据完整性**: 包含rank、mindshare、community_score等完整信息

## 🔄 数据更新

建议定期重新运行数据收集以获取最新排名：

```bash
# 重新收集最新数据
npm run collect
```

数据收集完成后，JSON文件会包含最新的时间戳和统计信息。

## 📈 数据统计

收集完成后，您可以查看详细的统计信息：

```bash
npm run stats
```

这会显示：
- 总项目数量
- 成功/失败的API请求数
- 收集到的KOL总数
- 数据最后更新时间
