const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Kaito API 配置
const BASE_URL = 'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard';

// 测试用的少量项目
const TEST_PROJECTS = {
    pre_tge: ["MONAD", "INFINEX", "FUEL"],
    post_tge: ["APT", "ARB", "BERA"]
};

const DURATIONS = ["7d", "30d"];

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API请求函数
async function fetchKaitoData(topicId, duration) {
    try {
        console.log(`请求: ${topicId} - ${duration}`);
        
        const params = {
            duration,
            topic_id: topicId,
            top_n: 10, // 测试时只获取前10名
            community_tier: 'tier1',
            customized_community: 'customized',
            community_yaps: 'true'
        };

        const response = await axios.get(BASE_URL, {
            params,
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        return response.data;
    } catch (error) {
        console.warn(`请求失败: ${topicId} - ${duration}:`, error.message);
        return null;
    }
}

// 收集测试数据
async function collectTestData() {
    const result = {
        lastUpdate: new Date().toISOString(),
        categories: {
            pre_tge: {},
            post_tge: {}
        },
        // 按用户名分组的数据 - 格式: name -> topic_id -> 周期 -> {rank, mindshare, community_score}
        users: {},
        stats: {
            totalKOLs: 0,
            successfulRequests: 0,
            failedRequests: 0,
            uniqueUsers: 0
        }
    };

    console.log('🧪 开始收集测试数据...');

    for (const [category, projects] of Object.entries(TEST_PROJECTS)) {
        console.log(`\n📋 处理 ${category} 类别...`);
        
        for (const project of projects) {
            console.log(`\n🔄 处理项目: ${project}`);
            const projectData = {};
            
            for (const duration of DURATIONS) {
                const data = await fetchKaitoData(project, duration);
                
                if (data) {
                    // 处理不同的API响应结构
                    let users = [];
                    if (Array.isArray(data)) {
                        users = data;
                    } else if (data && Array.isArray(data.data)) {
                        users = data.data;
                    }
                    
                    if (users.length > 0) {
                        const processedUsers = users.map((user, index) => ({
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
                        
                        projectData[duration] = processedUsers;
                        result.stats.totalKOLs += processedUsers.length;
                        result.stats.successfulRequests++;
                        console.log(`✅ ${project} - ${duration}: ${processedUsers.length} 个KOL`);
                        
                        // 按用户名重新组织数据
                        organizeDataByUser(processedUsers, project, duration, result.users);
                        
                    } else {
                        projectData[duration] = [];
                        result.stats.failedRequests++;
                        console.log(`⚠️  ${project} - ${duration}: 无数据`);
                    }
                } else {
                    projectData[duration] = [];
                    result.stats.failedRequests++;
                    console.log(`❌ ${project} - ${duration}: 请求失败`);
                }
                
                // 请求间隔
                await delay(1000);
            }
            
            result.categories[category][project] = projectData;
        }
    }

    // 统计唯一用户数
    result.stats.uniqueUsers = Object.keys(result.users).length;

    return result;
}

// 按用户名重新组织数据的函数
function organizeDataByUser(users, topicId, duration, usersData) {
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
    });
}

// 保存测试数据
async function saveTestData(data) {
    try {
        const outputPath = path.join(__dirname, '..', 'test-kol.json');
        await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`\n💾 测试数据已保存到: ${outputPath}`);
        console.log(`📊 统计信息:`);
        console.log(`  - 总KOL数: ${data.stats.totalKOLs}`);
        console.log(`  - 唯一用户数: ${data.stats.uniqueUsers}`);
        console.log(`  - 成功请求: ${data.stats.successfulRequests}`);
        console.log(`  - 失败请求: ${data.stats.failedRequests}`);
        
        // 显示一些用户数据示例
        const usernames = Object.keys(data.users).slice(0, 3);
        if (usernames.length > 0) {
            console.log(`\n🔍 数据格式示例 (前${usernames.length}个用户):`);
            usernames.forEach(username => {
                const user = data.users[username];
                console.log(`\n👤 用户: ${user.name} (@${user.username})`);
                console.log(`   项目数据:`);
                Object.entries(user.projects).forEach(([project, durations]) => {
                    console.log(`     ${project}:`);
                    Object.entries(durations).forEach(([duration, data]) => {
                        console.log(`       ${duration}: rank=${data.rank}, mindshare=${data.mindshare.toFixed(4)}, community_score=${data.community_score}`);
                    });
                });
            });
        }
        
        return outputPath;
    } catch (error) {
        console.error('❌ 保存文件失败:', error.message);
        throw error;
    }
}

// 运行测试
async function main() {
    try {
        const testData = await collectTestData();
        await saveTestData(testData);
        
        console.log('\n🎉 测试数据收集完成！');
        console.log('您可以使用以下命令测试查询功能：');
        console.log('node scripts/testQuery.js');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
