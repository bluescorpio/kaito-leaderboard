/**
 * 数据库表结构初始化
 */

exports.up = function(knex) {
  return Promise.all([
    // KOL 用户表
    knex.schema.createTable('kol_users', function(table) {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('name');
      table.text('bio');
      table.string('icon');
      table.string('twitter_user_url');
      table.integer('follower_count').defaultTo(0);
      table.integer('smart_follower_count').defaultTo(0);
      table.integer('following_count').defaultTo(0);
      table.integer('smart_following_count').defaultTo(0);
      table.timestamps(true, true);
      
      // 索引
      table.index('username');
      table.index('follower_count');
      table.index('smart_follower_count');
    }),

    // 项目表
    knex.schema.createTable('projects', function(table) {
      table.increments('id').primary();
      table.string('project_name').unique().notNullable();
      table.string('category'); // pre_tge, post_tge
      table.string('blockchain'); // SOL, EVM, etc.
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      // 索引
      table.index('project_name');
      table.index('category');
      table.index(['category', 'is_active']);
    }),

    // KOL 排名数据表
    knex.schema.createTable('kol_rankings', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('kol_users').onDelete('CASCADE');
      table.integer('project_id').unsigned().references('id').inTable('projects').onDelete('CASCADE');
      table.string('duration'); // 7d, 30d, 90d, 180d, 365d
      table.integer('rank');
      table.decimal('mindshare', 15, 10);
      table.decimal('community_score', 15, 10);
      table.timestamp('data_date').notNullable();
      table.timestamps(true, true);
      
      // 索引
      table.index(['project_id', 'duration', 'rank']);
      table.index(['user_id', 'project_id', 'duration']);
      table.index('data_date');
      table.index(['project_id', 'duration', 'data_date']);
      
      // 唯一约束
      table.unique(['user_id', 'project_id', 'duration', 'data_date']);
    }),

    // ICT 成员表
    knex.schema.createTable('ict_members', function(table) {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('name');
      table.boolean('is_active').defaultTo(true);
      table.text('notes');
      table.timestamps(true, true);
      
      // 索引
      table.index('username');
      table.index('is_active');
    }),

    // 数据更新日志表
    knex.schema.createTable('data_updates', function(table) {
      table.increments('id').primary();
      table.string('update_type'); // 'full', 'partial', 'project'
      table.string('source'); // 'api', 'manual'
      table.integer('records_updated');
      table.text('details');
      table.timestamp('started_at');
      table.timestamp('completed_at');
      table.string('status'); // 'success', 'failed', 'partial'
      table.timestamps(true, true);
      
      // 索引
      table.index('update_type');
      table.index('completed_at');
      table.index('status');
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('data_updates'),
    knex.schema.dropTableIfExists('ict_members'),
    knex.schema.dropTableIfExists('kol_rankings'),
    knex.schema.dropTableIfExists('projects'),
    knex.schema.dropTableIfExists('kol_users')
  ]);
};
