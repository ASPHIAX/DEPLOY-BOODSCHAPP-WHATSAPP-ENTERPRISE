const axios = require('axios');
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
        const imageBase64 = imageBuffer.toString('base64');
        
        // Create JSON payload for /process-receipt endpoint
        const payload = {
            image_data: imageBase64,
            original_filename: 'receipt.jpg',
            compressed_size: imageBuffer.length
        };

        const endpoint = 'http://192.168.68.94:8522/process-receipt';
        
        logger.info('Sending request to Upload Interface', {
            endpoint,
            payloadSize: imageBuffer.length,
            base64Size: imageBase64.length,
            apiContract: 'process-receipt JSON'
        });

        const response = await axios.post(endpoint, payload, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        logger.info('Upload Interface response received', {
            status: response.status,
            dataSize: JSON.stringify(response.data).length
        });

        return {
            success: true,
            data: response.data,
            processed_at: new Date().toISOString()
        };

    } catch (error) {
        logger.error('Error processing receipt with Upload Interface', {
            error: error.message,
            imagePath,
            userId,
            response: error.response ? {
                status: error.response.status,
                data: error.response.data
            } : null
        });
        
        return {
            success: false,
            error: error.message,
            processed_at: new Date().toISOString()
        };
    }
}

module.exports = { processReceiptWithUploadInterface };