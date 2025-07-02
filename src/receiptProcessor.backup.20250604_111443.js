const { exec } = require('child_process');
const util = require('util');
const fs_promises = require('fs').promises;
const path = require('path');
const execPromise = util.promisify(exec);

async function processReceiptWithMCP(imagePath, userId) {
  console.log('[Receipt] Processing with REAL MCP...');
  console.log('[Receipt] Image path:', imagePath);
  console.log('[Receipt] User ID:', userId);
  
  try {
    // Read image file and convert to base64
    const imageBuffer = await fs_promises.readFile(imagePath);
    const imageData = imageBuffer.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    console.log('[Receipt] Image size:', imageBuffer.length, 'bytes');
    console.log('[Receipt] MIME type:', mimeType);
    
    // Prepare MCP request
    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'process_receipt',
        arguments: {
          userId: userId,
          imageData: imageData,
          mimeType: mimeType
        }
      },
      id: Date.now()
    };
    
    // Call Receipt MCP via docker exec
    const requestJson = JSON.stringify(mcpRequest);
    const mcpCommand = `echo '${requestJson}' | docker exec -i BOODSCHAPP-RECEIPT-MCP node server.js`;
    console.log('[Receipt] Calling Receipt MCP...');
    
    const { stdout, stderr } = await execPromise(mcpCommand, { maxBuffer: 50 * 1024 * 1024 }); // 50MB buffer
    
    if (stderr) {
      console.error('[Receipt] MCP stderr:', stderr);
    }
    
    // Parse the response - MCP returns line-delimited JSON
    const lines = stdout.trim().split('\n');
    let response = null;
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.id === mcpRequest.id) {
          response = parsed;
          break;
        }
      } catch (e) {
        // Ignore non-JSON lines
      }
    }
    
    if (!response) {
      console.error('[Receipt] No valid response from MCP');
      throw new Error('No valid response from Receipt MCP');
    }
    
    if (response.error) {
      console.error('[Receipt] MCP error:', response.error);
      throw new Error(response.error.message || 'MCP error');
    }
    
    if (!response.result || !response.result.content) {
      console.error('[Receipt] Invalid MCP response structure:', response);
      throw new Error('Invalid MCP response structure');
    }
    
    // Parse the actual receipt data from MCP response
    const receiptData = response.result.content[0];
    console.log('[Receipt] MCP response:', JSON.stringify(receiptData, null, 2));
    
    // Transform MCP response to our format
    return {
      success: true,
      store: receiptData.store || 'Onbekende winkel',
      date: receiptData.date || new Date().toLocaleDateString('nl-NL'),
      items: receiptData.items || [],
      total: receiptData.total || 0,
      savings: receiptData.savings || 0,
      raw_ocr: receiptData.raw_text || ''
    };
    
  } catch (error) {
    console.error('[Receipt] Error processing with MCP:', error);
    
    // Fallback to mock data if MCP fails
    console.log('[Receipt] Falling back to mock data');
    return {
      success: false,
      error: error.message,
      // Mock fallback data
      store: 'Albert Heijn',
      date: new Date().toLocaleDateString('nl-NL'),
      items: [
        { name: 'Melk', price: 1.29 },
        { name: 'Brood', price: 2.15 },
        { name: 'Kaas', price: 4.99 }
      ],
      total: 8.43,
      savings: 1.20
    };
  }
}

function formatReceiptResponse(data) {
  let msg = '🛒 *Kassabon Verwerkt!*\n\n';
  msg += '📍 Winkel: ' + data.store + '\n';
  msg += '📅 Datum: ' + data.date + '\n\n';
  
  // Add items if available
  if (data.items && data.items.length > 0) {
    msg += '📝 *Producten:*\n';
    data.items.slice(0, 5).forEach(item => {
      msg += `• ${item.name}: €${(item.price || 0).toFixed(2)}\n`;
    });
    if (data.items.length > 5) {
      msg += `... en ${data.items.length - 5} andere producten\n`;
    }
    msg += '\n';
  }
  
  msg += '💰 *Totaal: €' + (data.total || 0).toFixed(2) + '*\n';
  if (data.savings > 0) {
    msg += '✨ *Besparing: €' + data.savings.toFixed(2) + '*\n';
  }
  
  if (data.error) {
    msg += '\n⚠️ *Let op:* Er was een probleem met het verwerken. We gebruiken tijdelijke testdata.\n';
  }
  
  return msg;
}

module.exports = { processReceiptWithMCP, formatReceiptResponse };
