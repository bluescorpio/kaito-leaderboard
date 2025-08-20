const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const DatabaseManager = require('./database/DatabaseManager');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 初始化数据库管理器
const dbManager = new DatabaseManager();

// PoW (Proof of Work) 计算函数
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

// 启用 CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));

// API 代理路由 - 仅在开发环境启用
if (!isProduction) {
    console.log('🔧 开发环境：启用API代理功能');
    
    app.get('/api/kol/mindshare/top-leaderboard', async (req, res) => {
        try {
            const { duration, topic_id, top_n, community_tier, customized_community, community_yaps } = req.query;
            
            console.log(`🔄 API请求: ${topic_id} (${duration})`);
            
            // 1. 获取 challenge
            const challengeUrl = 'https://hub.kaito.ai/api/v1/anti-crawling/challenge';
            const challengeResponse = await fetch(challengeUrl);
            
            if (!challengeResponse.ok) {
                throw new Error(`Challenge request failed: ${challengeResponse.status}`);
            }
            
            const challengeData = await challengeResponse.json();
            console.log('✅ 获取 challenge 成功');
            
            // 2. 计算 PoW headers
            const powHeaders = getPowHeaders(challengeData.challenge, challengeData.difficulty);
            console.log('✅ PoW 计算完成');
            
            // 3. 构造请求参数
            const params = new URLSearchParams({
                duration: duration || '7d',
                topic_id: topic_id || 'APT',
                top_n: top_n || '10',
                community_tier: community_tier || 'tier1',
                customized_community: customized_community || 'customized',
                community_yaps: community_yaps || 'true'
            });

            const apiUrl = `https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard?${params}`;
            
            // 4. 发送带 PoW headers 的请求
            const response = await fetch(apiUrl, {
                headers: {
                    ...powHeaders,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`✅ 成功获取数据: ${Array.isArray(data) ? data.length : (data.data?.length || 0)} 条记录`);
            
            // 标准化响应格式：如果是数组，包装成 {data: array} 格式
            const standardizedData = Array.isArray(data) ? { data: data } : data;
            res.json(standardizedData);
            
        } catch (error) {
            console.error('❌ API Error:', error);
            res.status(500).json({ 
                error: 'Failed to fetch data from Kaito API',
                message: error.message 
            });
        }
    });
} else {
    console.log('🔒 生产环境：API代理功能已禁用');
    
    // 生产环境中，如果有人尝试访问API端点，返回禁用信息
    app.get('/api/*', (req, res) => {
        res.status(403).json({ 
            error: 'API access disabled in production',
            message: 'This endpoint is only available in development environment'
        });
    });
}

// 数据库 API 路由
app.get('/api/db/leaderboard', async (req, res) => {
    try {
        const { project, duration = '7d', limit = 10 } = req.query;
        
        if (!project) {
            return res.status(400).json({ error: '项目名称不能为空' });
        }
        
        const leaderboard = await dbManager.getLeaderboard(project, duration, parseInt(limit));
        res.json({
            success: true,
            data: leaderboard,
            total: leaderboard.length,
            project,
            duration,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('数据库排行榜查询错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '查询失败', 
            message: error.message 
        });
    }
});

app.get('/api/db/search', async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({ error: '用户名不能为空' });
        }
        
        const userResult = await dbManager.searchUser(username);
        
        if (!userResult) {
            return res.status(404).json({ 
                success: false, 
                error: '用户未找到',
                username 
            });
        }
        
        res.json({
            success: true,
            data: userResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('数据库用户搜索错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '搜索失败', 
            message: error.message 
        });
    }
});

app.get('/api/db/projects', async (req, res) => {
    try {
        const projects = await dbManager.getProjects();
        res.json({
            success: true,
            data: projects,
            total: projects.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('数据库项目查询错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '查询失败', 
            message: error.message 
        });
    }
});

app.get('/api/db/stats', async (req, res) => {
    try {
        const stats = await dbManager.getStats();
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('数据库统计查询错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '查询失败', 
            message: error.message 
        });
    }
});

// 数据库管理路由
app.post('/api/db/import', async (req, res) => {
    try {
        console.log('🔄 开始从 JSON 导入数据到数据库...');
        const result = await dbManager.importFromJson();
        res.json({
            success: true,
            message: '数据导入成功',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('数据库导入错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '导入失败', 
            message: error.message 
        });
    }
});

// 默认路由
app.get('/', (req, res) => {
    if (isProduction) {
        // 生产环境使用带API回退功能的页面
        res.sendFile(path.join(__dirname, 'production-api-fallback.html'));
    } else {
        // 开发环境使用演示页面
        res.sendFile(path.join(__dirname, 'demo.html'));
    }
});

// 服务器启动时初始化数据库
async function startServer() {
    try {
        console.log('🔧 初始化数据库连接...');
        await dbManager.initialize();
        console.log('✅ 数据库连接成功');
        
        app.listen(PORT, () => {
            if (isProduction) {
                console.log(`🚀 生产环境服务器运行在 http://localhost:${PORT}`);
                console.log('🔒 API代理功能已禁用，仅使用本地数据');
            } else {
                console.log(`🔧 开发环境服务器运行在 http://localhost:${PORT}`);
                console.log('🛠️  API代理功能已启用');
                console.log('🗄️  数据库功能已启用');
                console.log('\n📚 数据库 API 端点:');
                console.log('   GET  /api/db/leaderboard?project=APT&duration=7d&limit=10');
                console.log('   GET  /api/db/search?username=用户名');
                console.log('   GET  /api/db/projects');
                console.log('   GET  /api/db/stats');
                console.log('   POST /api/db/import');
            }
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n🔄 正在关闭服务器...');
    await dbManager.close();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 正在关闭服务器...');
    await dbManager.close();
    console.log('✅ 数据库连接已关闭');
    process.exit(0);
});

// 启动服务器
startServer();
