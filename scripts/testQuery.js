const KolDataQuery = require('./queryKolData');

// 创建查询实例，使用测试数据文件
class TestKolDataQuery extends KolDataQuery {
    constructor() {
        super('../test-kol.json');
    }
}

async function runTests() {
    console.log('🧪 测试KOL数据查询功能\n');
    
    const query = new TestKolDataQuery();
    
    try {
        // 测试1: 加载数据
        console.log('📥 测试1: 加载数据...');
        const loaded = await query.loadData();
        if (loaded) {
            console.log('✅ 数据加载成功\n');
        } else {
            console.log('❌ 数据加载失败\n');
            return;
        }
        
        // 测试2: 获取统计信息
        console.log('📊 测试2: 获取统计信息...');
        const stats = await query.getStats();
        console.log('✅ 统计信息:');
        console.log(`   更新时间: ${stats.lastUpdate}`);
        console.log(`   总KOL数: ${stats.stats.totalKOLs}`);
        console.log(`   成功请求: ${stats.stats.successfulRequests}`);
        console.log(`   失败请求: ${stats.stats.failedRequests}\n`);
        
        // 测试3: 获取可用项目
        console.log('📋 测试3: 获取可用项目...');
        const projects = await query.getAvailableProjects();
        console.log('✅ 可用项目:');
        console.log(`   Pre TGE: ${projects.pre_tge.join(', ')}`);
        console.log(`   Post TGE: ${projects.post_tge.join(', ')}\n`);
        
        // 测试4: 获取排行榜
        console.log('🏆 测试4: 获取APT 7天排行榜...');
        const leaderboard = await query.getLeaderboard('post_tge', 'APT', '7d', 5);
        if (leaderboard && leaderboard.length > 0) {
            console.log('✅ APT 7天排行榜 (Top 5):');
            leaderboard.forEach((user, index) => {
                console.log(`   #${user.rank} ${user.name} (@${user.username}) - ${(user.mindshare * 100).toFixed(2)}%`);
            });
        } else {
            console.log('⚠️  无APT排行榜数据');
        }
        console.log('');
        
        // 测试5: 搜索用户（使用排行榜中的第一个用户）
        if (leaderboard && leaderboard.length > 0) {
            const testUsername = leaderboard[0].username;
            console.log(`🔍 测试5: 搜索用户 "${testUsername}"...`);
            const userRankings = await query.getUserAllRankings(testUsername);
            if (userRankings) {
                console.log('✅ 用户排名信息:');
                console.log(`   用户: ${userRankings.name} (@${userRankings.username})`);
                console.log(`   总排名数: ${userRankings.totalRankings}`);
                console.log('   排名详情:');
                Object.entries(userRankings.allRankings).forEach(([key, ranking]) => {
                    console.log(`     ${ranking.project} (${ranking.duration}): #${ranking.rank} - ${(ranking.mindshare * 100).toFixed(2)}%`);
                });
            } else {
                console.log('⚠️  未找到用户排名信息');
            }
        }
        console.log('');
        
        // 测试6: 获取项目top KOL
        console.log('👑 测试6: 获取MONAD项目top KOL...');
        const topKOLs = await query.getProjectTopKOLs('pre_tge', 'MONAD', 5);
        if (topKOLs && topKOLs.length > 0) {
            console.log('✅ MONAD项目top KOL:');
            topKOLs.forEach((user, index) => {
                console.log(`   #${index + 1} ${user.name} (@${user.username}) - ${(user.mindshare * 100).toFixed(2)}% (${user.bestDuration})`);
            });
        } else {
            console.log('⚠️  无MONAD项目数据');
        }
        
        console.log('\n🎉 所有测试完成！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

// 运行测试
if (require.main === module) {
    runTests();
}

module.exports = { runTests, TestKolDataQuery };
