const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用 CORS
app.use(cors());

// 静态文件服务
app.use(express.static('.'));

// API 代理路由
app.get('/api/kol/mindshare/top-leaderboard', async (req, res) => {
    try {
        const { duration, topic_id, top_n, community_tier, customized_community, community_yaps } = req.query;
        
        const params = new URLSearchParams({
            duration: duration || '7d',
            topic_id: topic_id || 'APT',
            top_n: top_n || '10',
            community_tier: community_tier || 'tier1',
            customized_community: customized_community || 'customized',
            community_yaps: community_yaps || 'true'
        });

        const apiUrl = `https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard?${params}`;
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
        
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data from Kaito API',
            message: error.message 
        });
    }
});

// 默认路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'demo.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
