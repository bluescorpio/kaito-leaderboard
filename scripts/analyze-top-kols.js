#!/usr/bin/env node

/**
 * 分析顶级KOL - 参与项目多且排名靠前的KOL
 * 功能：找出那些既参与项目多，又在各项目中排名都很靠前的顶级KOL
 */

const fs = require('fs').promises;
const path = require('path');

// 加载KOL数据
async function loadKolData() {
    try {
        const kolJsonPath = path.join(__dirname, '../kol.json');
        const data = await fs.readFile(kolJsonPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ 加载kol.json失败:', error);
        throw error;
    }
}

// 分析顶级KOL
function analyzeTopKOLs(kolData) {
    const kolStats = new Map();
    
    // 遍历所有项目和时间周期
    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            const projectData = kolData.categories[category][project];
            
            Object.keys(projectData).forEach(timeframe => {
                const kols = projectData[timeframe];
                if (!Array.isArray(kols) || kols.length === 0) return;
                
                kols.forEach((kol, index) => {
                    if (!kol || !kol.username) return;
                    
                    const kolId = kol.username;
                    const rank = index + 1; // 排名从1开始
                    const totalKols = kols.length;
                    
                    if (!kolStats.has(kolId)) {
                        kolStats.set(kolId, {
                            kolId: kolId,
                            name: kol.name || kolId,
                            totalAppearances: 0, // 总出现次数
                            projectsParticipated: new Set(), // 参与的项目
                            rankings: [], // 所有排名
                            topRankings: 0, // 前10名次数
                            top5Rankings: 0, // 前5名次数
                            top3Rankings: 0, // 前3名次数
                            firstPlaceCount: 0, // 第一名次数
                            averageRank: 0,
                            averagePercentileRank: 0, // 平均百分位排名
                            bestRank: Infinity,
                            worstRank: 0,
                            categories: new Set(),
                            timeframes: new Set(),
                            smartFollowersSum: 0,
                            mindshareSum: 0,
                            communityScoreSum: 0,
                            validDataPoints: 0,
                            recentPerformance: [], // 最近表现
                            consistency: 0 // 一致性评分
                        });
                    }
                    
                    const stats = kolStats.get(kolId);
                    stats.totalAppearances++;
                    stats.projectsParticipated.add(project);
                    stats.rankings.push(rank);
                    stats.categories.add(category);
                    stats.timeframes.add(timeframe);
                    
                    // 计算百分位排名 (越小越好，1表示第一名)
                    const percentileRank = rank / totalKols;
                    
                    // 统计优秀排名
                    if (rank <= 10) stats.topRankings++;
                    if (rank <= 5) stats.top5Rankings++;
                    if (rank <= 3) stats.top3Rankings++;
                    if (rank === 1) stats.firstPlaceCount++;
                    
                    // 更新最佳和最差排名
                    stats.bestRank = Math.min(stats.bestRank, rank);
                    stats.worstRank = Math.max(stats.worstRank, rank);
                    
                    // 累计数据用于计算平均值
                    if (kol.smart_follower_count && typeof kol.smart_follower_count === 'number') {
                        stats.smartFollowersSum += kol.smart_follower_count;
                        stats.validDataPoints++;
                    }
                    if (kol.mindshare && typeof kol.mindshare === 'number') {
                        stats.mindshareSum += kol.mindshare;
                    }
                    if (kol.community_score && typeof kol.community_score === 'number') {
                        stats.communityScoreSum += kol.community_score;
                    }
                    
                    // 记录最近表现（假设7d是最新的）
                    if (timeframe === '7d') {
                        stats.recentPerformance.push({
                            project: project,
                            rank: rank,
                            percentile: percentileRank
                        });
                    }
                });
            });
        });
    });
    
    // 计算每个KOL的综合指标
    const kolResults = Array.from(kolStats.values()).map(stats => {
        // 计算平均排名
        stats.averageRank = stats.rankings.length > 0 ? 
            stats.rankings.reduce((sum, rank) => sum + rank, 0) / stats.rankings.length : 0;
        
        // 计算平均百分位排名
        stats.averagePercentileRank = stats.rankings.length > 0 ? 
            stats.rankings.reduce((sum, rank, index, arr) => {
                // 这里需要知道每个排名对应的总数，简化处理
                return sum + rank;
            }, 0) / stats.rankings.length : 0;
        
        // 计算平均指标
        stats.averageSmartFollowers = stats.validDataPoints > 0 ? stats.smartFollowersSum / stats.validDataPoints : 0;
        stats.averageMindshare = stats.totalAppearances > 0 ? stats.mindshareSum / stats.totalAppearances : 0;
        stats.averageCommunityScore = stats.totalAppearances > 0 ? stats.communityScoreSum / stats.totalAppearances : 0;
        
        // 计算一致性（标准差的倒数，排名越稳定越好）
        if (stats.rankings.length > 1) {
            const variance = stats.rankings.reduce((sum, rank) => {
                return sum + Math.pow(rank - stats.averageRank, 2);
            }, 0) / stats.rankings.length;
            stats.consistency = variance > 0 ? 1 / Math.sqrt(variance) : 1;
        } else {
            stats.consistency = 1;
        }
        
        // 计算综合影响力评分
        const projectCount = stats.projectsParticipated.size;
        const topRankingRatio = stats.topRankings / stats.totalAppearances;
        const avgRankScore = Math.max(0, 100 - stats.averageRank); // 排名越靠前分数越高
        const diversityScore = Math.min(projectCount / 10, 1) * 100; // 项目多样性
        const consistencyScore = Math.min(stats.consistency * 10, 100); // 一致性评分
        
        stats.influenceScore = (
            avgRankScore * 0.4 + // 平均排名权重40%
            topRankingRatio * 100 * 0.3 + // 顶级排名比例权重30%
            diversityScore * 0.2 + // 多样性权重20%
            consistencyScore * 0.1 // 一致性权重10%
        );
        
        // 转换Set为数组以便序列化
        stats.projectsParticipatedArray = Array.from(stats.projectsParticipated);
        stats.categoriesArray = Array.from(stats.categories);
        stats.timeframesArray = Array.from(stats.timeframes);
        
        return stats;
    });
    
    return kolResults;
}

