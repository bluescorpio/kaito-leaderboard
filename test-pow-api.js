// 测试新的 PoW API 调用机制
const axios = require('axios');
const crypto = require('crypto');

// PoW (Proof of Work) 计算函数
function getPowHeaders(challenge, difficulty) {
    let nonce = 0;
    const targetDifficulty = Math.floor(difficulty);
    const fractionalPart = difficulty - targetDifficulty;
    const hexThreshold = Math.ceil(16 * (1 - fractionalPart)) % 16;
    const targetPrefix = "0".repeat(targetDifficulty);

    console.log(`🔍 开始 PoW 计算: challenge=${challenge.substring(0, 8)}..., difficulty=${difficulty}`);
    const startTime = Date.now();

    while (true) {
        const key = `${challenge}:${nonce}`;
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        
        if (hash.startsWith(targetPrefix) && 
            (fractionalPart === 0 || parseInt(hash[targetDifficulty], 16) < hexThreshold)) {
            const endTime = Date.now();
            console.log(`✅ PoW 完成: nonce=${nonce}, hash=${hash.substring(0, 16)}..., 耗时=${endTime - startTime}ms`);
            return { 
                "x-challenge": challenge, 
                "x-nonce": String(nonce), 
                "x-hash": hash 
            };
        }
        nonce += 1;
        
        // 每 10000 次显示进度
        if (nonce % 10000 === 0) {
            console.log(`⏳ PoW 进度: nonce=${nonce}`);
        }
    }
}

async function testApiCall() {
    try {
        console.log('🚀 测试 Kaito API 新的 PoW 机制...\n');
        
        // 1. 获取 challenge
        console.log('📡 步骤 1: 获取 challenge...');
        const challengeResponse = await axios.get('https://hub.kaito.ai/api/v1/anti-crawling/challenge', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });
        
        const challengeData = challengeResponse.data;
        console.log(`✅ Challenge 获取成功:`);
        console.log(`   - challenge: ${challengeData.challenge}`);
        console.log(`   - difficulty: ${challengeData.difficulty}\n`);
        
        // 2. 计算 PoW headers
        console.log('🔢 步骤 2: 计算 PoW headers...');
        const powHeaders = getPowHeaders(challengeData.challenge, challengeData.difficulty);
        console.log(`✅ PoW Headers 计算完成:`);
        console.log(`   - x-challenge: ${powHeaders['x-challenge']}`);
        console.log(`   - x-nonce: ${powHeaders['x-nonce']}`);
        console.log(`   - x-hash: ${powHeaders['x-hash']}\n`);
        
        // 3. 测试 API 调用
        console.log('📊 步骤 3: 调用 leaderboard API...');
        const params = {
            duration: "7d",
            topic_id: "APT",
            top_n: 10,
            community_tier: "tier1",
            customized_community: "customized",
            community_yaps: "true"
        };
        
        const leaderboardResponse = await axios.get(
            'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard',
            { 
                headers: {
                    ...powHeaders,
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }, 
                params 
            }
        );
        
        console.log(`✅ API 调用成功!`);
        console.log(`   - 状态码: ${leaderboardResponse.status}`);
        console.log(`   - 数据条数: ${leaderboardResponse.data?.data?.length || 0}`);
        
        if (leaderboardResponse.data?.data?.length > 0) {
            console.log(`   - 第一名: ${leaderboardResponse.data.data[0].name}`);
            console.log(`   - 影响力分数: ${leaderboardResponse.data.data[0].mindshare}`);
        }
        
        console.log('\n🎉 测试成功! Kaito API PoW 机制正常工作');
        
    } catch (error) {
        console.error('\n❌ 测试失败:');
        console.error(`   - 错误信息: ${error.message}`);
        console.error(`   - 状态码: ${error.response?.status || 'N/A'}`);
        console.error(`   - 响应数据:`, error.response?.data || 'N/A');
        
        if (error.response?.status === 401) {
            console.error('\n💡 提示: 401 错误通常表示 PoW 计算错误或 challenge 已过期');
        } else if (error.response?.status === 429) {
            console.error('\n💡 提示: 429 错误表示请求频率过快，请稍后重试');
        }
    }
}

// 运行测试
testApiCall().then(() => {
    console.log('\n🏁 测试完成');
    process.exit(0);
}).catch((error) => {
    console.error('\n💥 未预期的错误:', error);
    process.exit(1);
});
