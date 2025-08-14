const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Kaito API 配置
const BASE_URL = 'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard';

// 项目分类
const PRE_TGE_TOPICS = [
    "0G", "ALLORA", "ANOMA", "BILLIONS", "BLS", "BOUNDLESS", "CAMP", "CYSIC", "FALCON", "FOGO", "HANAHANA",
    "GOATNETWORK", "INFINEX", "INFINIT", "IRYS", "KAT", "LOMBARD", "LUMITERRA", "MEGAETH",
    "MEMEX", "MIRA", "MITOSIS", "MOMENTUM", "MONAD", "MULTIBANK", "MULTIPLI", "NYT", "NOYA", "OPENLEDGER",
    "PARADEX", "PORTALPORTAL", "PUFFPAW", "SAPIEN", "SOMNIA", "SO",
    "SURF", "SYMPHONY", "THEORIQ", "THRIVE", "TURTLECLUB", "UNION", "WARP", "YEET"
];

const POST_TGE_TOPICS = [
    "KAITO", "ANIME", "APT", "ARB", "BERA", "BLUE", "BOOPBOOPFUN", "BYBITTRADFI", "CALDERA",
    "CORN", "CREATORBID", "DEFIAPP", "DYDX", "ECLIPSE", "FRAX", "FUEL", "HUMAFINANCE",
    "HUMANITY", "INITIA", "INJ", "IQ", "KAIA", "KINTO", "MNT", "OM", "MAPLESTORYUNIVERSE",
    "MOVEMENT", "NEAR", "NEWTON", "ORDERLYNETWORK", "PEAQ", "PENGU", "DOT", "POL", "PYTH",
    "QUAI", "SATLAYER", "SEI", "SIDEKICK", "SKATE", "S", "SOON", "SOPHON", "STARKNET", "STORYPROTOCOL", "SUCCINCT", "UXLINK",
    "VIRTUALECOSYSTEM", "WAL", "WAYFINDER", "XION", "ZEC"
];

const DURATIONS = ["7d", "30d", "3m", "6m", "12m"];

// 延迟函数，避免请求过于频繁
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 带重试的API请求函数
async function fetchWithRetry(url, params, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`请求: ${params.topic_id} - ${params.duration} (尝试 ${i + 1}/${retries})`);
            
            const response = await axios.get(url, {
                params: {
                    ...params,
                    community_tier: 'tier1',
                    customized_community: 'customized',
                    community_yaps: 'true'
                },
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });

            return response.data;
        } catch (error) {
            console.warn(`请求失败 (${i + 1}/${retries}):`, error.message);
            
            if (i === retries - 1) {
                throw error;
            }
            
            // 指数退避延迟
            await delay(1000 * Math.pow(2, i));
        }
    }
}

// 收集单个项目的数据
async function collectProjectData(topicId, category) {
    const projectData = {};
    
    for (const duration of DURATIONS) {
        try {
            const params = {
                duration,
                topic_id: topicId,
                top_n: 100
            };
            
            const data = await fetchWithRetry(BASE_URL, params);
            
            // 处理不同的API响应结构
            let users = [];
            if (Array.isArray(data)) {
                users = data;
            } else if (data && Array.isArray(data.data)) {
                users = data.data;
            } else {
                console.warn(`意外的API响应结构: ${topicId} - ${duration}`);
                continue;
            }
            
            // 提取需要的数据
            const durationData = users.map((user, index) => ({
                name: user.name || 'Unknown User',
                username: user.username || '',
                rank: user.rank || (index + 1),
                mindshare: user.mindshare || 0,
                community_score: user.last_7_day_avg_llm_insightfulness_score_scaled || 0,
                follower_count: user.follower_count || 0,
                smart_follower_count: user.smart_follower_count || 0,
                icon: user.icon || '',
                bio: user.bio || '',
                twitter_user_url: user.twitter_user_url || `https://x.com/${user.username}`
            }));
            
            projectData[duration] = durationData;
            console.log(`✅ 成功收集: ${topicId} - ${duration} (${durationData.length} 个KOL)`);
            
            // 请求间隔，避免频率限制
            await delay(500);
            
        } catch (error) {
            console.error(`❌ 收集失败: ${topicId} - ${duration}:`, error.message);
            projectData[duration] = [];
        }
    }
    
    return projectData;
}

