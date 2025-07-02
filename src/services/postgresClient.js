const { Pool } = require('pg');
const logger = require('../utils/logger');

class PostgreSQLClient {
  constructor() {
    this.pool = new Pool({
      host: '172.19.0.3',
      port: 5432,
      database: 'boodschapp_production',
      user: 'xdai-ai',
      password: 'postgres',
      connectionTimeoutMillis: 3000,
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      logger.info('Connected to PostgreSQL: 172.19.0.3:5432/boodschapp_production');
      return true;
    } catch (error) {
      logger.error(`PostgreSQL connection failed: ${error.message}`);
      throw error;
    }
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  async end() {
    await this.pool.end();
    logger.info('PostgreSQL connection pool closed');
  }
}

module.exports = new PostgreSQLClient();