const { Pool } = require('pg');
const logger = require('../utils/logger');

class SimplePostgreSQLMessageService {
  
  async saveMessage(messageData) {
    const pool = new Pool({
      host: '192.168.68.94',
      port: 19201,
      database: 'boodschapp_production',
      user: 'xdai-ai',
      password: 'postgres',
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      
      const query = `
        INSERT INTO messaging_system.message_history (
          phone_number, 
          message_content, 
          message_type, 
          whatsapp_message_id,
          delivery_status,
          webhook_data,
          metadata,
          sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING message_id, created_at
      `;

      const values = [
        messageData.from,
        messageData.body || '[Media Message]',
        messageData.hasMedia ? 'media_inbound' : 'text_inbound',
        messageData.messageId,
        'pending',
        JSON.stringify({
          to_number: messageData.to,
          has_media: messageData.hasMedia,
          media_url: messageData.mediaUrl,
          media_type: messageData.mediaType,
          is_from_me: messageData.isFromMe
        }),
        JSON.stringify({
          original_timestamp: messageData.timestamp,
          processed_at: new Date().toISOString(),
          receipt_data: messageData.receiptData || null,
        }),
        new Date(messageData.timestamp || Date.now())
      ];

      const result = await client.query(query, values);
      logger.info(`Message saved to PostgreSQL: ${result.rows[0].message_id}`);
      
      client.release();
      await pool.end();
      
      return {
        message_id: result.rows[0].message_id,
        created_at: result.rows[0].created_at
      };

    } catch (error) {
      logger.error(`Error saving message to PostgreSQL: ${error.message}`);
      await pool.end();
      throw error;
    }
  }

  async checkFrequencyControl(_phoneNumber) {
    return { allowed: true, isNewUser: true };
  }
}

module.exports = new SimplePostgreSQLMessageService();