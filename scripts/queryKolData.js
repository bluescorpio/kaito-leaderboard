const fs = require('fs').promises;
const path = require('path');

class KolDataQuery {
    constructor(dataFilePath = '../kol.json') {
        this.dataFilePath = path.resolve(__dirname, dataFilePath);
        this.data = null;
        this.isLoaded = false;
    }

    // 加载JSON数据
    async loadData() {
        try {
            const rawData = await fs.readFile(this.dataFilePath, 'utf8');
            this.data = JSON.parse(rawData);
            this.isLoaded = true;
            console.log(`✅ 数据加载成功! 更新时间: ${this.data.lastUpdate}`);
            return true;
        } catch (error) {
            console.error('❌ 加载数据失败:', error.message);
            return false;
        }
    }

    // 确保数据已加载
    async ensureDataLoaded() {
        if (!this.isLoaded) {
            await this.loadData();
        }
        if (!this.data) {
            throw new Error('数据未能正确加载');
        }
    }

    // 根据用户名搜索KOL
    async searchByUsername(username) {
        await this.ensureDataLoaded();
        
        const results = [];
        const searchUsername = username.toLowerCase();
        
        // 遍历所有分类和项目
        for (const [categoryName, category] of Object.entries(this.data.categories)) {
            for (const [projectName, project] of Object.entries(category)) {
                for (const [duration, users] of Object.entries(project)) {
                    if (Array.isArray(users)) {
                        const user = users.find(u => 
                            u.username.toLowerCase() === searchUsername ||
                            u.name.toLowerCase().includes(searchUsername.toLowerCase())
                        );
                        
                        if (user) {
                            results.push({
                                category: categoryName,
                                project: projectName,
                                duration: duration,
                                ...user
                            });
                        }
                    }
                }
            }
        }
        
        return results;
    }

    // 获取特定项目和时间周期的排行榜
    async getLeaderboard(category, project, duration, limit = 10) {
        await this.ensureDataLoaded();
        
        try {
            const projectData = this.data.categories[category][project];
            if (!projectData || !projectData[duration]) {
                return null;
            }
            
            const users = projectData[duration];
            return Array.isArray(users) ? users.slice(0, limit) : [];
        } catch (error) {
            console.error('获取排行榜失败:', error.message);
            return null;
        }
    }

    // 获取所有可用的项目列表
    async getAvailableProjects() {
        await this.ensureDataLoaded();
        
        const projects = {
            pre_tge: Object.keys(this.data.categories.pre_tge || {}),
            post_tge: Object.keys(this.data.categories.post_tge || {})
        };
        
        return projects;
    }

    // 获取数据统计信息
    async getStats() {
        await this.ensureDataLoaded();
        
        return {
            lastUpdate: this.data.lastUpdate,
            totalProjects: this.data.totalProjects,
            totalDurations: this.data.totalDurations,
            stats: this.data.stats
        };
    }

    // 根据用户名获取完整的排名信息
    async getUserAllRankings(username) {
        const userResults = await this.searchByUsername(username);
        
        if (userResults.length === 0) {
            return null;
        }

        // 按项目和时间周期组织数据
        const rankings = {};
        const userInfo = {
            name: userResults[0].name,
            username: userResults[0].username,
            icon: userResults[0].icon,
            bio: userResults[0].bio
        };

        userResults.forEach(result => {
            const key = `${result.category}_${result.project}_${result.duration}`;
            rankings[key] = {
                category: result.category,
                project: result.project,
                duration: result.duration,
                rank: result.rank,
                mindshare: result.mindshare,
                community_score: result.community_score,
                follower_count: result.follower_count,
                smart_follower_count: result.smart_follower_count
            };
        });

        return {
            ...userInfo,
            allRankings: rankings,
            totalRankings: Object.keys(rankings).length
        };
    }

