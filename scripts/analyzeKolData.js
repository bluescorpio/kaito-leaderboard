#!/usr/bin/env node

/**
 * KOL.json 数据分析工具
 * 分析文件结构、维度和可进行的数据分析类型
 */

const fs = require('fs');
const path = require('path');

console.log('📊 KOL.json 数据分析工具');
console.log('========================');

function analyzeKolData() {
    try {
        console.log('📖 读取 kol.json 文件...');
        const kolData = JSON.parse(fs.readFileSync('kol.json', 'utf8'));
        
        // 基本文件信息
        console.log('\n🔍 基本文件信息:');
        console.log('================');
        console.log(`📅 最后更新: ${kolData.lastUpdate}`);
        console.log(`📊 总项目数: ${kolData.totalProjects}`);
        console.log(`⏰ 时间维度: ${kolData.totalDurations}`);
        console.log(`📁 文件大小: ${(fs.statSync('kol.json').size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`📝 总行数: ${fs.readFileSync('kol.json', 'utf8').split('\n').length.toLocaleString()}`);
        
        // 项目分类分析
        console.log('\n🏷️ 项目分类分析:');
        console.log('=================');
        const preProjects = Object.keys(kolData.categories.pre_tge);
        const postProjects = Object.keys(kolData.categories.post_tge);
        
        console.log(`📈 PRE_TGE 项目: ${preProjects.length} 个`);
        console.log(`📉 POST_TGE 项目: ${postProjects.length} 个`);
        console.log(`📋 PRE_TGE 样本: ${preProjects.slice(0, 5).join(', ')}...`);
        console.log(`📋 POST_TGE 样本: ${postProjects.slice(0, 5).join(', ')}...`);
        
        // 时间维度分析
        console.log('\n⏰ 时间维度分析:');
        console.log('================');
        const sampleProject = kolData.categories.pre_tge[preProjects[0]];
        const timeIntervals = Object.keys(sampleProject);
        console.log(`🕐 时间区间: ${timeIntervals.join(', ')}`);
        
        // KOL数据字段分析
        console.log('\n👥 KOL数据字段分析:');
        console.log('==================');
        const sampleKol = sampleProject[timeIntervals[0]][0];
        const kolFields = Object.keys(sampleKol);
        
        kolFields.forEach(field => {
            const value = sampleKol[field];
            const type = typeof value;
            const sample = type === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value;
            console.log(`  📋 ${field}: ${type} - 示例: ${sample}`);
        });
        
        // 数据量统计
        console.log('\n📈 数据量统计:');
        console.log('==============');
        let totalKols = 0;
        let projectStats = {};
        
        // 分析每个项目的数据量
        ['pre_tge', 'post_tge'].forEach(category => {
            const projects = kolData.categories[category];
            Object.keys(projects).forEach(projectName => {
                const project = projects[projectName];
                let projectKols = 0;
                timeIntervals.forEach(interval => {
                    if (project[interval]) {
                        projectKols += project[interval].length;
                    }
                });
                projectStats[projectName] = projectKols;
                totalKols += projectKols;
            });
        });
        
        console.log(`👥 总 KOL 数据点: ${totalKols.toLocaleString()}`);
        console.log(`📊 平均每项目: ${Math.round(totalKols / kolData.totalProjects)} 个数据点`);
        
        // 找出数据最多和最少的项目
        const sortedProjects = Object.entries(projectStats).sort((a, b) => b[1] - a[1]);
        console.log(`🏆 数据最多项目: ${sortedProjects[0][0]} (${sortedProjects[0][1]} 个)`);
        console.log(`📉 数据最少项目: ${sortedProjects[sortedProjects.length-1][0]} (${sortedProjects[sortedProjects.length-1][1]} 个)`);
        
        // 数值字段统计
        console.log('\n📊 数值字段统计分析:');
        console.log('===================');
        const numericFields = ['mindshare', 'community_score', 'follower_count', 'smart_follower_count', 'following_count', 'smart_following_count'];
        
        numericFields.forEach(field => {
            const values = [];
            Object.values(kolData.categories.pre_tge).concat(Object.values(kolData.categories.post_tge))
                .forEach(project => {
                    timeIntervals.forEach(interval => {
                        if (project[interval]) {
                            project[interval].forEach(kol => {
                                if (kol[field] !== undefined && kol[field] !== null) {
                                    values.push(Number(kol[field]));
                                }
                            });
                        }
                    });
                });
            
            if (values.length > 0) {
                values.sort((a, b) => a - b);
                const min = values[0];
                const max = values[values.length - 1];
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const median = values[Math.floor(values.length / 2)];
                
                console.log(`  📈 ${field}:`);
                console.log(`     最小值: ${min.toLocaleString()}`);
                console.log(`     最大值: ${max.toLocaleString()}`);
                console.log(`     平均值: ${avg.toFixed(2)}`);
                console.log(`     中位数: ${median.toLocaleString()}`);
                console.log(`     样本数: ${values.length.toLocaleString()}`);
            }
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ 分析过程中发生错误:', error.message);
        return false;
    }
}

// 执行分析
console.log('🚀 开始分析...\n');
const success = analyzeKolData();

if (success) {
    console.log('\n🎉 数据分析完成!');
    console.log('\n📋 可进行的分析维度建议:');
    console.log('========================');
    console.log('1. 🏷️  项目分类对比: PRE_TGE vs POST_TGE 项目特征');
    console.log('2. ⏰  时间趋势分析: 7d, 30d, 3m, 6m, 12m 数据变化');
    console.log('3. 👥  KOL影响力分析: mindshare, community_score 分布');
    console.log('4. 📊  粉丝规模分析: follower_count vs smart_follower_count');
    console.log('5. 🔗  社交网络分析: following patterns 和关注关系');
    console.log('6. 🏆  排名变化分析: 不同时间段的KOL排名波动');
    console.log('7. 📈  增长趋势分析: 各项指标的时间序列变化');
    console.log('8. 🎯  项目热度分析: 不同项目的KOL活跃度对比');
    console.log('9. 🌐  地域分布分析: 基于bio和语言的地理分布');
    console.log('10. 💡 内容特征分析: bio内容的主题和关键词分析');
} else {
    console.log('\n💥 分析失败，请检查错误信息');
}
