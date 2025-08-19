#!/usr/bin/env node

/**
 * KOL数据深度分析脚本
 * 功能：从kol.json中挖掘有趣的洞察和发现
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

// 分析KOL影响力分布
function analyzeInfluenceDistribution(kolData) {
    const insights = {
        categories: {},
        projects: {},
        timeframes: {},
        top_performers: [],
        cross_project_leaders: [],
        emerging_talents: []
    };

    // 统计各类别数据
    Object.keys(kolData.categories).forEach(category => {
        const projects = Object.keys(kolData.categories[category]);
        insights.categories[category] = {
            project_count: projects.length,
            projects: projects
        };
    });

    // 分析每个项目的数据
    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            const projectData = kolData.categories[category][project];
            
            insights.projects[project] = {
                category: category,
                timeframes: {},
                total_unique_kols: new Set(),
                avg_mindshare: 0,
                avg_community_score: 0
            };

            let totalMindshare = 0;
            let totalCommunityScore = 0;
            let totalEntries = 0;

            Object.keys(projectData).forEach(timeframe => {
                const kols = projectData[timeframe];
                if (Array.isArray(kols)) {
                    insights.projects[project].timeframes[timeframe] = kols.length;
                    
                    kols.forEach(kol => {
                        insights.projects[project].total_unique_kols.add(kol.username);
                        totalMindshare += kol.mindshare || 0;
                        totalCommunityScore += kol.community_score || 0;
                        totalEntries++;
                    });
                }
            });

            insights.projects[project].total_unique_kols = insights.projects[project].total_unique_kols.size;
            insights.projects[project].avg_mindshare = totalEntries > 0 ? totalMindshare / totalEntries : 0;
            insights.projects[project].avg_community_score = totalEntries > 0 ? totalCommunityScore / totalEntries : 0;
        });
    });

    return insights;
}

// 分析顶级KOL表现
function analyzeTopPerformers(kolData) {
    const kolPerformance = new Map();

    // 收集所有KOL的表现数据
    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            const projectData = kolData.categories[category][project];
            
            Object.keys(projectData).forEach(timeframe => {
                const kols = projectData[timeframe];
                if (Array.isArray(kols)) {
                    kols.forEach(kol => {
                        const key = kol.username;
                        
                        if (!kolPerformance.has(key)) {
                            kolPerformance.set(key, {
                                name: kol.name,
                                username: kol.username,
                                follower_count: kol.follower_count || 0,
                                smart_follower_count: kol.smart_follower_count || 0,
                                bio: kol.bio || '',
                                icon: kol.icon || '',
                                twitter_user_url: kol.twitter_user_url || '',
                                projects: new Set(),
                                categories: new Set(),
                                rankings: [],
                                total_appearances: 0,
                                top_10_count: 0,
                                top_1_count: 0,
                                best_rank: Infinity,
                                worst_rank: 0,
                                max_mindshare: 0,
                                total_mindshare: 0,
                                avg_community_score: 0,
                                timeframes: new Set()
                            });
                        }

                        const performance = kolPerformance.get(key);
                        performance.projects.add(project);
                        performance.categories.add(category);
                        performance.timeframes.add(timeframe);
                        performance.total_appearances++;
                        
                        const rank = parseInt(kol.rank) || 999;
                        const mindshare = kol.mindshare || 0;
                        const communityScore = kol.community_score || 0;
                        
                        performance.rankings.push({
                            project, category, timeframe, rank, mindshare, communityScore
                        });
                        
                        if (rank <= 10) performance.top_10_count++;
                        if (rank === 1) performance.top_1_count++;
                        
                        performance.best_rank = Math.min(performance.best_rank, rank);
                        performance.worst_rank = Math.max(performance.worst_rank, rank);
                        performance.max_mindshare = Math.max(performance.max_mindshare, mindshare);
                        performance.total_mindshare += mindshare;
                    });
                }
            });
        });
    });

    // 转换为数组并计算额外指标
    const performers = Array.from(kolPerformance.values()).map(kol => ({
        ...kol,
        projects: Array.from(kol.projects),
        categories: Array.from(kol.categories),
        timeframes: Array.from(kol.timeframes),
        project_count: kol.projects.size,
        category_count: kol.categories.size,
        timeframe_count: kol.timeframes.size,
        avg_mindshare: kol.total_mindshare / kol.total_appearances,
        avg_community_score: kol.rankings.reduce((sum, r) => sum + r.communityScore, 0) / kol.rankings.length,
        consistency_score: kol.top_10_count / kol.total_appearances, // 进入前10的比例
        influence_score: (kol.follower_count / 1000) + (kol.smart_follower_count * 10) + (kol.max_mindshare * 1000)
    }));

    return performers;
}

// 寻找跨项目领袖
function findCrossProjectLeaders(performers) {
    return performers
        .filter(kol => kol.project_count >= 5) // 至少参与5个项目
        .sort((a, b) => {
            // 综合排序：项目数 × 一致性 × 影响力
            const scoreA = a.project_count * a.consistency_score * Math.log(a.influence_score + 1);
            const scoreB = b.project_count * b.consistency_score * Math.log(b.influence_score + 1);
            return scoreB - scoreA;
        })
        .slice(0, 20);
}

// 寻找新兴人才
function findEmergingTalents(performers) {
    return performers
        .filter(kol => kol.follower_count < 100000 && kol.top_10_count >= 3) // 粉丝少但排名好
        .sort((a, b) => {
            // 潜力得分：排名表现 / 粉丝数
            const potentialA = (a.top_10_count * 100) / Math.log(a.follower_count + 1000);
            const potentialB = (b.top_10_count * 100) / Math.log(b.follower_count + 1000);
            return potentialB - potentialA;
        })
        .slice(0, 15);
}

// 分析项目竞争激烈程度和详细统计
function analyzeProjectCompetition(kolData) {
    const competition = {};

    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            const projectData = kolData.categories[category][project];
            
            let totalKols = 0;
            let uniqueKols = new Set();
            let mindshareSum = 0;
            let mindshareValues = [];
            let smartFollowerSum = 0;
            let followerSum = 0;
            let communityScoreSum = 0;
            let entryCount = 0;
            let kolDetails = new Map(); // 存储每个KOL的详细信息
            
            Object.keys(projectData).forEach(timeframe => {
                const kols = projectData[timeframe];
                if (Array.isArray(kols)) {
                    totalKols += kols.length;
                    kols.forEach(kol => {
                        const username = kol.username;
                        uniqueKols.add(username);
                        
                        // 如果是该KOL在此项目的首次记录，添加到详细信息
                        if (!kolDetails.has(username)) {
                            kolDetails.set(username, {
                                name: kol.name,
                                username: kol.username,
                                follower_count: kol.follower_count || 0,
                                smart_follower_count: kol.smart_follower_count || 0,
                                max_mindshare: kol.mindshare || 0,
                                max_community_score: kol.community_score || 0,
                                appearances: 1
                            });
                        } else {
                            // 更新最大值
                            const existing = kolDetails.get(username);
                            existing.max_mindshare = Math.max(existing.max_mindshare, kol.mindshare || 0);
                            existing.max_community_score = Math.max(existing.max_community_score, kol.community_score || 0);
                            existing.appearances++;
                        }
                        
                        mindshareSum += kol.mindshare || 0;
                        mindshareValues.push(kol.mindshare || 0);
                        entryCount++;
                    });
                }
            });
            
            // 基于唯一KOL计算平均值
            const uniqueKolArray = Array.from(kolDetails.values());
            const avgSmartFollower = uniqueKolArray.length > 0 ? 
                uniqueKolArray.reduce((sum, kol) => sum + kol.smart_follower_count, 0) / uniqueKolArray.length : 0;
            const avgFollower = uniqueKolArray.length > 0 ? 
                uniqueKolArray.reduce((sum, kol) => sum + kol.follower_count, 0) / uniqueKolArray.length : 0;
            const avgMaxMindshare = uniqueKolArray.length > 0 ? 
                uniqueKolArray.reduce((sum, kol) => sum + kol.max_mindshare, 0) / uniqueKolArray.length : 0;
            const avgMaxCommunityScore = uniqueKolArray.length > 0 ? 
                uniqueKolArray.reduce((sum, kol) => sum + kol.max_community_score, 0) / uniqueKolArray.length : 0;
            
            // 计算中位数和其他统计值
            const sortedMindshare = mindshareValues.sort((a, b) => a - b);
            const medianMindshare = sortedMindshare.length > 0 ? 
                (sortedMindshare.length % 2 === 0 ? 
                    (sortedMindshare[sortedMindshare.length/2 - 1] + sortedMindshare[sortedMindshare.length/2]) / 2 :
                    sortedMindshare[Math.floor(sortedMindshare.length/2)]) : 0;
            
            const maxMindshare = mindshareValues.length > 0 ? Math.max(...mindshareValues) : 0;
            const minMindshare = mindshareValues.length > 0 ? Math.min(...mindshareValues) : 0;
            
            // 计算智能粉丝比例统计
            const smartRatios = uniqueKolArray
                .filter(kol => kol.follower_count > 0)
                .map(kol => kol.smart_follower_count / kol.follower_count);
            const avgSmartRatio = smartRatios.length > 0 ? 
                smartRatios.reduce((sum, ratio) => sum + ratio, 0) / smartRatios.length : 0;
            
            competition[project] = {
                category,
                total_entries: totalKols,
                unique_kols: uniqueKols.size,
                avg_mindshare: entryCount > 0 ? mindshareSum / entryCount : 0,
                avg_max_mindshare: avgMaxMindshare,
                median_mindshare: medianMindshare,
                max_mindshare: maxMindshare,
                min_mindshare: minMindshare,
                avg_smart_follower: avgSmartFollower,
                avg_follower: avgFollower,
                avg_smart_ratio: avgSmartRatio,
                avg_max_community_score: avgMaxCommunityScore,
                competition_intensity: (entryCount > 0 ? mindshareSum / entryCount : 0) * uniqueKols.size,
                timeframe_coverage: Object.keys(projectData).length,
                kol_details: uniqueKolArray // 保存KOL详细信息用于进一步分析
            };
        });
    });

    return competition;
}

// 寻找影响力分布异常
function findInfluenceAnomalies(performers) {
    const anomalies = {
        high_mindshare_low_followers: [],
        high_followers_low_performance: [],
        smart_follower_champions: []
    };

    performers.forEach(kol => {
        // 高影响力但粉丝少（内容质量高）
        if (kol.max_mindshare > 0.01 && kol.follower_count < 50000) {
            anomalies.high_mindshare_low_followers.push({
                ...kol,
                efficiency_ratio: kol.max_mindshare / (kol.follower_count / 1000)
            });
        }

        // 高粉丝但表现一般（可能买粉或内容质量低）
        if (kol.follower_count > 500000 && kol.best_rank > 20) {
            anomalies.high_followers_low_performance.push({
                ...kol,
                underperformance_ratio: kol.follower_count / (101 - kol.best_rank) // 越大越异常
            });
        }

        // 智能粉丝比例很高（高质量受众）
        if (kol.follower_count > 10000 && kol.smart_follower_count > 0) {
            const smartRatio = kol.smart_follower_count / kol.follower_count;
            if (smartRatio > 0.05) { // 5%以上是智能粉丝
                anomalies.smart_follower_champions.push({
                    ...kol,
                    smart_ratio: smartRatio
                });
            }
        }
    });

    // 排序
    anomalies.high_mindshare_low_followers.sort((a, b) => b.efficiency_ratio - a.efficiency_ratio);
    anomalies.high_followers_low_performance.sort((a, b) => b.underperformance_ratio - a.underperformance_ratio);
    anomalies.smart_follower_champions.sort((a, b) => b.smart_ratio - a.smart_ratio);

    return anomalies;
}

// 生成分析报告
function generateAnalysisReport(insights, performers, crossProjectLeaders, emergingTalents, competition, anomalies) {
    console.log('\n🔍 ===== KOL数据深度分析报告 =====\n');

    // 1. 基础统计
    console.log('📊 基础数据统计:');
    console.log(`  PRE_TGE项目: ${insights.categories.pre_tge?.project_count || 0}个`);
    console.log(`  POST_TGE项目: ${insights.categories.post_tge?.project_count || 0}个`);
    console.log(`  总KOL数: ${performers.length.toLocaleString()}个`);
    console.log('');

    // 2. 项目参与人数分析
    console.log('👥 项目参与人数分析:');
    const sortedByUniqueKols = Object.entries(competition)
        .sort(([,a], [,b]) => b.unique_kols - a.unique_kols);
    
    console.log('  🔥 参与人数最多的项目 (Top 5):');
    sortedByUniqueKols.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project} (${data.category.toUpperCase()}): ${data.unique_kols}人`);
    });
    
    console.log('  🪶 参与人数最少的项目 (Bottom 5):');
    sortedByUniqueKols.slice(-5).reverse().forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project} (${data.category.toUpperCase()}): ${data.unique_kols}人`);
    });
    console.log('');

    // 3. 智能粉丝分析
    console.log('🧠 智能粉丝分析:');
    const sortedBySmartFollower = Object.entries(competition)
        .sort(([,a], [,b]) => b.avg_smart_follower - a.avg_smart_follower);
    
    console.log('  ⭐ 平均智能粉丝最多的项目 (Top 5):');
    sortedBySmartFollower.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${Math.round(data.avg_smart_follower)} 智能粉丝/人`);
        console.log(`       (智能粉丝比例: ${(data.avg_smart_ratio * 100).toFixed(2)}%)`);
    });
    
    console.log('  💤 平均智能粉丝最少的项目 (Bottom 5):');
    sortedBySmartFollower.slice(-5).reverse().forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${Math.round(data.avg_smart_follower)} 智能粉丝/人`);
        console.log(`       (智能粉丝比例: ${(data.avg_smart_ratio * 100).toFixed(2)}%)`);
    });
    console.log('');

    // 4. 影响力(Mindshare)分析
    console.log('🎯 影响力(Mindshare)分析:');
    const sortedByMaxMindshare = Object.entries(competition)
        .sort(([,a], [,b]) => b.max_mindshare - a.max_mindshare);
    const sortedByAvgMindshare = Object.entries(competition)
        .sort(([,a], [,b]) => b.avg_max_mindshare - a.avg_max_mindshare);
    
    console.log('  🚀 最高影响力记录 (Top 5):');
    sortedByMaxMindshare.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${data.max_mindshare.toFixed(4)} (单个KOL最高记录)`);
    });
    
    console.log('  🌟 平均最高影响力 (Top 5):');
    sortedByAvgMindshare.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${data.avg_max_mindshare.toFixed(4)} (KOL平均最高值)`);
    });
    
    console.log('  😴 平均影响力最低 (Bottom 5):');
    sortedByAvgMindshare.slice(-5).reverse().forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${data.avg_max_mindshare.toFixed(4)}`);
    });
    console.log('');

    // 5. 粉丝规模分析
    console.log('📈 粉丝规模分析:');
    const sortedByAvgFollower = Object.entries(competition)
        .sort(([,a], [,b]) => b.avg_follower - a.avg_follower);
    
    console.log('  🔥 平均粉丝数最多的项目 (Top 5):');
    sortedByAvgFollower.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${Math.round(data.avg_follower).toLocaleString()} 粉丝/人`);
    });
    
    console.log('  🌱 平均粉丝数最少的项目 (Bottom 5):');
    sortedByAvgFollower.slice(-5).reverse().forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${Math.round(data.avg_follower).toLocaleString()} 粉丝/人`);
    });
    console.log('');

    // 6. 社区评分分析
    console.log('⭐ 社区评分分析:');
    const sortedByCommunityScore = Object.entries(competition)
        .sort(([,a], [,b]) => b.avg_max_community_score - a.avg_max_community_score);
    
    console.log('  🏆 平均社区评分最高 (Top 5):');
    sortedByCommunityScore.slice(0, 5).forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${data.avg_max_community_score.toFixed(1)} 分`);
    });
    
    console.log('  📉 平均社区评分最低 (Bottom 5):');
    sortedByCommunityScore.slice(-5).reverse().forEach(([project, data], index) => {
        console.log(`    ${index + 1}. ${project}: ${data.avg_max_community_score.toFixed(1)} 分`);
    });
    console.log('');

    // 7. 项目竞争分析
    console.log('🏆 项目竞争激烈度排行 (Top 10):');
    const sortedProjects = Object.entries(competition)
        .sort(([,a], [,b]) => b.competition_intensity - a.competition_intensity)
        .slice(0, 10);
    
    sortedProjects.forEach(([project, data], index) => {
        console.log(`  ${index + 1}. ${project} (${data.category.toUpperCase()})`);
        console.log(`     竞争度: ${data.competition_intensity.toFixed(2)} | 独特KOL: ${data.unique_kols} | 平均影响力: ${data.avg_mindshare.toFixed(4)}`);
    });
    console.log('');

    // 8. 跨项目领袖
    console.log('🌟 跨项目影响力领袖 (Top 10):');
    crossProjectLeaders.slice(0, 10).forEach((kol, index) => {
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     参与项目: ${kol.project_count} | 粉丝: ${kol.follower_count.toLocaleString()} | 前10率: ${(kol.consistency_score * 100).toFixed(1)}%`);
        console.log(`     最佳排名: #${kol.best_rank} | 最高影响力: ${kol.max_mindshare.toFixed(4)}`);
    });
    console.log('');

    // 9. 新兴人才
    console.log('🚀 新兴潜力人才 (Top 8):');
    emergingTalents.slice(0, 8).forEach((kol, index) => {
        const potential = (kol.top_10_count * 100) / Math.log(kol.follower_count + 1000);
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     粉丝: ${kol.follower_count.toLocaleString()} | 前10次数: ${kol.top_10_count} | 潜力指数: ${potential.toFixed(2)}`);
        console.log(`     参与项目: ${kol.project_count} | 最佳排名: #${kol.best_rank}`);
    });
    console.log('');

    // 10. 影响力异常分析
    console.log('🔥 内容质量之王 (高影响力低粉丝):');
    anomalies.high_mindshare_low_followers.slice(0, 5).forEach((kol, index) => {
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     粉丝: ${kol.follower_count.toLocaleString()} | 最高影响力: ${kol.max_mindshare.toFixed(4)} | 效率比: ${kol.efficiency_ratio.toFixed(6)}`);
    });
    console.log('');

    console.log('🤔 疑似买粉账号 (高粉丝低表现):');
    anomalies.high_followers_low_performance.slice(0, 5).forEach((kol, index) => {
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     粉丝: ${kol.follower_count.toLocaleString()} | 最佳排名: #${kol.best_rank} | 异常指数: ${kol.underperformance_ratio.toFixed(0)}`);
    });
    console.log('');

    console.log('🧠 智能粉丝冠军 (高质量受众):');
    anomalies.smart_follower_champions.slice(0, 5).forEach((kol, index) => {
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     智能粉丝: ${kol.smart_follower_count.toLocaleString()} | 总粉丝: ${kol.follower_count.toLocaleString()} | 质量比: ${(kol.smart_ratio * 100).toFixed(2)}%`);
    });
    console.log('');

    // 11. 关键发现总结
    console.log('💡 关键发现:');
    
    const mostCompetitive = sortedProjects[0];
    const mostParticipated = sortedByUniqueKols[0];
    const leastParticipated = sortedByUniqueKols[sortedByUniqueKols.length - 1];
    const smartestAudience = sortedBySmartFollower[0];
    const highestInfluence = sortedByMaxMindshare[0];
    const topInfluencer = crossProjectLeaders[0];
    const topPotential = emergingTalents[0];
    
    console.log(`  🏆 最激烈项目: ${mostCompetitive[0]} (竞争度: ${mostCompetitive[1].competition_intensity.toFixed(2)})`);
    console.log(`  👥 参与人数最多: ${mostParticipated[0]} (${mostParticipated[1].unique_kols}人)`);
    console.log(`  🪶 参与人数最少: ${leastParticipated[0]} (${leastParticipated[1].unique_kols}人)`);
    console.log(`  🧠 智能受众最高: ${smartestAudience[0]} (平均${Math.round(smartestAudience[1].avg_smart_follower)}智能粉丝)`);
    console.log(`  🚀 影响力之王: ${highestInfluence[0]} (最高${highestInfluence[1].max_mindshare.toFixed(4)})`);
    console.log(`  👑 最强跨项目KOL: ${topInfluencer.name} (参与${topInfluencer.project_count}个项目)`);
    
    if (topPotential) {
        console.log(`  🌟 最强潜力股: ${topPotential.name} (${topPotential.follower_count.toLocaleString()}粉丝，${topPotential.top_10_count}次前10)`);
    }
    
    const avgProjectsPerKol = performers.reduce((sum, kol) => sum + kol.project_count, 0) / performers.length;
    console.log(`  📊 平均每个KOL参与项目数: ${avgProjectsPerKol.toFixed(2)}个`);
    
    const multiProjectKols = performers.filter(kol => kol.project_count > 1).length;
    console.log(`  🔄 跨项目活跃KOL比例: ${((multiProjectKols / performers.length) * 100).toFixed(1)}%`);
    
    // 新增统计洞察
    const avgUniqueKols = Object.values(competition).reduce((sum, proj) => sum + proj.unique_kols, 0) / Object.keys(competition).length;
    const avgSmartFollowerGlobal = Object.values(competition).reduce((sum, proj) => sum + proj.avg_smart_follower, 0) / Object.keys(competition).length;
    const avgInfluenceGlobal = Object.values(competition).reduce((sum, proj) => sum + proj.avg_max_mindshare, 0) / Object.keys(competition).length;
    
    console.log(`  📈 项目平均参与人数: ${avgUniqueKols.toFixed(1)}人`);
    console.log(`  🧠 全局平均智能粉丝: ${Math.round(avgSmartFollowerGlobal)}个/人`);
    console.log(`  🎯 全局平均影响力: ${avgInfluenceGlobal.toFixed(4)}`);
    
    console.log('');
}

// 保存详细分析结果
async function saveAnalysisResults(insights, performers, crossProjectLeaders, emergingTalents, competition, anomalies) {
    const analysisData = {
        generated_at: new Date().toISOString(),
        summary: {
            total_kols: performers.length,
            total_projects: Object.keys(competition).length,
            avg_projects_per_kol: performers.reduce((sum, kol) => sum + kol.project_count, 0) / performers.length,
            multi_project_kol_percentage: (performers.filter(kol => kol.project_count > 1).length / performers.length) * 100
        },
        insights,
        top_performers: performers.sort((a, b) => b.influence_score - a.influence_score).slice(0, 50),
        cross_project_leaders: crossProjectLeaders,
        emerging_talents: emergingTalents,
        project_competition: competition,
        anomalies
    };

    const outputPath = path.join(__dirname, '../kol-analysis-results.json');
    await fs.writeFile(outputPath, JSON.stringify(analysisData, null, 2), 'utf8');
    
    console.log(`📄 详细分析结果已保存到: kol-analysis-results.json`);
    
    return outputPath;
}

// 主函数
async function main() {
    console.log('🔍 开始深度分析KOL数据...\n');
    
    try {
        // 1. 加载数据
        console.log('📥 加载KOL数据...');
        const kolData = await loadKolData();
        console.log(`✅ 数据加载成功 (更新时间: ${kolData.lastUpdate})`);
        
        // 2. 基础分析
        console.log('\n📊 进行基础统计分析...');
        const insights = analyzeInfluenceDistribution(kolData);
        
        // 3. 深度分析KOL表现
        console.log('🎯 分析KOL表现...');
        const performers = analyzeTopPerformers(kolData);
        
        // 4. 寻找跨项目领袖
        console.log('🌟 识别跨项目领袖...');
        const crossProjectLeaders = findCrossProjectLeaders(performers);
        
        // 5. 寻找新兴人才
        console.log('🚀 发现新兴人才...');
        const emergingTalents = findEmergingTalents(performers);
        
        // 6. 分析项目竞争
        console.log('🏆 分析项目竞争态势...');
        const competition = analyzeProjectCompetition(kolData);
        
        // 7. 寻找异常现象
        console.log('🔍 识别影响力异常...');
        const anomalies = findInfluenceAnomalies(performers);
        
        // 8. 生成报告
        generateAnalysisReport(insights, performers, crossProjectLeaders, emergingTalents, competition, anomalies);
        
        // 9. 保存结果
        await saveAnalysisResults(insights, performers, crossProjectLeaders, emergingTalents, competition, anomalies);
        
        console.log('\n🎉 KOL数据分析完成!');
        
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
    analyzeInfluenceDistribution,
    analyzeTopPerformers,
    findCrossProjectLeaders,
    findEmergingTalents,
    analyzeProjectCompetition,
    findInfluenceAnomalies
};
