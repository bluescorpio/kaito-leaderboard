#!/usr/bin/env node

/**
 * KOL数据自动更新脚本
 * 功能：定时获取最新KOL数据，更新kol.json文件
 */

const fs = require('fs').promises;
const path = require('path');

// 从config.js读取项目配置
async function loadConfig() {
    try {
        const configPath = path.join(__dirname, '../config.js');
        const configContent = await fs.readFile(configPath, 'utf8');
        
        // 简单解析config.js获取项目列表
        const preTgeMatch = configContent.match(/PRE_TGE:\s*\[([\s\S]*?)\]/);
        const postTgeMatch = configContent.match(/POST_TGE:\s*\[([\s\S]*?)\]/);
        
        const preTgeProjects = preTgeMatch ? preTgeMatch[1].match(/"([^"]+)"/g).map(s => s.slice(1, -1)) : [];
        const postTgeProjects = postTgeMatch ? postTgeMatch[1].match(/"([^"]+)"/g).map(s => s.slice(1, -1)) : [];
        
        return {
            PRE_TGE: preTgeProjects,
            POST_TGE: postTgeProjects
        };
    } catch (error) {
        console.error('❌ 加载config.js失败:', error);
        throw error;
    }
}

// API配置
const API_CONFIG = {
    BASE_URL: 'https://api.kaito.ai',
    ENDPOINTS: {
        LEADERBOARD: '/leaderboard'
    },
    DURATIONS: ['7d', '14d', '30d', '90d', '180d'],
    HEADERS: {
        'Accept': 'application/json',
        'User-Agent': 'KOL-Data-Updater/1.0'
    }
};

// 延迟函数，避免API限制
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 获取单个项目的排行榜数据
async function fetchProjectLeaderboard(projectName, duration, category) {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LEADERBOARD}`;
    const params = new URLSearchParams({
        project: projectName,
        duration: duration,
        category: category
    });

    try {
        console.log(`📊 获取数据: ${projectName} (${duration}) [${category}]`);
        
        const response = await fetch(`${url}?${params}`, {
            headers: API_CONFIG.HEADERS
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 添加延迟避免API限制
        await sleep(200);
        
        return data;
    } catch (error) {
        console.error(`❌ 获取 ${projectName} 数据失败:`, error.message);
        return null;
    }
}

// 批量获取所有项目数据
async function fetchAllProjectsData(config) {
    const kolData = {
        lastUpdate: new Date().toISOString(),
        totalProjects: config.PRE_TGE.length + config.POST_TGE.length,
        totalDurations: API_CONFIG.DURATIONS.length,
        categories: {
            pre_tge: {},
            post_tge: {}
        }
    };

    let totalRequests = 0;
    let successfulRequests = 0;

    // 处理PRE_TGE项目
    console.log('\n🚀 开始更新 PRE_TGE 项目数据...');
    for (const project of config.PRE_TGE) {
        kolData.categories.pre_tge[project] = {};
        
        for (const duration of API_CONFIG.DURATIONS) {
            totalRequests++;
            const data = await fetchProjectLeaderboard(project, duration, 'pre_tge');
            
            if (data) {
                kolData.categories.pre_tge[project][duration] = data;
                successfulRequests++;
            } else {
                kolData.categories.pre_tge[project][duration] = [];
            }
        }
        
        // 每个项目完成后稍作休息
        await sleep(500);
    }

    // 处理POST_TGE项目
    console.log('\n🚀 开始更新 POST_TGE 项目数据...');
    for (const project of config.POST_TGE) {
        kolData.categories.post_tge[project] = {};
        
        for (const duration of API_CONFIG.DURATIONS) {
            totalRequests++;
            const data = await fetchProjectLeaderboard(project, duration, 'post_tge');
            
            if (data) {
                kolData.categories.post_tge[project][duration] = data;
                successfulRequests++;
            } else {
                kolData.categories.post_tge[project][duration] = [];
            }
        }
        
        // 每个项目完成后稍作休息
        await sleep(500);
    }

    console.log(`\n📊 数据获取完成: ${successfulRequests}/${totalRequests} 成功`);
    return kolData;
}

// 保存数据到kol.json
async function saveKolData(kolData) {
    try {
        const kolJsonPath = path.join(__dirname, '../kol.json');
        const jsonContent = JSON.stringify(kolData, null, 2);
        
        await fs.writeFile(kolJsonPath, jsonContent, 'utf8');
        
        // 获取文件大小
        const stats = await fs.stat(kolJsonPath);
        const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ kol.json 更新成功 (${sizeInMB}MB)`);
        return true;
    } catch (error) {
        console.error('❌ 保存kol.json失败:', error);
        return false;
    }
}

