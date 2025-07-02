const { TEMPLATES, templateEngine } = require('./boodschapp-messages');
const logger = require('./utils/logger');
const postgresClient = require('./services/postgresClient');
const postgresMessageService = require('./services/postgresMessageService');
const { processReceiptWithUploadInterface } = require('./uploadIntegration');
const { formatReceiptResponse } = require('./receiptProcessor');
const { createPaymentLink } = require('./paymentProcessor');

// Initialize PostgreSQL connection
let postgresConnected = false;

async function initializePostgreSQL() {
  if (!postgresConnected) {
    try {
      await postgresClient.connect();
      postgresConnected = true;
      logger.info('PostgreSQL initialized for message handling');
    } catch (error) {
      logger.error(`Failed to initialize PostgreSQL: ${error.message}`);
    }
  }
}

// Process inbound WhatsApp messages
async function processInboundMessage(message) {
  try {
    // Ensure PostgreSQL is connected
    await initializePostgreSQL();

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

    // Check frequency control for free tier compliance
    const frequencyCheck = await postgresMessageService.checkFrequencyControl(messageData.from);
    
    if (!frequencyCheck.allowed) {
      logger.warn(`Message blocked by frequency control: ${frequencyCheck.reason}`);
      // Could send a rate limit message here if needed
      return;
    }

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
            
            const ocrResult = await processReceiptWithUploadInterface(imagePath, message.from);
            if (ocrResult.success) {
              const response = formatReceiptResponse(ocrResult);
              await message.reply(response);
              
              // Save receipt data
              messageData.receiptData = ocrResult;
              messageData.processed = true;
              
              // Generate payment link
              setTimeout(async () => {
                try {
                  const paymentResult = await createPaymentLink(ocrResult);
                  if (paymentResult.success) {
                    const paymentMsg = templateEngine.formatPaymentResponse(paymentResult);
                    await message.reply(paymentMsg);
                  } else {
                    await message.reply('💳 De betaallink wordt binnenkort toegevoegd...');
                  }
                } catch (error) {
                  logger.error('Payment link generation error:', error);
                  await message.reply('💳 De betaallink wordt binnenkort toegevoegd...');
                }
              }, 3000);
            }
            
            // Clean up
            try { require('fs').unlinkSync(imagePath); } catch {}
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

    // Save message to PostgreSQL
    try {
      const result = await postgresMessageService.saveMessage(messageData);
      logger.info(`Message saved to PostgreSQL with ID: ${result.message_id}`);
    } catch (saveError) {
      logger.error(`Failed to save message to PostgreSQL: ${saveError.message}`);
      // Continue processing even if save fails
    }

  } catch (error) {
    logger.error(`Error processing inbound message: ${error.message}`);
  }
}

module.exports = { processInboundMessage, initializePostgreSQL };