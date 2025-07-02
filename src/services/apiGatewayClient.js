const axios = require('axios');
const logger = require('../utils/logger');

class ApiGatewayClient {
  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL || 'http://BOSS-API-GATEWAY-DEV-V3:9100';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async saveMessage(messageData) {
    try {
      logger.info(`Saving message via API Gateway: ${this.baseURL}/api/mongo/messages`);
      
      const record = {
        message_id: messageData.messageId,
        from_number: messageData.from,
        to_number: messageData.to || 'self',
        body: messageData.body,
        timestamp: messageData.timestamp || new Date().toISOString(),
        has_media: messageData.hasMedia || false,
        media_url: messageData.mediaUrl,
        media_type: messageData.mediaType,
        is_from_me: messageData.isFromMe,
        status: messageData.status || 'received'
      };

      // Use MongoDB MCP endpoint
      const response = await this.client.post('/api/mongo/messages', {
        database: 'boodschapp',
        collection: 'whatsapp_messages',
        document: record
      });

      logger.info(`Message saved via API Gateway: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      logger.error(`API Gateway error: ${error.message}`);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getMessages(filter = {}) {
    try {
      const response = await this.client.get('/api/mongo/messages', {
        params: {
          database: 'boodschapp',
          collection: 'whatsapp_messages',
          filter: JSON.stringify(filter)
        }
      });
      return response.data;
    } catch (error) {
      logger.error(`API Gateway error getting messages: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ApiGatewayClient();