// 生成顶级KOL报告
function generateTopKOLReport(kolResults) {
    console.log('\n🏆 ===== 顶级KOL分析报告 =====\n');
    
    // 1. 整体统计
    console.log('📊 整体统计:');
    console.log(`  总KOL数量: ${kolResults.length}`);
    
    const avgProjectCount = kolResults.reduce((sum, kol) => sum + kol.projectsParticipated.size, 0) / kolResults.length;
    const avgAppearances = kolResults.reduce((sum, kol) => sum + kol.totalAppearances, 0) / kolResults.length;
    const avgRank = kolResults.reduce((sum, kol) => sum + kol.averageRank, 0) / kolResults.length;
    
    console.log(`  平均参与项目数: ${avgProjectCount.toFixed(1)}`);
    console.log(`  平均出现次数: ${avgAppearances.toFixed(1)}`);
    console.log(`  平均排名: ${avgRank.toFixed(1)}`);
    console.log('');
    
    // 2. 按参与项目数量排序的顶级KOL
    console.log('🌟 最活跃KOL (按参与项目数):');
    const mostActiveKOLs = kolResults
        .sort((a, b) => b.projectsParticipated.size - a.projectsParticipated.size)
        .slice(0, 15);
    
    mostActiveKOLs.forEach((kol, index) => {
        const emoji = index < 3 ? '🥇🥈🥉'[index] : '🏅';
        console.log(`  ${emoji} ${index + 1}. ${kol.name}`);
        console.log(`     参与项目: ${kol.projectsParticipated.size}个 | 总出现: ${kol.totalAppearances}次`);
        console.log(`     平均排名: ${kol.averageRank.toFixed(1)} | 前10名: ${kol.topRankings}次 (${(kol.topRankings/kol.totalAppearances*100).toFixed(1)}%)`);
        console.log(`     第一名: ${kol.firstPlaceCount}次 | 影响力评分: ${kol.influenceScore.toFixed(1)}`);
        console.log('');
    });
    
    // 3. 按平均排名排序的顶级KOL (排名最靠前的)
    console.log('🎯 排名最靠前的KOL (平均排名<10且参与项目≥5):');
    const topRankedKOLs = kolResults
        .filter(kol => kol.averageRank < 10 && kol.projectsParticipated.size >= 5)
        .sort((a, b) => a.averageRank - b.averageRank)
        .slice(0, 15);
    
    topRankedKOLs.forEach((kol, index) => {
        const emoji = index < 3 ? '🥇🥈🥉'[index] : '⭐';
        console.log(`  ${emoji} ${index + 1}. ${kol.name}`);
        console.log(`     平均排名: ${kol.averageRank.toFixed(1)} | 最佳排名: ${kol.bestRank}`);
        console.log(`     参与项目: ${kol.projectsParticipated.size}个 | 前5名: ${kol.top5Rankings}次`);
        console.log(`     一致性: ${kol.consistency.toFixed(2)} | 影响力评分: ${kol.influenceScore.toFixed(1)}`);
        console.log('');
    });
    
    // 4. 综合影响力评分最高的KOL
    console.log('💎 综合影响力最强的KOL:');
    const topInfluentialKOLs = kolResults
        .filter(kol => kol.projectsParticipated.size >= 3) // 至少参与3个项目
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 20);
    
    topInfluentialKOLs.forEach((kol, index) => {
        const emoji = index < 3 ? '👑💎🌟'[index] : '⚡';
        const topRankRatio = (kol.topRankings / kol.totalAppearances * 100).toFixed(1);
        const firstPlaceRatio = (kol.firstPlaceCount / kol.totalAppearances * 100).toFixed(1);
        
        console.log(`  ${emoji} ${index + 1}. ${kol.name} (影响力: ${kol.influenceScore.toFixed(1)})`);
        console.log(`     项目覆盖: ${kol.projectsParticipated.size}个项目, ${kol.totalAppearances}次出现`);
        console.log(`     排名表现: 平均${kol.averageRank.toFixed(1)}名, 最佳${kol.bestRank}名`);
        console.log(`     优秀率: 前10名${topRankRatio}%, 第1名${firstPlaceRatio}%`);
        console.log(`     数据质量: 粉丝${kol.averageSmartFollowers.toFixed(0)}, 影响力${kol.averageMindshare.toFixed(4)}`);
        console.log('');
    });
    
    // 5. 跨类别表现优秀的KOL
    console.log('🌐 跨类别优秀KOL (PRE_TGE和POST_TGE都表现出色):');
    const crossCategoryKOLs = kolResults
        .filter(kol => kol.categoriesArray.length > 1 && kol.projectsParticipated.size >= 5)
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 10);
    
    crossCategoryKOLs.forEach((kol, index) => {
        console.log(`  🔄 ${index + 1}. ${kol.name}`);
        console.log(`     跨类别: ${kol.categoriesArray.join(', ')}`);
        console.log(`     表现: ${kol.projectsParticipated.size}项目, 平均${kol.averageRank.toFixed(1)}名`);
        console.log(`     影响力评分: ${kol.influenceScore.toFixed(1)}`);
        console.log('');
    });
    
    // 6. 新兴之星 (总出现次数不多但排名很好)
    console.log('⭐ 新兴之星 (出现次数10-30次但平均排名<15):');
    const emergingStars = kolResults
        .filter(kol => kol.totalAppearances >= 10 && kol.totalAppearances <= 30 && kol.averageRank < 15)
        .sort((a, b) => a.averageRank - b.averageRank)
        .slice(0, 10);
    
    emergingStars.forEach((kol, index) => {
        console.log(`  ✨ ${index + 1}. ${kol.name}`);
        console.log(`     出现: ${kol.totalAppearances}次, ${kol.projectsParticipated.size}个项目`);
        console.log(`     平均排名: ${kol.averageRank.toFixed(1)}, 前10名: ${kol.topRankings}次`);
        console.log('');
    });
    
    // 7. 最稳定的KOL (一致性最高)
    console.log('🎲 最稳定表现KOL (一致性最高, 参与≥10次):');
    const mostConsistentKOLs = kolResults
        .filter(kol => kol.totalAppearances >= 10)
        .sort((a, b) => b.consistency - a.consistency)
        .slice(0, 10);
    
    mostConsistentKOLs.forEach((kol, index) => {
        const rankRange = kol.worstRank - kol.bestRank;
        console.log(`  🎯 ${index + 1}. ${kol.name}`);
        console.log(`     一致性: ${kol.consistency.toFixed(3)} | 排名范围: ${kol.bestRank}-${kol.worstRank} (差${rankRange})`);
        console.log(`     平均排名: ${kol.averageRank.toFixed(1)} | 参与: ${kol.totalAppearances}次`);
        console.log('');
    });
    
    // 8. 第一名专业户
    console.log('🏆 第一名专业户 (第一名次数最多):');
    const firstPlaceExperts = kolResults
        .filter(kol => kol.firstPlaceCount > 0)
        .sort((a, b) => b.firstPlaceCount - a.firstPlaceCount)
        .slice(0, 10);
    
    firstPlaceExperts.forEach((kol, index) => {
        const firstPlaceRate = (kol.firstPlaceCount / kol.totalAppearances * 100).toFixed(1);
        console.log(`  🏆 ${index + 1}. ${kol.name}`);
        console.log(`     第一名: ${kol.firstPlaceCount}次 (${firstPlaceRate}%) | 总出现: ${kol.totalAppearances}次`);
        console.log(`     项目数: ${kol.projectsParticipated.size}个 | 平均排名: ${kol.averageRank.toFixed(1)}`);
        console.log('');
    });
}