// 主函数：收集所有数据
async function collectAllData() {
    const startTime = Date.now();
    const result = {
        lastUpdate: new Date().toISOString(),
        totalProjects: PRE_TGE_TOPICS.length + POST_TGE_TOPICS.length,
        totalDurations: DURATIONS.length,
        // 按项目分组的原始数据
        categories: {
            pre_tge: {},
            post_tge: {}
        },
        // 按用户名分组的数据 - 格式: name -> topic_id -> 周期 -> {rank, mindshare, community_score}
        users: {},
        stats: {
            totalKOLs: 0,
            totalDataPoints: 0,
            successfulRequests: 0,
            failedRequests: 0,
            uniqueUsers: 0
        }
    };
    
    console.log(`🚀 开始收集KOL数据...`);
    console.log(`📊 总计: ${result.totalProjects} 个项目 × ${result.totalDurations} 个时间周期 = ${result.totalProjects * result.totalDurations} 个数据集`);
    
    // 收集Pre TGE项目数据
    console.log('\n📋 收集Pre TGE项目数据...');
    for (let i = 0; i < PRE_TGE_TOPICS.length; i++) {
        const topic = PRE_TGE_TOPICS[i];
        console.log(`\n🔄 处理Pre TGE项目 ${i + 1}/${PRE_TGE_TOPICS.length}: ${topic}`);
        
        try {
            const projectData = await collectProjectData(topic, 'pre_tge');
            result.categories.pre_tge[topic] = projectData;
            
            // 按用户名重新组织数据
            organizeDataByUser(projectData, topic, result.users, result.stats);
            
        } catch (error) {
            console.error(`❌ 项目 ${topic} 收集失败:`, error.message);
            result.categories.pre_tge[topic] = {};
            result.stats.failedRequests += DURATIONS.length;
        }
    }
    
    // 收集Post TGE项目数据
    console.log('\n📋 收集Post TGE项目数据...');
    for (let i = 0; i < POST_TGE_TOPICS.length; i++) {
        const topic = POST_TGE_TOPICS[i];
        console.log(`\n🔄 处理Post TGE项目 ${i + 1}/${POST_TGE_TOPICS.length}: ${topic}`);
        
        try {
            const projectData = await collectProjectData(topic, 'post_tge');
            result.categories.post_tge[topic] = projectData;
            
            // 按用户名重新组织数据
            organizeDataByUser(projectData, topic, result.users, result.stats);
            
        } catch (error) {
            console.error(`❌ 项目 ${topic} 收集失败:`, error.message);
            result.categories.post_tge[topic] = {};
            result.stats.failedRequests += DURATIONS.length;
        }
    }
    
    // 统计唯一用户数
    result.stats.uniqueUsers = Object.keys(result.users).length;
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log('\n📊 数据收集完成！');
    console.log(`⏱️  总耗时: ${duration.toFixed(2)} 秒`);
    console.log(`✅ 成功请求: ${result.stats.successfulRequests}`);
    console.log(`❌ 失败请求: ${result.stats.failedRequests}`);
    console.log(`👥 总KOL数: ${result.stats.totalKOLs}`);
    console.log(`📈 总数据点: ${result.stats.totalDataPoints}`);
    console.log(`🔑 唯一用户数: ${result.stats.uniqueUsers}`);
    
    return result;
}

// 按用户名重新组织数据的函数
function organizeDataByUser(projectData, topicId, usersData, stats) {
    for (const [duration, users] of Object.entries(projectData)) {
        if (Array.isArray(users)) {
            users.forEach(user => {
                const username = user.username.toLowerCase();
                
                // 初始化用户数据结构
                if (!usersData[username]) {
                    usersData[username] = {
                        name: user.name,
                        username: user.username,
                        icon: user.icon,
                        bio: user.bio,
                        follower_count: user.follower_count,
                        smart_follower_count: user.smart_follower_count,
                        twitter_user_url: user.twitter_user_url,
                        projects: {} // topic_id -> 周期 -> {rank, mindshare, community_score}
                    };
                }
                
                // 初始化项目数据
                if (!usersData[username].projects[topicId]) {
                    usersData[username].projects[topicId] = {};
                }
                
                // 存储该用户在该项目该时间周期的排名数据
                usersData[username].projects[topicId][duration] = {
                    rank: user.rank,
                    mindshare: user.mindshare,
                    community_score: user.community_score
                };
                
                stats.totalKOLs++;
                stats.totalDataPoints++;
            });
            stats.successfulRequests++;
        } else {
            stats.failedRequests++;
        }
    }
}

// 保存数据到JSON文件
async function saveDataToFile(data, filename = 'kol.json') {
    try {
        const outputPath = path.join(__dirname, '..', filename);
        await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`\n💾 数据已保存到: ${outputPath}`);
        
        // 计算文件大小
        const stats = await fs.stat(outputPath);
        const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`📁 文件大小: ${fileSizeMB} MB`);
        
        return outputPath;
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
        throw error;
    }
}

// 运行脚本
async function main() {
    try {
        console.log('🎯 Kaito KOL 数据收集工具');
        console.log('================================\n');
        
        const data = await collectAllData();
        await saveDataToFile(data);
        
        console.log('\n🎉 数据收集和保存完成！');
        console.log('现在可以使用本地JSON文件进行快速查询了。');
        
    } catch (error) {
        console.error('❌ 脚本执行失败:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    collectAllData,
    saveDataToFile,
    collectProjectData
};
