// Enhanced inbound message handler with receipt processing
const Message = require("./models/Message");
const logger = require("./utils/logger");

// Process inbound WhatsApp messages
async function processInboundMessage(message) {
  try {
    // Log received message - ADDED FOR DEBUGGING
    logger.info(`Received message: ${message.body || "[Media Message]"}`);

    // Extract message details
    const messageData = {
      messageId: message.id._serialized,
      from: message.from,
      to: message.to || "self",
      body: message.body || "[Media Message]",
      hasMedia: message.hasMedia,
      mediaType: message.type,
      isFromMe: message.fromMe,
      timestamp: new Date(message.timestamp * 1000)
    };

    // Handle media messages (receipts)
    if (message.hasMedia) {
      logger.info("Processing media message - potential receipt");
      const media = await message.downloadMedia();
      messageData.mediaUrl = `media_${Date.now()}_${message.from}`;
    }

    // Save message to MongoDB
    const savedMessage = await Message.create(messageData);
    logger.info(`Message saved to MongoDB: ${savedMessage._id}`);

  } catch (error) {
    logger.error(`Error processing inbound message: ${error.message}`);
  }
}

module.exports = { processInboundMessage };