// 数据质量检查
function validateKolData(kolData) {
    const issues = [];
    
    // 检查基本结构
    if (!kolData.lastUpdate) issues.push('缺少lastUpdate字段');
    if (!kolData.categories) issues.push('缺少categories字段');
    
    // 检查数据完整性
    const preTgeProjects = Object.keys(kolData.categories.pre_tge || {});
    const postTgeProjects = Object.keys(kolData.categories.post_tge || {});
    
    if (preTgeProjects.length === 0) issues.push('PRE_TGE项目数据为空');
    if (postTgeProjects.length === 0) issues.push('POST_TGE项目数据为空');
    
    // 检查时间段完整性
    for (const project of preTgeProjects) {
        const durations = Object.keys(kolData.categories.pre_tge[project]);
        if (durations.length !== API_CONFIG.DURATIONS.length) {
            issues.push(`${project} 时间段数据不完整 (${durations.length}/${API_CONFIG.DURATIONS.length})`);
        }
    }
    
    return {
        isValid: issues.length === 0,
        issues: issues,
        summary: {
            preTgeProjects: preTgeProjects.length,
            postTgeProjects: postTgeProjects.length,
            totalProjects: preTgeProjects.length + postTgeProjects.length
        }
    };
}

// 主函数
async function main() {
    const startTime = new Date();
    console.log(`🤖 开始自动更新KOL数据 - ${startTime.toLocaleString('zh-CN')}`);
    
    try {
        // 1. 加载配置
        console.log('📋 加载项目配置...');
        const config = await loadConfig();
        console.log(`✅ 配置加载成功: PRE_TGE(${config.PRE_TGE.length}) + POST_TGE(${config.POST_TGE.length})`);
        
        // 2. 获取所有数据
        console.log('\n📡 开始获取API数据...');
        const kolData = await fetchAllProjectsData(config);
        
        // 3. 数据质量检查
        console.log('\n🔍 进行数据质量检查...');
        const validation = validateKolData(kolData);
        
        if (!validation.isValid) {
            console.error('❌ 数据质量检查失败:');
            validation.issues.forEach(issue => console.error(`  - ${issue}`));
            process.exit(1);
        }
        
        console.log('✅ 数据质量检查通过');
        console.log(`📊 数据统计: ${validation.summary.totalProjects}个项目, ${API_CONFIG.DURATIONS.length}个时间段`);
        
        // 4. 保存数据
        console.log('\n💾 保存数据到 kol.json...');
        const saveSuccess = await saveKolData(kolData);
        
        if (!saveSuccess) {
            console.error('❌ 保存失败');
            process.exit(1);
        }
        
        // 5. 完成报告
        const endTime = new Date();
        const duration = Math.round((endTime - startTime) / 1000);
        
        console.log('\n🎉 自动更新完成!');
        console.log(`⏱️  总耗时: ${duration}秒`);
        console.log(`📅 更新时间: ${endTime.toLocaleString('zh-CN')}`);
        console.log(`📊 数据范围: ${validation.summary.totalProjects}个项目 × ${API_CONFIG.DURATIONS.length}个时间段`);
        
    } catch (error) {
        console.error('\n❌ 自动更新失败:', error);
        process.exit(1);
    }
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { main, fetchAllProjectsData, loadConfig };
