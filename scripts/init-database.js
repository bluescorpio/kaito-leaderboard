const DatabaseManager = require('../database/DatabaseManager');

/**
 * 数据库初始化和数据导入脚本
 */
async function initializeDatabase() {
  const dbManager = new DatabaseManager();
  
  try {
    console.log('🚀 开始数据库初始化流程...');
    
    // 1. 初始化数据库结构
    await dbManager.initialize();
    
    // 2. 导入 JSON 数据
    const importResult = await dbManager.importFromJson();
    
    // 3. 显示统计信息
    const stats = await dbManager.getStats();
    console.log('📊 数据库统计信息:');
    console.log(`   - 总用户数: ${stats.users}`);
    console.log(`   - 总项目数: ${stats.projects}`);
    console.log(`   - 总排名记录: ${stats.rankings}`);
    console.log(`   - 最后更新: ${stats.lastUpdate}`);
    
    console.log('✅ 数据库初始化完成！');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    process.exit(1);
  } finally {
    await dbManager.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
