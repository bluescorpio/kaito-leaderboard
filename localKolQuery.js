// 从本地JSON文件加载KOL数据的查询类
class LocalKolDataQuery {
    constructor() {
        this.data = null;
        this.isLoaded = false;
    }

    // 从服务器加载JSON数据
    async loadData() {
        try {
            const response = await fetch('/kol.json');
            if (!response.ok) {
                // 如果kol.json不存在，尝试加载测试数据
                const testResponse = await fetch('/test-kol.json');
                if (!testResponse.ok) {
                    throw new Error('无法加载KOL数据文件');
                }
                this.data = await testResponse.json();
            } else {
                this.data = await response.json();
            }
            this.isLoaded = true;
            console.log(`✅ KOL数据加载成功! 更新时间: ${this.data.lastUpdate}`);
            return true;
        } catch (error) {
            console.error('❌ 加载KOL数据失败:', error.message);
            return false;
        }
    }

    // 确保数据已加载
    async ensureDataLoaded() {
        if (!this.isLoaded) {
            const loaded = await this.loadData();
            if (!loaded) {
                throw new Error('数据未能正确加载');
            }
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

    // 获取用户的完整排名信息
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
            bio: userResults[0].bio,
            follower_count: userResults[0].follower_count,
            smart_follower_count: userResults[0].smart_follower_count
        };

        userResults.forEach(result => {
            const key = `${result.category}_${result.project}_${result.duration}`;
            rankings[key] = {
                category: result.category,
                project: result.project,
                duration: result.duration,
                rank: result.rank,
                mindshare: result.mindshare,
                score: result.mindshare, // 兼容原有代码
                community_score: result.community_score
            };
        });

        return {
            ...userInfo,
            allRankings: rankings,
            totalRankings: Object.keys(rankings).length,
            // 兼容原有代码的字段
            currentRank: userResults[0].rank,
            previousRank: userResults[0].rank, // 暂时使用相同值
            yapsScore: userResults[0].mindshare * 100,
            previousScore: userResults[0].mindshare * 100 // 暂时使用相同值
        };
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

    // 获取数据统计信息
    async getStats() {
        await this.ensureDataLoaded();
        
        return {
            lastUpdate: this.data.lastUpdate,
            totalKOLs: this.data.stats?.totalKOLs || 0,
            successfulRequests: this.data.stats?.successfulRequests || 0,
            failedRequests: this.data.stats?.failedRequests || 0
        };
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
}

// 导出查询类
window.LocalKolDataQuery = LocalKolDataQuery;
