const knex = require('knex');
const path = require('path');

// 数据库配置
const dbConfig = {
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '..', 'data', 'kaito.sqlite')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'seeds')
  }
};

// 创建数据库连接
const db = knex(dbConfig);

module.exports = db;
