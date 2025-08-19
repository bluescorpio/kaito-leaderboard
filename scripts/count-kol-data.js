#!/usr/bin/env node

/**
 * 统计kol.json中的KOL数据量
 * 功能：详细统计KOL数据的各种维度信息
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

// 统计KOL数据
function analyzeKolDataSize(kolData) {
    const stats = {
        totalProjects: 0,
        totalTimeframes: 0,
        totalRecords: 0, // 总记录数（KOL出现次数）
        uniqueKOLs: new Set(), // 去重的KOL
        projectStats: {},
        categoryStats: {},
        timeframeStats: {},
        dataQuality: {
            recordsWithSmartFollowers: 0,
            recordsWithMindshare: 0,
            recordsWithCommunityScore: 0,
            recordsWithBio: 0,
            recordsWithIcon: 0
        }
    };

    // 遍历所有类别
    Object.keys(kolData.categories).forEach(category => {
        stats.categoryStats[category] = {
            projects: 0,
            totalRecords: 0,
            uniqueKOLs: new Set()
        };

        // 遍历类别下的所有项目
        Object.keys(kolData.categories[category]).forEach(project => {
            stats.totalProjects++;
            stats.categoryStats[category].projects++;
            
            const projectData = kolData.categories[category][project];
            stats.projectStats[project] = {
                category: category,
                timeframes: 0,
                totalKOLs: 0,
                uniqueKOLs: new Set()
            };

            // 遍历项目下的所有时间周期
            Object.keys(projectData).forEach(timeframe => {
                stats.totalTimeframes++;
                stats.projectStats[project].timeframes++;
                
                if (!stats.timeframeStats[timeframe]) {
                    stats.timeframeStats[timeframe] = {
                        projects: 0,
                        totalKOLs: 0,
                        uniqueKOLs: new Set()
                    };
                }
                stats.timeframeStats[timeframe].projects++;

                const kols = projectData[timeframe];
                if (Array.isArray(kols)) {
                    const kolCount = kols.length;
                    stats.totalRecords += kolCount;
                    stats.categoryStats[category].totalRecords += kolCount;
                    stats.projectStats[project].totalKOLs += kolCount;
                    stats.timeframeStats[timeframe].totalKOLs += kolCount;

                    // 统计KOL
                    kols.forEach(kol => {
                        if (kol && kol.username) {
                            // 添加到各种统计集合中
                            stats.uniqueKOLs.add(kol.username);
                            stats.categoryStats[category].uniqueKOLs.add(kol.username);
                            stats.projectStats[project].uniqueKOLs.add(kol.username);
                            stats.timeframeStats[timeframe].uniqueKOLs.add(kol.username);

                            // 数据质量统计
                            if (kol.smart_follower_count !== undefined && kol.smart_follower_count !== null) {
                                stats.dataQuality.recordsWithSmartFollowers++;
                            }
                            if (kol.mindshare !== undefined && kol.mindshare !== null) {
                                stats.dataQuality.recordsWithMindshare++;
                            }
                            if (kol.community_score !== undefined && kol.community_score !== null) {
                                stats.dataQuality.recordsWithCommunityScore++;
                            }
                            if (kol.bio && kol.bio.trim()) {
                                stats.dataQuality.recordsWithBio++;
                            }
                            if (kol.icon && kol.icon.trim()) {
                                stats.dataQuality.recordsWithIcon++;
                            }
                        }
                    });
                }
            });

            // 转换Set为数组以便统计
            stats.projectStats[project].uniqueKOLsCount = stats.projectStats[project].uniqueKOLs.size;
        });

        // 转换Set为数组以便统计
        stats.categoryStats[category].uniqueKOLsCount = stats.categoryStats[category].uniqueKOLs.size;
    });

    // 转换时间周期统计中的Set
    Object.keys(stats.timeframeStats).forEach(timeframe => {
        stats.timeframeStats[timeframe].uniqueKOLsCount = stats.timeframeStats[timeframe].uniqueKOLs.size;
    });

    // 最终统计
    stats.totalUniqueKOLs = stats.uniqueKOLs.size;
    
    return stats;
}

// 生成统计报告
function generateReport(kolData, stats) {
    console.log('\n📊 ===== KOL数据量统计报告 =====\n');

    // 1. 文件基本信息
    console.log('📁 文件基本信息:');
    console.log(`  更新时间: ${kolData.lastUpdate}`);
    console.log(`  声明的项目数: ${kolData.totalProjects}`);
    console.log(`  声明的时间周期数: ${kolData.totalDurations}`);
    console.log('');

    // 2. 数据量概览
    console.log('📈 数据量概览:');
    console.log(`  总项目数: ${stats.totalProjects}`);
    console.log(`  总时间周期数: ${stats.totalTimeframes}`);
    console.log(`  总KOL记录数: ${stats.totalRecords.toLocaleString()}`);
    console.log(`  去重KOL数量: ${stats.totalUniqueKOLs.toLocaleString()}`);
    console.log(`  平均每个项目: ${(stats.totalRecords / stats.totalProjects).toFixed(1)} 条记录`);
    console.log(`  平均每个时间周期: ${(stats.totalRecords / stats.totalTimeframes).toFixed(1)} 条记录`);
    console.log('');

    // 3. 按类别统计
    console.log('🏷️ 按类别统计:');
    Object.keys(stats.categoryStats).forEach(category => {
        const categoryData = stats.categoryStats[category];
        console.log(`  ${category.toUpperCase()}:`);
        console.log(`    项目数: ${categoryData.projects}`);
        console.log(`    记录数: ${categoryData.totalRecords.toLocaleString()}`);
        console.log(`    去重KOL: ${categoryData.uniqueKOLsCount.toLocaleString()}`);
        console.log(`    平均每项目: ${(categoryData.totalRecords / categoryData.projects).toFixed(1)} 条记录`);
        console.log('');
    });

    // 4. 按时间周期统计
    console.log('⏰ 按时间周期统计:');
    const timeframes = ['7d', '30d', '3m', '6m', '12m'];
    timeframes.forEach(timeframe => {
        if (stats.timeframeStats[timeframe]) {
            const timeframeData = stats.timeframeStats[timeframe];
            console.log(`  ${timeframe}:`);
            console.log(`    覆盖项目: ${timeframeData.projects}`);
            console.log(`    记录数: ${timeframeData.totalKOLs.toLocaleString()}`);
            console.log(`    去重KOL: ${timeframeData.uniqueKOLsCount.toLocaleString()}`);
            console.log(`    平均每项目: ${(timeframeData.totalKOLs / timeframeData.projects).toFixed(1)} 条记录`);
            console.log('');
        }
    });

    // 5. 数据质量统计
    console.log('✅ 数据质量统计:');
    const totalRecords = stats.totalRecords;
    console.log(`  总记录数: ${totalRecords.toLocaleString()}`);
    console.log(`  包含smart_follower_count: ${stats.dataQuality.recordsWithSmartFollowers.toLocaleString()} (${(stats.dataQuality.recordsWithSmartFollowers/totalRecords*100).toFixed(1)}%)`);
    console.log(`  包含mindshare: ${stats.dataQuality.recordsWithMindshare.toLocaleString()} (${(stats.dataQuality.recordsWithMindshare/totalRecords*100).toFixed(1)}%)`);
    console.log(`  包含community_score: ${stats.dataQuality.recordsWithCommunityScore.toLocaleString()} (${(stats.dataQuality.recordsWithCommunityScore/totalRecords*100).toFixed(1)}%)`);
    console.log(`  包含bio: ${stats.dataQuality.recordsWithBio.toLocaleString()} (${(stats.dataQuality.recordsWithBio/totalRecords*100).toFixed(1)}%)`);
    console.log(`  包含头像: ${stats.dataQuality.recordsWithIcon.toLocaleString()} (${(stats.dataQuality.recordsWithIcon/totalRecords*100).toFixed(1)}%)`);
    console.log('');

    // 6. 项目参与度TOP 10
    console.log('🏆 KOL记录数最多的项目 TOP 10:');
    const topProjects = Object.entries(stats.projectStats)
        .sort((a, b) => b[1].totalKOLs - a[1].totalKOLs)
        .slice(0, 10);
    
    topProjects.forEach((entry, index) => {
        const [project, data] = entry;
        console.log(`  ${index + 1}. ${project} (${data.category.toUpperCase()})`);
        console.log(`     总记录: ${data.totalKOLs} | 去重KOL: ${data.uniqueKOLsCount} | 时间周期: ${data.timeframes}`);
    });
    console.log('');

    // 7. 去重KOL最多的项目 TOP 10
    console.log('👥 去重KOL数最多的项目 TOP 10:');
    const topUniqueProjects = Object.entries(stats.projectStats)
        .sort((a, b) => b[1].uniqueKOLsCount - a[1].uniqueKOLsCount)
        .slice(0, 10);
    
    topUniqueProjects.forEach((entry, index) => {
        const [project, data] = entry;
        console.log(`  ${index + 1}. ${project} (${data.category.toUpperCase()})`);
        console.log(`     去重KOL: ${data.uniqueKOLsCount} | 总记录: ${data.totalKOLs} | 平均重复: ${(data.totalKOLs/data.uniqueKOLsCount).toFixed(1)}次`);
    });
    console.log('');

    // 8. 文件大小估算
    console.log('💾 文件信息:');
    try {
        const fs = require('fs');
        const stats_file = fs.statSync('kol.json');
        const fileSizeInBytes = stats_file.size;
        const fileSizeInMB = (fileSizeInBytes / (1024*1024)).toFixed(2);
        console.log(`  文件大小: ${fileSizeInMB} MB (${fileSizeInBytes.toLocaleString()} bytes)`);
        console.log(`  平均每条记录: ${(fileSizeInBytes / totalRecords).toFixed(0)} bytes`);
        console.log(`  平均每个KOL: ${(fileSizeInBytes / stats.totalUniqueKOLs).toFixed(0)} bytes`);
    } catch (error) {
        console.log('  文件大小: 无法获取');
    }
    console.log('');
}

// 主函数
async function main() {
    console.log('🔍 开始统计KOL数据量...\n');
    
    try {
        // 1. 加载数据
        console.log('📥 加载KOL数据...');
        const kolData = await loadKolData();
        console.log('✅ 数据加载成功');
        
        // 2. 统计数据
        console.log('📊 统计数据量...');
        const stats = analyzeKolDataSize(kolData);
        console.log('✅ 统计完成');
        
        // 3. 生成报告
        generateReport(kolData, stats);
        
        // 4. 保存统计结果
        const outputPath = path.join(__dirname, '../kol-data-statistics.json');
        await fs.writeFile(outputPath, JSON.stringify({
            analysis_time: new Date().toISOString(),
            file_update_time: kolData.lastUpdate,
            statistics: {
                total_projects: stats.totalProjects,
                total_timeframes: stats.totalTimeframes,
                total_records: stats.totalRecords,
                total_unique_kols: stats.totalUniqueKOLs,
                category_stats: Object.fromEntries(
                    Object.entries(stats.categoryStats).map(([k, v]) => [k, {
                        projects: v.projects,
                        total_records: v.totalRecords,
                        unique_kols: v.uniqueKOLsCount
                    }])
                ),
                timeframe_stats: Object.fromEntries(
                    Object.entries(stats.timeframeStats).map(([k, v]) => [k, {
                        projects: v.projects,
                        total_kols: v.totalKOLs,
                        unique_kols: v.uniqueKOLsCount
                    }])
                ),
                data_quality: stats.dataQuality
            }
        }, null, 2), 'utf8');
        
        console.log(`📄 详细统计结果已保存到: kol-data-statistics.json`);
        console.log('\n🎉 KOL数据量统计完成!');
        
    } catch (error) {
        console.error('\n❌ 统计失败:', error);
        process.exit(1);
    }
}

// 运行统计
if (require.main === module) {
    main();
}

module.exports = {
    analyzeKolDataSize,
    loadKolData
};
