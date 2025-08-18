const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 导入配置文件
const CONFIG = require('../config.js');

// 环境检测 - 防止在生产环境运行
const ENV_CHECK = {
    isDevelopment: process.env.NODE_ENV !== 'production',
    isLocalhost: process.env.HOSTNAME === 'localhost' || !process.env.HOSTNAME,
    hasDevFlag: process.argv.includes('--dev') || process.argv.includes('--development'),
    productionDomains: ['kaito-leaderboard.com', 'hub.kaito.ai', 'production.domain.com']
};

// 生产环境安全检查
function checkEnvironmentSafety() {
    // 检查是否在生产环境
    if (process.env.NODE_ENV === 'production') {
        console.error('🚫 错误: 数据收集脚本不能在生产环境运行!');
        console.error('💡 请在开发环境或本地环境运行此脚本');
        process.exit(1);
    }
    
    // 检查域名
    const currentDomain = process.env.DOMAIN || process.env.HOST;
    if (currentDomain && ENV_CHECK.productionDomains.some(domain => currentDomain.includes(domain))) {
        console.error('🚫 错误: 检测到生产域名，数据收集脚本被阻止运行!');
        console.error(`📍 当前域名: ${currentDomain}`);
        process.exit(1);
    }
    
    // 友好提示
    console.log('🔒 环境安全检查通过 - 运行在开发环境');
    console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
}

// Kaito API 配置
const BASE_URL = 'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard';
const CHALLENGE_URL = 'https://hub.kaito.ai/api/v1/anti-crawling/challenge';