    // 获取项目的top KOL（跨所有时间周期）
    async getProjectTopKOLs(category, project, limit = 20) {
        await this.ensureDataLoaded();
        
        try {
            const projectData = this.data.categories[category][project];
            if (!projectData) {
                return null;
            }

            const allUsers = new Map();
            
            // 收集所有时间周期的用户数据
            for (const [duration, users] of Object.entries(projectData)) {
                if (Array.isArray(users)) {
                    users.forEach(user => {
                        const key = user.username.toLowerCase();
                        if (!allUsers.has(key) || user.mindshare > allUsers.get(key).mindshare) {
                            allUsers.set(key, {
                                ...user,
                                bestDuration: duration,
                                category: category,
                                project: project
                            });
                        }
                    });
                }
            }

            // 按mindshare排序并返回top N
            return Array.from(allUsers.values())
                .sort((a, b) => b.mindshare - a.mindshare)
                .slice(0, limit);
        } catch (error) {
            console.error('获取项目top KOL失败:', error.message);
            return null;
        }
    }
}

// 导出类和便捷函数
module.exports = KolDataQuery;

// 如果直接运行此脚本，提供命令行接口
if (require.main === module) {
    const query = new KolDataQuery();
    
    async function runCLI() {
        const args = process.argv.slice(2);
        
        if (args.length === 0) {
            console.log('📖 KOL数据查询工具使用说明:');
            console.log('node queryKolData.js search <username>           - 搜索用户');
            console.log('node queryKolData.js leaderboard <category> <project> <duration> [limit] - 获取排行榜');
            console.log('node queryKolData.js projects                    - 列出所有项目');
            console.log('node queryKolData.js stats                      - 显示数据统计');
            console.log('\n示例:');
            console.log('node queryKolData.js search vitalik');
            console.log('node queryKolData.js leaderboard post_tge APT 7d 10');
            return;
        }

        try {
            switch (args[0]) {
                case 'search':
                    if (args[1]) {
                        const results = await query.getUserAllRankings(args[1]);
                        if (results) {
                            console.log('🔍 搜索结果:');
                            console.log(`👤 用户: ${results.name} (@${results.username})`);
                            console.log(`📊 总排名数: ${results.totalRankings}`);
                            console.log('\n排名详情:');
                            Object.entries(results.allRankings).forEach(([key, ranking]) => {
                                console.log(`  ${ranking.project} (${ranking.duration}): #${ranking.rank} - ${(ranking.mindshare * 100).toFixed(2)}%`);
                            });
                        } else {
                            console.log('❌ 未找到用户');
                        }
                    } else {
                        console.log('❌ 请提供用户名');
                    }
                    break;

                case 'leaderboard':
                    if (args.length >= 4) {
                        const [, category, project, duration, limit = 10] = args;
                        const leaderboard = await query.getLeaderboard(category, project, duration, parseInt(limit));
                        if (leaderboard && leaderboard.length > 0) {
                            console.log(`🏆 ${project} ${duration} 排行榜 (Top ${limit}):`);
                            leaderboard.forEach((user, index) => {
                                console.log(`  #${index + 1} ${user.name} (@${user.username}) - ${(user.mindshare * 100).toFixed(2)}%`);
                            });
                        } else {
                            console.log('❌ 未找到数据');
                        }
                    } else {
                        console.log('❌ 请提供完整参数: category project duration [limit]');
                    }
                    break;

                case 'projects':
                    const projects = await query.getAvailableProjects();
                    console.log('📋 可用项目列表:');
                    console.log('Pre TGE:', projects.pre_tge.join(', '));
                    console.log('Post TGE:', projects.post_tge.join(', '));
                    break;

                case 'stats':
                    const stats = await query.getStats();
                    console.log('📊 数据统计:');
                    console.log(`  更新时间: ${stats.lastUpdate}`);
                    console.log(`  项目总数: ${stats.totalProjects}`);
                    console.log(`  时间周期: ${stats.totalDurations}`);
                    console.log(`  成功请求: ${stats.stats.successfulRequests}`);
                    console.log(`  失败请求: ${stats.stats.failedRequests}`);
                    console.log(`  总KOL数: ${stats.stats.totalKOLs}`);
                    break;

                default:
                    console.log('❌ 未知命令');
            }
        } catch (error) {
            console.error('❌ 执行失败:', error.message);
        }
    }

    runCLI();
}
