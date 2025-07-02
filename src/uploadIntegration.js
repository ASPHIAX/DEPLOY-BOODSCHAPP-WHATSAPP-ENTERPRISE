const fetch = require('node-fetch');
const fs = require('fs');
const logger = require('./utils/logger');

async function processReceiptWithUploadInterface(imagePath, userId) {
    try {
        logger.info('Starting receipt processing with Upload Interface', {
            imagePath,
            userId,
            timestamp: new Date().toISOString()
        });

        // Read the image file
        if (!fs.existsSync(imagePath)) {
            throw new Error(`Image file not found: ${imagePath}`);
        }

        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Prepare the JSON payload
        const payload = {
            image: base64Image,
            format: 'base64',
            userId: userId,
            source: 'whatsapp',
            timestamp: new Date().toISOString()
        };

        logger.info('Sending request to Upload Interface', {
            payloadSize: JSON.stringify(payload).length,
            endpoint: 'http://192.168.68.94:8522/process-receipt'
        });

        // Send to upload interface
        const response = await fetch('http://192.168.68.94:8522/process-receipt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload Interface responded with ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        
        logger.info('Upload Interface processing completed', {
            status: result.status,
            receiptId: result.receiptId || 'N/A'
        });

        return {
            success: true,
            data: result,
            source: 'upload-interface'
        };

    } catch (error) {
        logger.error('Error processing receipt with Upload Interface', {
            error: error.message,
            imagePath,
            userId
        });
        
        return {
            success: false,
            error: error.message,
            source: 'upload-interface'
        };
    }
}

module.exports = {
    processReceiptWithUploadInterface
};