// PoW (Proof of Work) 计算函数
function getPowHeaders(challenge, difficulty) {
    let nonce = 0;
    const targetDifficulty = Math.floor(difficulty);
    const fractionalPart = difficulty - targetDifficulty;
    const hexThreshold = Math.ceil(16 * (1 - fractionalPart)) % 16;
    const targetPrefix = "0".repeat(targetDifficulty);

    console.log(`🔍 开始 PoW 计算: challenge=${challenge.substring(0, 8)}..., difficulty=${difficulty}`);

    while (true) {
        const key = `${challenge}:${nonce}`;
        const hash = crypto.createHash('sha256').update(key).digest('hex');
        
        if (hash.startsWith(targetPrefix) && 
            (fractionalPart === 0 || parseInt(hash[targetDifficulty], 16) < hexThreshold)) {
            console.log(`✅ PoW 完成: nonce=${nonce}, hash=${hash.substring(0, 16)}...`);
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

// 频率控制配置
const RATE_LIMIT_CONFIG = {
    baseDelay: 3000,              // 增加基础延迟到3秒  
    maxDelay: 60000,              // 增加最大延迟到60秒
    retryDelay: 8000,             // 增加重试延迟到8秒
    projectDelay: 15000,          // 项目间延迟15秒
    batchSize: 3,                 // 减少批处理大小到3
    batchDelay: 20000,            // 增加批处理间隔到20秒
    maxRetries: 2,                // 减少重试次数到2次
    backoffMultiplier: 3.0,       // 增加退避倍数
    dailyLimit: 100,              // 每日API调用限制
    hourlyLimit: 20               // 每小时API调用限制
};

// 使用配置文件中的项目分类
const PRE_TGE_TOPICS = CONFIG.PRE_TGE_PROJECTS;
const POST_TGE_TOPICS = CONFIG.POST_TGE_PROJECTS;
const DURATIONS = CONFIG.DURATIONS;

// 延迟函数，避免请求过于频繁
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 智能延迟函数，根据错误类型调整延迟时间
const smartDelay = async (attempt, errorCode = null) => {
    let delayTime = RATE_LIMIT_CONFIG.baseDelay;
    
    if (errorCode === 401) {
        // 认证错误，更长的延迟
        delayTime = RATE_LIMIT_CONFIG.retryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt);
    } else if (errorCode === 429) {
        // 频率限制错误，指数退避
        delayTime = RATE_LIMIT_CONFIG.retryDelay * Math.pow(RATE_LIMIT_CONFIG.backoffMultiplier, attempt + 1);
    } else if (errorCode >= 500) {
        // 服务器错误，中等延迟
        delayTime = RATE_LIMIT_CONFIG.retryDelay * Math.pow(1.5, attempt);
    } else {
        // 其他错误或正常请求，基础延迟加随机抖动
        delayTime = RATE_LIMIT_CONFIG.baseDelay + Math.random() * 1000;
    }
    
    // 确保不超过最大延迟时间
    delayTime = Math.min(delayTime, RATE_LIMIT_CONFIG.maxDelay);
    
    console.log(`⏱️  等待 ${(delayTime/1000).toFixed(1)} 秒...`);
    await delay(delayTime);
};

// 进度保存和恢复功能
const saveProgress = async (data, filename = 'kol_progress.json') => {
    try {
        const progressPath = path.join(__dirname, '..', filename);
        await fs.writeFile(progressPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 进度已保存`);
    } catch (error) {
        console.warn('⚠️  保存进度失败:', error.message);
    }
};

const loadProgress = async (filename = 'kol_progress.json') => {
    try {
        const progressPath = path.join(__dirname, '..', filename);
        const data = await fs.readFile(progressPath, 'utf8');
        console.log(`📥 已加载之前的进度`);
        return JSON.parse(data);
    } catch (error) {
        console.log(`📋 开始新的数据收集`);
        return null;
    }
};

// 带重试和智能频率控制的API请求函数
async function fetchWithRetry(url, params, retries = RATE_LIMIT_CONFIG.maxRetries) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`📡 请求: ${params.topic_id} - ${params.duration} (尝试 ${i + 1}/${retries})`);
            
            // 1. 获取 challenge
            console.log(`🔄 获取 challenge...`);
            const challengeResponse = await axios.get(CHALLENGE_URL, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
                }
            });
            
            const challengeData = challengeResponse.data;
            console.log(`✅ 获取 challenge 成功: difficulty=${challengeData.difficulty}`);
            
            // 2. 计算 PoW headers
            const powHeaders = getPowHeaders(challengeData.challenge, challengeData.difficulty);
            
            // 3. 发送主请求
            const response = await axios.get(url, {
                params: {
                    ...params,
                    community_tier: 'tier1',
                    customized_community: 'customized',
                    community_yaps: 'true'
                },
                timeout: 20000,
                headers: {
                    ...powHeaders,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            console.log(`✅ 成功: ${params.topic_id} - ${params.duration} (${Array.isArray(response.data) ? response.data.length : (response.data?.data?.length || 0)} 条记录)`);
            
            // 标准化响应格式：如果是数组，包装成 {data: array} 格式
            const standardizedData = Array.isArray(response.data) ? { data: response.data } : response.data;
            return standardizedData;
        } catch (error) {
            const statusCode = error.response?.status;
            console.warn(`❌ 请求失败 (${i + 1}/${retries}): ${error.message} (状态码: ${statusCode || 'N/A'})`);
            
            // 特殊处理不同类型的错误
            if (statusCode === 401) {
                console.warn(`🔐 认证错误 - PoW 可能计算错误或 challenge 过期`);
                if (i === retries - 1) {
                    throw new Error(`认证失败: ${error.message}`);
                }
                await smartDelay(i, 401);
            } else if (statusCode === 429) {
                console.warn(`🚦 频率限制 - 减慢请求速度`);
                if (i === retries - 1) {
                    throw new Error(`频率限制: ${error.message}`);
                }
                await smartDelay(i, 429);
            } else if (statusCode >= 500) {
                console.warn(`🛠️  服务器错误 - 稍后重试`);
                if (i === retries - 1) {
                    throw new Error(`服务器错误: ${error.message}`);
                }
                await smartDelay(i, statusCode);
            } else {
                // 网络错误或其他错误
                if (i === retries - 1) {
                    throw error;
                }
                await smartDelay(i);
            }
        }
    }
}

// 收集单个项目的数据
async function collectProjectData(topicId, category) {
    console.log(`\n🎯 开始收集项目: ${topicId} (${category})`);
    const projectData = {};
    
    let successCount = 0;
    let totalRequests = DURATIONS.length;
    
    for (const duration of DURATIONS) {
        try {
            console.log(`\n📊 处理时间段: ${duration} (${topicId})`);
            
            // 智能延迟，避免频率限制
            await smartDelay(0); // 基础延迟
            
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
                console.warn(`⚠️  意外的API响应结构: ${topicId} - ${duration}`);
                projectData[duration] = [];
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
            successCount++;
            console.log(`✅ ${duration}: 获取到 ${durationData.length} 个KOL`);
            
            // 保存进度（每个成功的请求后）
            await saveProgress({
                currentProject: topicId,
                currentCategory: category,
                completedDurations: successCount,
                totalDurations: totalRequests,
                lastUpdate: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`❌ ${duration} 失败:`, error.message);
            projectData[duration] = [];
            
            // 如果是认证错误，可能需要更长的等待时间
            if (error.message.includes('认证失败')) {
                console.log(`🔐 认证问题，等待更长时间...`);
                await smartDelay(2, 401); // 更长的延迟
            }
        }
    }
    
    console.log(`📋 项目 ${topicId} 完成: ${successCount}/${totalRequests} 成功`);
    return projectData;
}

// 主函数：收集所有数据
async function collectAllData() {
    const startTime = Date.now();
    
    // 尝试加载之前的进度
    const previousProgress = await loadProgress();
    
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
    
    if (previousProgress) {
        console.log(`📥 发现之前的进度: ${previousProgress.currentProject || '未知'}`);
    }

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
            
            // 项目间更长的等待时间，避免过于频繁
            if (i < PRE_TGE_TOPICS.length - 1) {
                console.log(`⏳ 项目间等待 ${RATE_LIMIT_CONFIG.projectDelay}ms...`);
                await smartDelay(0, undefined, RATE_LIMIT_CONFIG.projectDelay);
            }
            
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
            
            // 项目间更长的等待时间，避免过于频繁
            if (i < POST_TGE_TOPICS.length - 1) {
                console.log(`⏳ 项目间等待 ${RATE_LIMIT_CONFIG.projectDelay}ms...`);
                await smartDelay(0, undefined, RATE_LIMIT_CONFIG.projectDelay);
            }
            
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
        // 首先进行环境安全检查
        checkEnvironmentSafety();
        
        console.log('🎯 Kaito KOL 数据收集工具 (开发环境)');
        console.log('================================\n');
        console.log('⚠️  注意: 此脚本仅在开发环境运行');
        console.log('🚫 生产环境已被阻止访问\n');
        
        // 额外确认提示（可选）
        if (!process.argv.includes('--force')) {
            console.log('💡 如需强制运行，请使用: node collectKolData.js --force');
            console.log('⏳ 3秒后自动开始...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const data = await collectAllData();
        await saveDataToFile(data);
        
        console.log('\n🎉 数据收集和保存完成！');
        console.log('📄 现在可以使用本地JSON文件进行快速查询了。');
        console.log('🔒 数据仅保存在本地开发环境');
        
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
