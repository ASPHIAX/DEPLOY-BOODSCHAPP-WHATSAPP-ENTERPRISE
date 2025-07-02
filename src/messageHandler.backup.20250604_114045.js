const { TEMPLATES } = require('./boodschapp-messages');
const logger = require('./utils/logger');
const Message = require('./models/Message');
const { processReceiptWithMCP, formatReceiptResponse } = require('./receiptProcessor');

// Process inbound WhatsApp messages
async function processInboundMessage(message) {
  try {
    // CRITICAL: Ignore messages from the bot itself
    if (message.fromMe || message.isFromMe) {
      logger.info('Ignoring message from bot itself');
      return;
    }

    // Log received message
    logger.info(`Received message: ${message.body || '[Media Message]'}`);

    // Extract message details
    const messageData = {
      messageId: message.id._serialized,
      from: message.from,
      to: message.to || 'self',
      body: message.body || '[Media Message]',
      hasMedia: message.hasMedia,
      mediaType: message.type,
      isFromMe: message.fromMe,
      timestamp: message.timestamp || Date.now()
    };

    // Check if this is a receipt/kassabon
    const isReceipt = message.hasMedia && 
      (message.body?.toLowerCase().includes('bon') || 
       message.body?.toLowerCase().includes('kassabon') ||
       message.hasMedia);

    // Send appropriate auto-reply
    if (isReceipt) {
      await message.reply(TEMPLATES.receipt_processing.nl);
      logger.info(`Sent receipt acknowledgment to ${message.from}`);
      
      // Process receipt with MCP
      if (message.hasMedia) {
        try {
          const media = await message.downloadMedia();
          if (media) {
            const imagePath = `/tmp/receipt_${Date.now()}.jpg`;
            require('fs').writeFileSync(imagePath, media.data, 'base64');
            
            const ocrResult = await processReceiptWithMCP(imagePath, message.from);
            if (ocrResult.success) {
              const response = formatReceiptResponse(ocrResult);
              await message.reply(response);
              
              // Save receipt data
              messageData.receiptData = ocrResult;
              messageData.processed = true;
              
              // Schedule payment link message
              setTimeout(async () => {
                await message.reply('💳 De betaallink wordt binnenkort toegevoegd...');
              }, 2000);
            }
            
            // Clean up
            try { require('fs').unlinkSync(imagePath); } catch (e) {}
          }
        } catch (error) {
          logger.error('Receipt processing error:', error);
          await message.reply('Sorry, er ging iets mis. Probeer het opnieuw.');
        }
      }
    } else if (message.body?.toLowerCase().includes('help')) {
      await message.reply(TEMPLATES.welcome.nl);
    } else {
      await message.reply(TEMPLATES.welcome.nl);
    }

    // Save message directly to MongoDB
    try {
      const newMessage = new Message(messageData);
      await newMessage.save();
      logger.info(`Message saved to MongoDB directly`);
    } catch (saveError) {
      logger.error(`Failed to save message: ${saveError.message}`);
      // Continue processing even if save fails
    }

  } catch (error) {
    logger.error(`Error processing inbound message: ${error.message}`);
  }
}

module.exports = { processInboundMessage };