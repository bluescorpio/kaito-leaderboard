#!/usr/bin/env node

/**
 * KOL.json 深度分析示例
 * 展示具体的数据分析方法和可视化方向
 */

const fs = require('fs');

console.log('🔬 KOL.json 深度分析示例');
console.log('=========================');

function deepAnalysis() {
    try {
        const kolData = JSON.parse(fs.readFileSync('kol.json', 'utf8'));
        
        // 1. 项目影响力对比分析
        console.log('\n1. 🏷️ 项目影响力对比分析');
        console.log('===========================');
        
        const projectInfluence = {};
        ['pre_tge', 'post_tge'].forEach(category => {
            Object.entries(kolData.categories[category]).forEach(([projectName, projectData]) => {
                const sevenDayData = projectData['7d'] || [];
                const totalMindshare = sevenDayData.reduce((sum, kol) => sum + (kol.mindshare || 0), 0);
                const avgCommunityScore = sevenDayData.reduce((sum, kol) => sum + (kol.community_score || 0), 0) / sevenDayData.length;
                const topKolFollowers = Math.max(...sevenDayData.map(kol => kol.follower_count || 0));
                
                projectInfluence[projectName] = {
                    category,
                    totalMindshare: totalMindshare.toFixed(4),
                    avgCommunityScore: avgCommunityScore.toFixed(2),
                    topKolFollowers: topKolFollowers.toLocaleString(),
                    kolCount: sevenDayData.length
                };
            });
        });
        
        // 显示Top 10影响力项目
        const topInfluenceProjects = Object.entries(projectInfluence)
            .sort((a, b) => parseFloat(b[1].totalMindshare) - parseFloat(a[1].totalMindshare))
            .slice(0, 10);
            
        console.log('🏆 Top 10 影响力项目 (按总Mindshare排序):');
        topInfluenceProjects.forEach(([project, data], index) => {
            console.log(`   ${index + 1}. ${project} (${data.category.toUpperCase()})`);
            console.log(`      📊 总Mindshare: ${data.totalMindshare}`);
            console.log(`      🎯 平均社区分数: ${data.avgCommunityScore}`);
            console.log(`      👥 KOL数量: ${data.kolCount}`);
            console.log(`      🔝 顶级KOL粉丝: ${data.topKolFollowers}`);
        });
        
        // 2. 时间趋势分析示例
        console.log('\n2. ⏰ 时间趋势分析示例 (APT项目)');
        console.log('================================');
        
        const aptData = kolData.categories.post_tge.APT;
        if (aptData) {
            const timeIntervals = ['7d', '30d', '3m', '6m', '12m'];
            console.log('📈 APT项目各时间段KOL影响力趋势:');
            
            timeIntervals.forEach(interval => {
                const data = aptData[interval] || [];
                const avgMindshare = data.reduce((sum, kol) => sum + (kol.mindshare || 0), 0) / data.length;
                const avgCommunityScore = data.reduce((sum, kol) => sum + (kol.community_score || 0), 0) / data.length;
                const topKol = data[0]; // 排名第一的KOL
                
                console.log(`   ${interval}:`);
                console.log(`      📊 平均Mindshare: ${avgMindshare.toFixed(6)}`);
                console.log(`      🎯 平均社区分数: ${avgCommunityScore.toFixed(2)}`);
                console.log(`      🏆 Top KOL: ${topKol?.name || 'N/A'} (${topKol?.follower_count?.toLocaleString() || 'N/A'} 粉丝)`);
            });
        }
        
        // 3. KOL类型分析
        console.log('\n3. 👥 KOL类型分析');
        console.log('==================');
        
        const kolTypes = {
            'mega_influencer': [], // >1M粉丝
            'macro_influencer': [], // 100K-1M粉丝
            'micro_influencer': [], // 10K-100K粉丝
            'nano_influencer': []   // <10K粉丝
        };
        
        // 分析所有KOL
        Object.values(kolData.categories.pre_tge).concat(Object.values(kolData.categories.post_tge))
            .forEach(project => {
                if (project['7d']) {
                    project['7d'].forEach(kol => {
                        const followers = kol.follower_count || 0;
                        if (followers >= 1000000) {
                            kolTypes.mega_influencer.push(kol);
                        } else if (followers >= 100000) {
                            kolTypes.macro_influencer.push(kol);
                        } else if (followers >= 10000) {
                            kolTypes.micro_influencer.push(kol);
                        } else {
                            kolTypes.nano_influencer.push(kol);
                        }
                    });
                }
            });
        
        console.log('📊 KOL分布按粉丝规模:');
        Object.entries(kolTypes).forEach(([type, kols]) => {
            const avgMindshare = kols.reduce((sum, kol) => sum + (kol.mindshare || 0), 0) / kols.length;
            const avgCommunityScore = kols.reduce((sum, kol) => sum + (kol.community_score || 0), 0) / kols.length;
            
            console.log(`   ${type}: ${kols.length} 个KOL`);
            console.log(`      📊 平均Mindshare: ${avgMindshare.toFixed(6)}`);
            console.log(`      🎯 平均社区分数: ${avgCommunityScore.toFixed(2)}`);
        });
        
        // 4. Smart Follower分析
        console.log('\n4. 🧠 Smart Follower质量分析');
        console.log('=============================');
        
        const smartFollowerRatios = [];
        Object.values(kolData.categories.pre_tge).concat(Object.values(kolData.categories.post_tge))
            .forEach(project => {
                if (project['7d']) {
                    project['7d'].forEach(kol => {
                        const totalFollowers = kol.follower_count || 0;
                        const smartFollowers = kol.smart_follower_count || 0;
                        if (totalFollowers > 0) {
                            const ratio = smartFollowers / totalFollowers;
                            smartFollowerRatios.push({
                                name: kol.name,
                                ratio: ratio,
                                smartFollowers: smartFollowers,
                                totalFollowers: totalFollowers,
                                mindshare: kol.mindshare || 0
                            });
                        }
                    });
                }
            });
        
        // 按Smart Follower比例排序
        smartFollowerRatios.sort((a, b) => b.ratio - a.ratio);
        
        console.log('🏆 Top 10 Smart Follower比例最高的KOL:');
        smartFollowerRatios.slice(0, 10).forEach((kol, index) => {
            console.log(`   ${index + 1}. ${kol.name}`);
            console.log(`      🧠 Smart比例: ${(kol.ratio * 100).toFixed(2)}%`);
            console.log(`      👥 Smart粉丝: ${kol.smartFollowers.toLocaleString()}`);
            console.log(`      📊 总粉丝: ${kol.totalFollowers.toLocaleString()}`);
            console.log(`      💡 Mindshare: ${kol.mindshare.toFixed(6)}`);
        });
        
        // 5. 语言/地域分布分析示例
        console.log('\n5. 🌐 语言/地域特征分析');
        console.log('========================');
        
        const languagePatterns = {
            chinese: 0,
            english: 0,
            emoji_heavy: 0,
            mixed: 0
        };
        
        let totalBios = 0;
        Object.values(kolData.categories.pre_tge).concat(Object.values(kolData.categories.post_tge))
            .forEach(project => {
                if (project['7d']) {
                    project['7d'].slice(0, 10).forEach(kol => { // 只分析前10个KOL避免过多计算
                        if (kol.bio) {
                            totalBios++;
                            const bio = kol.bio.toLowerCase();
                            const hasChineseChars = /[\u4e00-\u9fff]/.test(kol.bio);
                            const hasEmojis = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(kol.bio);
                            
                            if (hasChineseChars) {
                                languagePatterns.chinese++;
                            } else if (hasEmojis) {
                                languagePatterns.emoji_heavy++;
                            } else if (/[a-zA-Z]/.test(bio)) {
                                languagePatterns.english++;
                            } else {
                                languagePatterns.mixed++;
                            }
                        }
                    });
                }
            });
        
        console.log('📝 Bio语言特征分布 (样本分析):');
        Object.entries(languagePatterns).forEach(([pattern, count]) => {
            const percentage = ((count / totalBios) * 100).toFixed(1);
            console.log(`   ${pattern}: ${count} (${percentage}%)`);
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ 深度分析过程中发生错误:', error.message);
        return false;
    }
}

// 执行深度分析
const success = deepAnalysis();

if (success) {
    console.log('\n🎉 深度分析完成!');
    console.log('\n📊 可视化建议:');
    console.log('===============');
    console.log('1. 📈 时间序列图: 项目Mindshare随时间变化');
    console.log('2. 🥧 饼图: PRE_TGE vs POST_TGE项目分布');
    console.log('3. 📊 散点图: Follower Count vs Community Score');
    console.log('4. 📉 柱状图: 不同项目的平均影响力对比');
    console.log('5. 🔥 热力图: KOL在不同项目中的活跃度');
    console.log('6. 🌐 网络图: KOL之间的关注关系网络');
    console.log('7. 📋 排行榜: 动态排名变化可视化');
    console.log('8. 🎯 雷达图: KOL多维度影响力分析');
} else {
    console.log('\n💥 深度分析失败，请检查错误信息');
}
