#!/usr/bin/env node

/**
 * 分析项目在各时间周期的上榜人数
 * 功能：找出上榜人数低于20人的项目和时间周期
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

// 分析各项目各时间周期的上榜人数
function analyzeTimeframeCoverage(kolData) {
    const results = [];
    const summary = {
        total_projects: 0,
        total_timeframes: 0,
        low_participation_cases: [], // 低于20人的情况
        very_low_participation_cases: [], // 低于10人的情况
        empty_cases: [], // 0人的情况
        timeframe_stats: {
            '7d': { total: 0, low: 0, avg: 0 },
            '30d': { total: 0, low: 0, avg: 0 },
            '3m': { total: 0, low: 0, avg: 0 },
            '6m': { total: 0, low: 0, avg: 0 },
            '12m': { total: 0, low: 0, avg: 0 }
        }
    };

    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            const projectData = kolData.categories[category][project];
            summary.total_projects++;
            
            const projectAnalysis = {
                project: project,
                category: category,
                timeframes: {},
                total_timeframes: 0,
                low_participation_count: 0,
                very_low_participation_count: 0,
                empty_count: 0,
                min_participation: Infinity,
                max_participation: 0,
                avg_participation: 0
            };

            let totalParticipants = 0;
            let timeframeCount = 0;

            Object.keys(projectData).forEach(timeframe => {
                const kols = projectData[timeframe];
                const participantCount = Array.isArray(kols) ? kols.length : 0;
                
                projectAnalysis.timeframes[timeframe] = participantCount;
                projectAnalysis.total_timeframes++;
                summary.total_timeframes++;
                timeframeCount++;
                totalParticipants += participantCount;

                // 更新统计
                projectAnalysis.min_participation = Math.min(projectAnalysis.min_participation, participantCount);
                projectAnalysis.max_participation = Math.max(projectAnalysis.max_participation, participantCount);

                // 更新时间周期统计
                if (summary.timeframe_stats[timeframe]) {
                    summary.timeframe_stats[timeframe].total++;
                    summary.timeframe_stats[timeframe].avg += participantCount;
                    
                    if (participantCount < 20) {
                        summary.timeframe_stats[timeframe].low++;
                    }
                }

                // 记录低参与度情况
                if (participantCount < 20) {
                    const caseInfo = {
                        project: project,
                        category: category,
                        timeframe: timeframe,
                        participant_count: participantCount
                    };

                    summary.low_participation_cases.push(caseInfo);
                    projectAnalysis.low_participation_count++;

                    if (participantCount < 10) {
                        summary.very_low_participation_cases.push(caseInfo);
                        projectAnalysis.very_low_participation_count++;

                        if (participantCount === 0) {
                            summary.empty_cases.push(caseInfo);
                            projectAnalysis.empty_count++;
                        }
                    }
                }
            });

            projectAnalysis.avg_participation = timeframeCount > 0 ? totalParticipants / timeframeCount : 0;
            if (projectAnalysis.min_participation === Infinity) {
                projectAnalysis.min_participation = 0;
            }

            results.push(projectAnalysis);
        });
    });

    // 计算时间周期平均值
    Object.keys(summary.timeframe_stats).forEach(timeframe => {
        const stats = summary.timeframe_stats[timeframe];
        if (stats.total > 0) {
            stats.avg = stats.avg / stats.total;
        }
    });

    return { results, summary };
}

// 生成报告
function generateReport(analysis) {
    const { results, summary } = analysis;

    console.log('\n📊 ===== 项目时间周期参与度分析 =====\n');

    // 1. 总体统计
    console.log('🔍 总体统计:');
    console.log(`  总项目数: ${summary.total_projects}`);
    console.log(`  总时间周期数: ${summary.total_timeframes}`);
    console.log(`  低参与度情况 (<20人): ${summary.low_participation_cases.length} 次`);
    console.log(`  极低参与度情况 (<10人): ${summary.very_low_participation_cases.length} 次`);
    console.log(`  空白情况 (0人): ${summary.empty_cases.length} 次`);
    console.log('');

    // 2. 按时间周期统计
    console.log('📅 各时间周期统计:');
    Object.keys(summary.timeframe_stats).forEach(timeframe => {
        const stats = summary.timeframe_stats[timeframe];
        const lowPercentage = stats.total > 0 ? (stats.low / stats.total * 100).toFixed(1) : '0.0';
        console.log(`  ${timeframe}: 平均${stats.avg.toFixed(1)}人/项目, ${stats.low}/${stats.total}项目 (${lowPercentage}%) <20人`);
    });
    console.log('');

    // 3. 低于20人的详细情况
    console.log('🚨 上榜人数 < 20人 的详细情况:');
    if (summary.low_participation_cases.length === 0) {
        console.log('  🎉 没有发现上榜人数低于20人的情况');
    } else {
        // 按参与人数排序
        const sortedLowCases = summary.low_participation_cases.sort((a, b) => a.participant_count - b.participant_count);
        
        console.log(`  📋 共发现 ${sortedLowCases.length} 个低参与度情况:`);
        sortedLowCases.forEach((case_, index) => {
            const emoji = case_.participant_count === 0 ? '💀' : case_.participant_count < 5 ? '🔴' : case_.participant_count < 10 ? '🟠' : '🟡';
            console.log(`    ${emoji} ${index + 1}. ${case_.project} (${case_.category.toUpperCase()}) - ${case_.timeframe}: ${case_.participant_count}人`);
        });
    }
    console.log('');

    // 4. 按项目分组的低参与度分析
    console.log('🎯 问题项目分析 (存在<20人情况的项目):');
    const problemProjects = results.filter(project => project.low_participation_count > 0);
    
    if (problemProjects.length === 0) {
        console.log('  🎉 所有项目在所有时间周期都有>=20人参与');
    } else {
        problemProjects
            .sort((a, b) => b.low_participation_count - a.low_participation_count)
            .slice(0, 15) // 显示前15个问题最严重的项目
            .forEach((project, index) => {
                console.log(`  ${index + 1}. ${project.project} (${project.category.toUpperCase()})`);
                console.log(`     问题时间周期: ${project.low_participation_count}/${project.total_timeframes}`);
                console.log(`     参与人数范围: ${project.min_participation}-${project.max_participation}人 (平均${project.avg_participation.toFixed(1)}人)`);
                
                // 显示具体的低参与度时间周期
                const lowTimeframes = Object.entries(project.timeframes)
                    .filter(([timeframe, count]) => count < 20)
                    .map(([timeframe, count]) => `${timeframe}:${count}人`)
                    .join(', ');
                console.log(`     详情: ${lowTimeframes}`);
            });
    }
    console.log('');

    // 5. 最严重的情况
    if (summary.empty_cases.length > 0) {
        console.log('💀 完全无人参与的情况 (0人):');
        summary.empty_cases.forEach((case_, index) => {
            console.log(`  ${index + 1}. ${case_.project} (${case_.category.toUpperCase()}) - ${case_.timeframe}`);
        });
        console.log('');
    }

    if (summary.very_low_participation_cases.length > 0) {
        console.log('🔴 极低参与度情况 (<10人):');
        const veryLowByProject = {};
        summary.very_low_participation_cases.forEach(case_ => {
            if (!veryLowByProject[case_.project]) {
                veryLowByProject[case_.project] = [];
            }
            veryLowByProject[case_.project].push(`${case_.timeframe}:${case_.participant_count}人`);
        });

        Object.entries(veryLowByProject).forEach(([project, cases]) => {
            console.log(`  🚨 ${project}: ${cases.join(', ')}`);
        });
        console.log('');
    }

    // 6. 健康度评估
    console.log('📈 生态健康度评估:');
    const healthyProjects = results.filter(project => project.min_participation >= 20).length;
    const healthyPercentage = (healthyProjects / results.length * 100).toFixed(1);
    
    console.log(`  🟢 健康项目 (所有时间周期>=20人): ${healthyProjects}/${results.length} (${healthyPercentage}%)`);
    console.log(`  🟡 有问题项目: ${problemProjects.length}/${results.length} (${(100 - healthyPercentage).toFixed(1)}%)`);
    
    const avgParticipationGlobal = results.reduce((sum, project) => sum + project.avg_participation, 0) / results.length;
    console.log(`  📊 全局平均参与度: ${avgParticipationGlobal.toFixed(1)}人/项目/时间周期`);
    
    console.log('');
}

// 主函数
async function main() {
    console.log('🔍 开始分析项目时间周期参与度...\n');
    
    try {
        // 1. 加载数据
        console.log('📥 加载KOL数据...');
        const kolData = await loadKolData();
        console.log(`✅ 数据加载成功 (更新时间: ${kolData.lastUpdate})`);
        
        // 2. 分析时间周期覆盖度
        console.log('📊 分析各项目各时间周期参与度...');
        const analysis = analyzeTimeframeCoverage(kolData);
        
        // 3. 生成报告
        generateReport(analysis);
        
        // 4. 保存详细结果
        const outputPath = path.join(__dirname, '../timeframe-participation-analysis.json');
        await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), 'utf8');
        console.log(`📄 详细分析结果已保存到: timeframe-participation-analysis.json`);
        
        console.log('\n🎉 时间周期参与度分析完成!');
        
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
    analyzeTimeframeCoverage,
    loadKolData
};
