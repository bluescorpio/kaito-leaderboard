#!/usr/bin/env node

/**
 * KOL信息收集和分析脚本
 * 功能：从kol.json中提取、分析和统计KOL信息
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

// 提取所有唯一的KOL信息
function extractUniqueKols(kolData) {
    const kolMap = new Map();
    
    // 遍历所有类别
    Object.keys(kolData.categories).forEach(category => {
        Object.keys(kolData.categories[category]).forEach(project => {
            Object.keys(kolData.categories[category][project]).forEach(duration => {
                const rankings = kolData.categories[category][project][duration];
                
                rankings.forEach(kol => {
                    const key = kol.username;
                    
                    if (!kolMap.has(key)) {
                        kolMap.set(key, {
                            username: kol.username,
                            name: kol.name,
                            bio: kol.bio || '',
                            follower_count: kol.follower_count || 0,
                            smart_follower_count: kol.smart_follower_count || 0,
                            icon: kol.icon || '',
                            twitter_user_url: kol.twitter_user_url || '',
                            projects: new Set(),
                            rankings: [],
                            first_seen: project,
                            categories: new Set()
                        });
                    }
                    
                    const kolInfo = kolMap.get(key);
                    kolInfo.projects.add(project);
                    kolInfo.categories.add(category);
                    kolInfo.rankings.push({
                        project,
                        category,
                        duration,
                        rank: parseInt(kol.rank),
                        mindshare: kol.mindshare,
                        community_score: kol.community_score
                    });
                });
            });
        });
    });
    
    // 转换Set为Array并计算统计信息
    const kols = Array.from(kolMap.values()).map(kol => ({
        ...kol,
        projects: Array.from(kol.projects),
        categories: Array.from(kol.categories),
        project_count: kol.projects.size,
        total_rankings: kol.rankings.length,
        best_rank: Math.min(...kol.rankings.map(r => r.rank)),
        avg_rank: kol.rankings.reduce((sum, r) => sum + r.rank, 0) / kol.rankings.length,
        max_mindshare: Math.max(...kol.rankings.map(r => r.mindshare || 0)),
        avg_community_score: kol.rankings.reduce((sum, r) => sum + (r.community_score || 0), 0) / kol.rankings.length
    }));
    
    return kols;
}

// 生成KOL统计分析
function generateKolAnalysis(kols) {
    const analysis = {
        total_unique_kols: kols.length,
        follower_stats: {
            max: Math.max(...kols.map(k => k.follower_count)),
            min: Math.min(...kols.map(k => k.follower_count)),
            avg: Math.round(kols.reduce((sum, k) => sum + k.follower_count, 0) / kols.length),
            median: getMedian(kols.map(k => k.follower_count))
        },
        smart_follower_stats: {
            max: Math.max(...kols.map(k => k.smart_follower_count)),
            min: Math.min(...kols.map(k => k.smart_follower_count)),
            avg: Math.round(kols.reduce((sum, k) => sum + k.smart_follower_count, 0) / kols.length),
            median: getMedian(kols.map(k => k.smart_follower_count))
        },
        project_participation: {
            max_projects: Math.max(...kols.map(k => k.project_count)),
            avg_projects: (kols.reduce((sum, k) => sum + k.project_count, 0) / kols.length).toFixed(2),
            single_project_kols: kols.filter(k => k.project_count === 1).length,
            multi_project_kols: kols.filter(k => k.project_count > 1).length
        },
        ranking_performance: {
            top_1_appearances: kols.filter(k => k.best_rank === 1).length,
            top_10_performers: kols.filter(k => k.best_rank <= 10).length,
            top_100_performers: kols.filter(k => k.best_rank <= 100).length
        },
        categories: {
            pre_tge_only: kols.filter(k => k.categories.length === 1 && k.categories.includes('pre_tge')).length,
            post_tge_only: kols.filter(k => k.categories.length === 1 && k.categories.includes('post_tge')).length,
            both_categories: kols.filter(k => k.categories.length === 2).length
        }
    };
    
    return analysis;
}

// 获取中位数
function getMedian(arr) {
    const sorted = arr.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// 获取顶级KOL列表
function getTopKols(kols, criteria = 'follower_count', limit = 20) {
    const sortedKols = [...kols].sort((a, b) => {
        switch(criteria) {
            case 'follower_count':
                return b.follower_count - a.follower_count;
            case 'smart_follower_count':
                return b.smart_follower_count - a.smart_follower_count;
            case 'project_count':
                return b.project_count - a.project_count;
            case 'best_rank':
                return a.best_rank - b.best_rank;
            case 'max_mindshare':
                return b.max_mindshare - a.max_mindshare;
            default:
                return b.follower_count - a.follower_count;
        }
    });
    
    return sortedKols.slice(0, limit);
}

// 保存KOL数据库文件
async function saveKolDatabase(kols, analysis) {
    const database = {
        metadata: {
            generated_at: new Date().toISOString(),
            total_kols: kols.length,
            source: 'kol.json analysis',
            version: '1.0'
        },
        analysis,
        kols: kols.map(kol => ({
            username: kol.username,
            name: kol.name,
            bio: kol.bio,
            follower_count: kol.follower_count,
            smart_follower_count: kol.smart_follower_count,
            icon: kol.icon,
            twitter_user_url: kol.twitter_user_url,
            projects: kol.projects,
            categories: kol.categories,
            stats: {
                project_count: kol.project_count,
                total_rankings: kol.total_rankings,
                best_rank: kol.best_rank,
                avg_rank: Math.round(kol.avg_rank * 10) / 10,
                max_mindshare: kol.max_mindshare,
                avg_community_score: Math.round(kol.avg_community_score * 10) / 10
            }
        }))
    };
    
    const outputPath = path.join(__dirname, '../kol-database.json');
    await fs.writeFile(outputPath, JSON.stringify(database, null, 2), 'utf8');
    
    return outputPath;
}

// 生成报告
function generateReport(analysis, topKols) {
    console.log('\n🎯 ===== KOL信息收集分析报告 =====\n');
    
    console.log('📊 基础统计:');
    console.log(`  总KOL数量: ${analysis.total_unique_kols.toLocaleString()}`);
    console.log('');
    
    console.log('👥 粉丝数统计:');
    console.log(`  最高粉丝数: ${analysis.follower_stats.max.toLocaleString()}`);
    console.log(`  平均粉丝数: ${analysis.follower_stats.avg.toLocaleString()}`);
    console.log(`  中位粉丝数: ${analysis.follower_stats.median.toLocaleString()}`);
    console.log('');
    
    console.log('🎯 智能粉丝统计:');
    console.log(`  最高智能粉丝: ${analysis.smart_follower_stats.max.toLocaleString()}`);
    console.log(`  平均智能粉丝: ${analysis.smart_follower_stats.avg.toLocaleString()}`);
    console.log(`  中位智能粉丝: ${analysis.smart_follower_stats.median.toLocaleString()}`);
    console.log('');
    
    console.log('🚀 项目参与度:');
    console.log(`  最多参与项目数: ${analysis.project_participation.max_projects}`);
    console.log(`  平均参与项目数: ${analysis.project_participation.avg_projects}`);
    console.log(`  单项目KOL: ${analysis.project_participation.single_project_kols}`);
    console.log(`  多项目KOL: ${analysis.project_participation.multi_project_kols}`);
    console.log('');
    
    console.log('🏆 排名表现:');
    console.log(`  获得第1名次数: ${analysis.ranking_performance.top_1_appearances}`);
    console.log(`  进入前10名KOL: ${analysis.ranking_performance.top_10_performers}`);
    console.log(`  进入前100名KOL: ${analysis.ranking_performance.top_100_performers}`);
    console.log('');
    
    console.log('📂 类别分布:');
    console.log(`  仅PRE_TGE: ${analysis.categories.pre_tge_only}`);
    console.log(`  仅POST_TGE: ${analysis.categories.post_tge_only}`);
    console.log(`  跨类别: ${analysis.categories.both_categories}`);
    console.log('');
    
    console.log('⭐ 顶级KOL (按粉丝数):');
    topKols.slice(0, 10).forEach((kol, index) => {
        console.log(`  ${index + 1}. ${kol.name} (@${kol.username})`);
        console.log(`     粉丝: ${kol.follower_count.toLocaleString()} | 智能粉丝: ${kol.smart_follower_count.toLocaleString()}`);
        console.log(`     项目: ${kol.project_count} | 最佳排名: #${kol.best_rank}`);
    });
}

// 主函数
async function main() {
    console.log('🔍 开始收集KOL信息...\n');
    
    try {
        // 1. 加载数据
        console.log('📥 加载KOL数据...');
        const kolData = await loadKolData();
        console.log(`✅ 数据加载成功 (更新时间: ${kolData.lastUpdate})`);
        
        // 2. 提取唯一KOL
        console.log('\n🔬 分析KOL信息...');
        const kols = extractUniqueKols(kolData);
        console.log(`✅ 提取到 ${kols.length} 个唯一KOL`);
        
        // 3. 生成分析报告
        console.log('\n📈 生成统计分析...');
        const analysis = generateKolAnalysis(kols);
        const topKols = getTopKols(kols, 'follower_count', 50);
        
        // 4. 保存数据库文件
        console.log('\n💾 保存KOL数据库...');
        const dbPath = await saveKolDatabase(kols, analysis);
        console.log(`✅ KOL数据库已保存: ${dbPath}`);
        
        // 5. 显示报告
        generateReport(analysis, topKols);
        
        console.log('\n🎉 KOL信息收集完成!');
        console.log(`📄 详细数据已保存到: kol-database.json`);
        
    } catch (error) {
        console.error('\n❌ KOL信息收集失败:', error);
        process.exit(1);
    }
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = { 
    loadKolData, 
    extractUniqueKols, 
    generateKolAnalysis, 
    getTopKols 
};
