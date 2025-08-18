# Kaito API PoW (Proof of Work) 机制说明

## 🔐 反爬虫机制更新

Kaito AI 已经实施了新的反爬虫机制，需要通过 Proof of Work (PoW) 计算来获取 API 访问权限。

## 🚀 工作流程

### 1. 获取 Challenge
```javascript
const challengeResponse = await axios.get('https://hub.kaito.ai/api/v1/anti-crawling/challenge');
// 返回: { challenge: "kaito_ai_challenge_...", difficulty: 4.3 }
```

### 2. 计算 PoW Headers
```javascript
function getPowHeaders(challenge, difficulty) {
    let nonce = 0;
    const targetDifficulty = Math.floor(difficulty);
    const fractionalPart = difficulty - targetDifficulty;
    const hexThreshold = Math.ceil(16 * (1 - fractionalPart)) % 16;
    const targetPrefix = "0".repeat(targetDifficulty);

    while (true) {
        const key = `${challenge}:${nonce}`;
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        
        if (hash.startsWith(targetPrefix) && 
            (fractionalPart === 0 || parseInt(hash[targetDifficulty], 16) < hexThreshold)) {
            return { 
                "x-challenge": challenge, 
                "x-nonce": String(nonce), 
                "x-hash": hash 
            };
        }
        nonce += 1;
    }
}
```

### 3. 发送 API 请求
```javascript
const response = await axios.get(
    'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard',
    { 
        headers: {
            ...powHeaders,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }, 
        params: {
            duration: "7d",
            topic_id: "APT",
            top_n: 100,
            community_tier: "tier1",
            customized_community: "customized",
            community_yaps: "true"
        }
    }
);
```

## 📊 响应格式变化

**新格式**: API 现在直接返回用户数组
```javascript
[
  {
    "topic_id": "0G",
    "user_id": "1724715280205836288",
    "name": "Akiii $M | 🐜",
    "username": "Guomin184935",
    "mindshare": 0.0353378738332164,
    "rank": "1",
    // ... 其他字段
  },
  // ... 更多用户
]
```

**标准化处理**: 我们的代码自动包装为 `{data: array}` 格式以保持兼容性。

## ⚡ 性能特点

- **PoW 计算时间**: 通常 200-500ms（取决于难度）
- **难度范围**: 3.0 - 5.0（动态调整）
- **成功率**: 接近 100%

## 🔧 已更新的文件

1. **server.js**: 本地开发服务器的 API 代理
2. **scripts/collectKolData.js**: 数据收集脚本
3. **test-pow-api.js**: PoW 机制测试脚本

## 🧪 测试命令

```bash
# 测试 PoW 机制
node test-pow-api.js

# 测试本地 API 代理
curl "http://localhost:3000/api/kol/mindshare/top-leaderboard?duration=7d&topic_id=0G&top_n=5"

# 启动开发服务器
npm start
```

## 📝 注意事项

1. **Challenge 有效期**: 每个 challenge 只能使用一次
2. **请求频率**: 保持合理的请求间隔
3. **错误处理**: 401 错误通常表示 PoW 计算错误或 challenge 过期
4. **生产环境**: 生产环境主要使用缓存的 kol.json 数据

## 🎯 测试结果

- ✅ **0G 项目**: 75 条记录
- ✅ **DYDX 项目**: 31 条记录  
- ✅ **本地代理**: 正常工作
- ✅ **数据格式**: 自动标准化

---

*最后更新: 2025-01-28*
*作者: @wang_xiaolou*
