const db = require('./db');
const fs = require('fs').promises;
const path = require('path');

/**
 * 数据库管理器类
 */
class DatabaseManager {
  constructor() {
    this.db = db;
  }

  /**
   * 初始化数据库
   */
  async initialize() {
    try {
      console.log('🔧 初始化数据库...');
      
      // 确保数据目录存在
      const dataDir = path.join(__dirname, '..', 'data');
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }
      
      // 运行迁移
      await this.db.migrate.latest();
      console.log('✅ 数据库初始化完成');
      
      return true;
    } catch (error) {
      console.error('❌ 数据库初始化失败:', error);
      throw error;
    }
  }

  /**
   * 从 JSON 文件导入数据到数据库
   */
  async importFromJson() {
    try {
      console.log('📥 开始导入 JSON 数据到数据库...');
      
      const kolData = JSON.parse(
        await fs.readFile(path.join(__dirname, '..', 'kol.json'), 'utf8')
      );
      
      const startTime = Date.now();
      let importedUsers = 0;
      let importedRankings = 0;
      let importedProjects = 0;

      // 使用事务确保数据一致性
      await this.db.transaction(async (trx) => {
        // 导入项目数据
        const projects = new Map();
        const categories = kolData.categories || {};
        
        for (const [categoryKey, categoryData] of Object.entries(categories)) {
          for (const [projectName, projectData] of Object.entries(categoryData)) {
            if (!projects.has(projectName)) {
              const [projectId] = await trx('projects')
                .insert({
                  project_name: projectName,
                  category: categoryKey,
                  is_active: true
                })
                .onConflict('project_name')
                .merge(['category', 'updated_at']);
              
              projects.set(projectName, projectId || (await trx('projects').where('project_name', projectName).first()).id);
              importedProjects++;
            }
          }
        }

        // 导入用户和排名数据
        const users = new Map();
        
        for (const [categoryKey, categoryData] of Object.entries(categories)) {
          for (const [projectName, projectData] of Object.entries(categoryData)) {
            const projectId = projects.get(projectName);
            
            for (const [duration, rankings] of Object.entries(projectData)) {
              if (Array.isArray(rankings)) {
                for (const ranking of rankings) {
                  const username = ranking.username;
                  
                  // 确保用户存在
                  if (!users.has(username)) {
                    try {
                      const [userId] = await trx('kol_users')
                        .insert({
                          username: username,
                          name: ranking.name,
                          bio: ranking.bio,
                          icon: ranking.icon,
                          twitter_user_url: ranking.twitter_user_url,
                          follower_count: ranking.follower_count || 0,
                          smart_follower_count: ranking.smart_follower_count || 0,
                          following_count: ranking.following_count || 0,
                          smart_following_count: ranking.smart_following_count || 0
                        })
                        .onConflict('username')
                        .merge([
                          'name', 'bio', 'icon', 'twitter_user_url',
                          'follower_count', 'smart_follower_count',
                          'following_count', 'smart_following_count',
                          'updated_at'
                        ]);
                      
                      users.set(username, userId || (await trx('kol_users').where('username', username).first()).id);
                      importedUsers++;
                    } catch (error) {
                      // 如果用户已存在，获取其ID
                      const existingUser = await trx('kol_users').where('username', username).first();
                      if (existingUser) {
                        users.set(username, existingUser.id);
                      }
                    }
                  }
                  
                  const userId = users.get(username);
                  
                  // 插入排名数据
                  await trx('kol_rankings')
                    .insert({
                      user_id: userId,
                      project_id: projectId,
                      duration: duration,
                      rank: parseInt(ranking.rank),
                      mindshare: ranking.mindshare || 0,
                      community_score: ranking.community_score || 0,
                      data_date: new Date(kolData.lastUpdate || Date.now())
                    })
                    .onConflict(['user_id', 'project_id', 'duration', 'data_date'])
                    .merge(['rank', 'mindshare', 'community_score', 'updated_at']);
                  
                  importedRankings++;
                }
              }
            }
          }
        }

        // 记录导入日志
        await trx('data_updates').insert({
          update_type: 'full',
          source: 'json_import',
          records_updated: importedRankings,
          details: JSON.stringify({
            users: importedUsers,
            projects: importedProjects,
            rankings: importedRankings
          }),
          started_at: new Date(startTime),
          completed_at: new Date(),
          status: 'success'
        });
      });

      const duration = Date.now() - startTime;
      console.log(`✅ JSON 数据导入完成！`);
      console.log(`📊 统计信息:`);
      console.log(`   - 用户: ${importedUsers}`);
      console.log(`   - 项目: ${importedProjects}`);
      console.log(`   - 排名记录: ${importedRankings}`);
      console.log(`   - 耗时: ${duration}ms`);
      
      return {
        users: importedUsers,
        projects: importedProjects,
        rankings: importedRankings,
        duration
      };
    } catch (error) {
      console.error('❌ JSON 数据导入失败:', error);
      throw error;
    }
  }

  /**
   * 获取项目排行榜
   */
  async getLeaderboard(projectName, duration = '7d', limit = 10) {
    try {
      const results = await this.db('kol_rankings')
        .join('kol_users', 'kol_rankings.user_id', 'kol_users.id')
        .join('projects', 'kol_rankings.project_id', 'projects.id')
        .select(
          'kol_users.username',
          'kol_users.name',
          'kol_users.bio',
          'kol_users.icon',
          'kol_users.twitter_user_url',
          'kol_users.follower_count',
          'kol_users.smart_follower_count',
          'kol_users.following_count',
          'kol_users.smart_following_count',
          'kol_rankings.rank',
          'kol_rankings.mindshare',
          'kol_rankings.community_score',
          'projects.project_name'
        )
        .where('projects.project_name', projectName)
        .where('kol_rankings.duration', duration)
        .orderBy('kol_rankings.rank', 'asc')
        .limit(limit);

      return results;
    } catch (error) {
      console.error('❌ 获取排行榜失败:', error);
      throw error;
    }
  }

  /**
   * 搜索用户
   */
  async searchUser(username) {
    try {
      const userRankings = await this.db('kol_users')
        .leftJoin('kol_rankings', 'kol_users.id', 'kol_rankings.user_id')
        .leftJoin('projects', 'kol_rankings.project_id', 'projects.id')
        .select(
          'kol_users.*',
          'kol_rankings.rank',
          'kol_rankings.mindshare',
          'kol_rankings.community_score',
          'kol_rankings.duration',
          'projects.project_name'
        )
        .where('kol_users.username', 'like', `%${username}%`)
        .orderBy('kol_rankings.rank', 'asc');

      if (userRankings.length === 0) {
        return null;
      }

      // 组织数据结构
      const user = {
        username: userRankings[0].username,
        name: userRankings[0].name,
        bio: userRankings[0].bio,
        icon: userRankings[0].icon,
        twitter_user_url: userRankings[0].twitter_user_url,
        follower_count: userRankings[0].follower_count,
        smart_follower_count: userRankings[0].smart_follower_count,
        following_count: userRankings[0].following_count,
        smart_following_count: userRankings[0].smart_following_count,
        rankings: {}
      };

      // 按项目和时间段组织排名数据
      userRankings.forEach(ranking => {
        if (ranking.project_name) {
          if (!user.rankings[ranking.project_name]) {
            user.rankings[ranking.project_name] = {};
          }
          user.rankings[ranking.project_name][ranking.duration] = {
            rank: ranking.rank,
            mindshare: ranking.mindshare,
            community_score: ranking.community_score
          };
        }
      });

      return user;
    } catch (error) {
      console.error('❌ 搜索用户失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有项目列表
   */
  async getProjects() {
    try {
      return await this.db('projects')
        .select('*')
        .where('is_active', true)
        .orderBy('project_name');
    } catch (error) {
      console.error('❌ 获取项目列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats() {
    try {
      const [userCount] = await this.db('kol_users').count('* as count');
      const [projectCount] = await this.db('projects').count('* as count');
      const [rankingCount] = await this.db('kol_rankings').count('* as count');
      const [lastUpdate] = await this.db('data_updates')
        .select('completed_at')
        .orderBy('completed_at', 'desc')
        .limit(1);

      return {
        users: userCount.count,
        projects: projectCount.count,
        rankings: rankingCount.count,
        lastUpdate: lastUpdate?.completed_at
      };
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async close() {
    await this.db.destroy();
  }
}

module.exports = DatabaseManager;