// 主函数
async function main() {
    console.log('🔍 开始分析顶级KOL...\n');
    
    try {
        // 1. 加载数据
        console.log('📥 加载KOL数据...');
        const kolData = await loadKolData();
        console.log(`✅ 数据加载成功 (更新时间: ${kolData.lastUpdate})`);
        
        // 2. 分析顶级KOL
        console.log('🏆 分析顶级KOL表现...');
        const kolResults = analyzeTopKOLs(kolData);
        console.log(`✅ 分析完成，共分析 ${kolResults.length} 个KOL`);
        
        // 3. 生成报告
        generateTopKOLReport(kolResults);
        
        // 4. 保存详细结果
        const outputPath = path.join(__dirname, '../top-kol-analysis.json');
        await fs.writeFile(outputPath, JSON.stringify({
            analysis_time: new Date().toISOString(),
            total_kols: kolResults.length,
            results: kolResults
        }, null, 2), 'utf8');
        
        console.log(`📄 详细分析结果已保存到: top-kol-analysis.json`);
        console.log('\n🎉 顶级KOL分析完成!');
        
    } catch (error) {
        console.error('\n❌ 分析失败:', error);
        process.exit(1);
    }
}

// 运行分析
if (require.main === module) {
    main();
}

module.exports = {
    analyzeTopKOLs,
    loadKolData
};
