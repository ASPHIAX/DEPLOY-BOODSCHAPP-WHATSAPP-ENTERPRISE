const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
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
        
        // Create form data
        const formData = new FormData();
        formData.append('receipt_image', imageBuffer, {
            filename: 'receipt.jpg',
            contentType: 'image/jpeg'
        });
        formData.append('user_id', userId);

        const endpoint = 'http://192.168.68.94:8522/process-receipt';
        
        logger.info('Sending request to Upload Interface', {
            endpoint,
            payloadSize: imageBuffer.length
        });

        const response = await axios.post(endpoint, formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`
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
            userId
        });
        
        return {
            success: false,
            error: error.message,
            processed_at: new Date().toISOString()
        };
    }
}

module.exports = { processReceiptWithUploadInterface };