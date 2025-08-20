const fs = require('fs').promises;
const path = require('path');

// 新增的项目列表
const NEW_PROJECTS = {
    pre_tge: ['MAVRYK', 'MOONBIRDS'], 
    post_tge: ['ETH']
};

/**
 * 检查 kol.json 中是否包含新项目数据
 */
async function checkNewProjectsInKolJson() {
    try {
        console.log('🔍 检查 kol.json 中的新项目数据...\n');
        
        // 读取 kol.json
        const kolJsonPath = path.join(__dirname, '..', 'kol.json');
        const data = await fs.readFile(kolJsonPath, 'utf8');
        const kolData = JSON.parse(data);
        
        console.log(`📁 kol.json 基本信息:`);
        console.log(`   - 最后更新: ${kolData.lastUpdate}`);
        console.log(`   - 总项目数: ${kolData.totalProjects}`);
        console.log(`   - 时间维度: ${kolData.totalDurations}\n`);
        
        const allNewProjects = [...NEW_PROJECTS.pre_tge, ...NEW_PROJECTS.post_tge];
        let foundProjects = 0;
        let missingProjects = [];
        
        // 检查每个新项目
        for (const projectId of allNewProjects) {
            const category = NEW_PROJECTS.pre_tge.includes(projectId) ? 'pre_tge' : 'post_tge';
            const categoryData = kolData.categories[category];
            
            console.log(`🔍 检查项目: ${projectId} (${category.toUpperCase()})`);
            
            if (categoryData && categoryData[projectId]) {
                const projectData = categoryData[projectId];
                const durations = Object.keys(projectData);
                
                console.log(`   ✅ 找到数据 - 包含 ${durations.length} 个时间段`);
                
                // 统计每个时间段的数据量
                for (const duration of durations) {
                    const users = projectData[duration];
                    if (Array.isArray(users)) {
                        console.log(`      📊 ${duration}: ${users.length} 个KOL`);
                        
                        // 显示前几个KOL作为样本
                        if (users.length > 0) {
                            const sampleUsers = users.slice(0, 3).map(u => u.name || u.username).join(', ');
                            console.log(`         样本: ${sampleUsers}${users.length > 3 ? '...' : ''}`);
                        }
                    } else {
                        console.log(`      ⚠️  ${duration}: 数据格式异常`);
                    }
                }
                foundProjects++;
            } else {
                console.log(`   ❌ 未找到数据`);
                missingProjects.push(`${projectId} (${category})`);
            }
            console.log('');
        }
        
        // 总结
        console.log('📊 检查结果总结:');
        console.log(`   ✅ 已有数据: ${foundProjects}/${allNewProjects.length} 个项目`);
        
        if (missingProjects.length > 0) {
            console.log(`   ❌ 缺失数据: ${missingProjects.join(', ')}`);
            console.log('\n💡 建议操作:');
            console.log('   运行: node scripts/collectNewProjects.js');
            console.log('   或者: node scripts/collectKolData.js');
        } else {
            console.log('   🎉 所有新项目数据都已存在！');
        }
        
        // 额外统计：显示所有项目列表
        console.log('\n📋 当前 kol.json 包含的所有项目:');
        console.log(`Pre TGE (${Object.keys(kolData.categories.pre_tge).length}): ${Object.keys(kolData.categories.pre_tge).join(', ')}`);
        console.log(`Post TGE (${Object.keys(kolData.categories.post_tge).length}): ${Object.keys(kolData.categories.post_tge).join(', ')}`);
        
        return {
            total: allNewProjects.length,
            found: foundProjects,
            missing: missingProjects,
            hasAllData: missingProjects.length === 0
        };
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        return null;
    }
}

/**
 * 比较 config.js 和 kol.json 中的项目列表
 */
async function compareConfigWithKolJson() {
    try {
        console.log('\n🔄 比较 config.js 和 kol.json 项目列表...\n');
        
        // 读取 config.js
        const CONFIG = require('../config.js');
        const configProjects = {
            pre_tge: CONFIG.PRE_TGE_PROJECTS,
            post_tge: CONFIG.POST_TGE_PROJECTS
        };
        
        // 读取 kol.json
        const kolJsonPath = path.join(__dirname, '..', 'kol.json');
        const data = await fs.readFile(kolJsonPath, 'utf8');
        const kolData = JSON.parse(data);
        const kolProjects = {
            pre_tge: Object.keys(kolData.categories.pre_tge || {}),
            post_tge: Object.keys(kolData.categories.post_tge || {})
        };
        
        console.log('📋 项目列表比较:');
        
        for (const category of ['pre_tge', 'post_tge']) {
            console.log(`\n${category.toUpperCase()}:`);
            console.log(`   Config.js: ${configProjects[category].length} 个项目`);
            console.log(`   Kol.json:  ${kolProjects[category].length} 个项目`);
            
            // 找出config中有但kol.json中没有的项目
            const missingInKol = configProjects[category].filter(p => !kolProjects[category].includes(p));
            if (missingInKol.length > 0) {
                console.log(`   ❌ kol.json中缺失: ${missingInKol.join(', ')}`);
            }
            
            // 找出kol.json中有但config中没有的项目
            const extraInKol = kolProjects[category].filter(p => !configProjects[category].includes(p));
            if (extraInKol.length > 0) {
                console.log(`   ⚠️  kol.json中多余: ${extraInKol.join(', ')}`);
            }
            
            if (missingInKol.length === 0 && extraInKol.length === 0) {
                console.log(`   ✅ 完全匹配`);
            }
        }
        
        return {
            configProjects,
            kolProjects,
            isSync: configProjects.pre_tge.every(p => kolProjects.pre_tge.includes(p)) &&
                    configProjects.post_tge.every(p => kolProjects.post_tge.includes(p))
        };
        
    } catch (error) {
        console.error('❌ 比较失败:', error.message);
        return null;
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🎯 新项目数据检查工具');
    console.log('=======================');
    
    // 检查新项目
    const checkResult = await checkNewProjectsInKolJson();
    
    if (checkResult) {
        // 比较配置
        await compareConfigWithKolJson();
        
        // 给出建议
        if (!checkResult.hasAllData) {
            console.log('\n🚀 下一步操作建议:');
            console.log('1. 运行收集脚本: node scripts/collectNewProjects.js');
            console.log('2. 或运行完整收集: node scripts/collectKolData.js');
        } else {
            console.log('\n✅ 所有数据完整，无需额外操作！');
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    checkNewProjectsInKolJson,
    compareConfigWithKolJson,
    NEW_PROJECTS
};
