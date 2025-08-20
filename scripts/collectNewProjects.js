const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 导入现有的收集函数
const { collectProjectData, saveDataToFile } = require('./collectKolData.js');

// 新增的项目列表
const NEW_PROJECTS = {
    pre_tge: ['MAVRYK', 'MOONBIRDS'],
    post_tge: ['ETH']
};

// 时间范围
const DURATIONS = ['7d', '30d', '3m', '6m', '12m'];

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 加载现有的 kol.json 数据
 */
async function loadExistingData() {
    try {
        const filePath = path.join(__dirname, '..', 'kol.json');
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn('⚠️  无法加载现有数据，将创建新数据:', error.message);
        return {
            lastUpdate: new Date().toISOString(),
            totalProjects: 0,
            totalDurations: DURATIONS.length,
            categories: {
                pre_tge: {},
                post_tge: {}
            }
        };
    }
}

/**
 * 检查项目是否已经存在数据
 */
function hasProjectData(data, projectId, category) {
    return data.categories[category] && 
           data.categories[category][projectId] && 
           Object.keys(data.categories[category][projectId]).length > 0;
}

/**
 * 收集新增项目的数据
 */
async function collectNewProjectsData() {
    console.log('🎯 开始收集新增项目数据...');
    console.log(`📋 新增项目: PRE_TGE (${NEW_PROJECTS.pre_tge.join(', ')}), POST_TGE (${NEW_PROJECTS.post_tge.join(', ')})`);
    
    // 加载现有数据
    const existingData = await loadExistingData();
    console.log(`📁 已加载现有数据: ${existingData.totalProjects || 0} 个项目`);
    
    let newDataCollected = false;
    let totalNewProjects = 0;
    
    // 收集 Pre TGE 新项目
    console.log('\n📋 处理 Pre TGE 新项目...');
    for (const projectId of NEW_PROJECTS.pre_tge) {
        if (hasProjectData(existingData, projectId, 'pre_tge')) {
            console.log(`✅ 项目 ${projectId} 已存在数据，跳过`);
            continue;
        }
        
        console.log(`\n🔄 收集新项目: ${projectId} (Pre TGE)`);
        try {
            const projectData = await collectProjectData(projectId, 'pre_tge');
            existingData.categories.pre_tge[projectId] = projectData;
            
            // 统计收集到的数据
            let dataPoints = 0;
            for (const duration of DURATIONS) {
                if (projectData[duration] && Array.isArray(projectData[duration])) {
                    dataPoints += projectData[duration].length;
                }
            }
            
            console.log(`✅ ${projectId} 收集完成: ${dataPoints} 个数据点`);
            newDataCollected = true;
            totalNewProjects++;
            
            // 项目间延迟
            console.log(`⏳ 等待 15 秒再处理下一个项目...`);
            await delay(15000);
            
        } catch (error) {
            console.error(`❌ 收集 ${projectId} 失败:`, error.message);
        }
    }
    
    // 收集 Post TGE 新项目
    console.log('\n📋 处理 Post TGE 新项目...');
    for (const projectId of NEW_PROJECTS.post_tge) {
        if (hasProjectData(existingData, projectId, 'post_tge')) {
            console.log(`✅ 项目 ${projectId} 已存在数据，跳过`);
            continue;
        }
        
        console.log(`\n🔄 收集新项目: ${projectId} (Post TGE)`);
        try {
            const projectData = await collectProjectData(projectId, 'post_tge');
            existingData.categories.post_tge[projectId] = projectData;
            
            // 统计收集到的数据
            let dataPoints = 0;
            for (const duration of DURATIONS) {
                if (projectData[duration] && Array.isArray(projectData[duration])) {
                    dataPoints += projectData[duration].length;
                }
            }
            
            console.log(`✅ ${projectId} 收集完成: ${dataPoints} 个数据点`);
            newDataCollected = true;
            totalNewProjects++;
            
            // 项目间延迟
            if (NEW_PROJECTS.post_tge.indexOf(projectId) < NEW_PROJECTS.post_tge.length - 1) {
                console.log(`⏳ 等待 15 秒再处理下一个项目...`);
                await delay(15000);
            }
            
        } catch (error) {
            console.error(`❌ 收集 ${projectId} 失败:`, error.message);
        }
    }
    
    if (newDataCollected) {
        // 更新元数据
        existingData.lastUpdate = new Date().toISOString();
        existingData.totalProjects = 
            Object.keys(existingData.categories.pre_tge).length + 
            Object.keys(existingData.categories.post_tge).length;
        
        // 保存更新后的数据
        console.log('\n💾 保存更新后的数据...');
        await saveDataToFile(existingData);
        
        console.log(`\n🎉 新项目数据收集完成！`);
        console.log(`📊 新增项目数: ${totalNewProjects}`);
        console.log(`📁 总项目数: ${existingData.totalProjects}`);
        
        // 创建备份
        const backupPath = path.join(__dirname, '..', `kol_backup_${Date.now()}.json`);
        await fs.writeFile(backupPath, JSON.stringify(existingData, null, 2), 'utf8');
        console.log(`💾 备份已创建: ${path.basename(backupPath)}`);
        
    } else {
        console.log('\n📋 所有新项目数据已存在，无需重新收集');
    }
    
    return existingData;
}

/**
 * 验证新项目数据
 */
async function validateNewProjectsData() {
    console.log('\n🔍 验证新项目数据...');
    
    const data = await loadExistingData();
    const allNewProjects = [...NEW_PROJECTS.pre_tge, ...NEW_PROJECTS.post_tge];
    
    for (const projectId of allNewProjects) {
        const category = NEW_PROJECTS.pre_tge.includes(projectId) ? 'pre_tge' : 'post_tge';
        
        if (hasProjectData(data, projectId, category)) {
            const projectData = data.categories[category][projectId];
            const durations = Object.keys(projectData);
            
            console.log(`✅ ${projectId} (${category.toUpperCase()}): 包含 ${durations.length} 个时间段`);
            
            // 检查每个时间段的数据
            for (const duration of durations) {
                const users = projectData[duration];
                if (Array.isArray(users) && users.length > 0) {
                    console.log(`   📊 ${duration}: ${users.length} 个KOL`);
                } else {
                    console.log(`   ⚠️  ${duration}: 无数据`);
                }
            }
        } else {
            console.log(`❌ ${projectId} (${category.toUpperCase()}): 数据缺失`);
        }
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🎯 新增项目数据收集工具');
        console.log('============================');
        console.log(`📋 目标项目: ${[...NEW_PROJECTS.pre_tge, ...NEW_PROJECTS.post_tge].join(', ')}`);
        console.log('');
        
        // 收集新项目数据
        await collectNewProjectsData();
        
        // 验证数据
        await validateNewProjectsData();
        
        console.log('\n🎉 所有操作完成！');
        
    } catch (error) {
        console.error('❌ 执行失败:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    collectNewProjectsData,
    validateNewProjectsData,
    NEW_PROJECTS
};
