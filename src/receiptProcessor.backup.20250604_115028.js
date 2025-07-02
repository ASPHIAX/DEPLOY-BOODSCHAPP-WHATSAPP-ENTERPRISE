const https = require('https');
const fs_promises = require('fs').promises;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyBx7uAKU-7Mp341pfebuMAe64hi9Z3Go2o';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Call Google Vision API using REST with API key
async function callVisionAPI(imageData) {
  const request = {
    requests: [{
      image: {
        content: imageData
      },
      features: [{
        type: 'TEXT_DETECTION',
        maxResults: 1
      }]
    }]
  };

  return new Promise((resolve, reject) => {
    const url = new URL(VISION_API_URL);
    url.searchParams.append('key', GOOGLE_API_KEY);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(request))
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(`Vision API error: ${res.statusCode} - ${data}`));
          } else if (result.error) {
            reject(new Error(`Vision API error: ${result.error.message}`));
          } else {
            resolve(result.responses[0]);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(request));
    req.end();
  });
}

// Dutch receipt parser
function parseReceipt(text) {
  const lines = text.split('\n');
  const result = {
    store: '',
    total: 0,
    date: new Date().toLocaleDateString('nl-NL'),
    items: [],
    discount: 0,
    subtotal: 0
  };
  
  // Enhanced parsing for Dutch receipts
  for (const line of lines) {
    // Store detection
    if (line.match(/albert\s*heijn|jumbo|plus|lidl|aldi|coop|spar|dirk|vomar|deen/i)) {
      result.store = line.trim();
    }
    
    // Date detection (Dutch format)
    const dateMatch = line.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (dateMatch) {
      const [_, day, month, year] = dateMatch;
      const fullYear = year.length === 2 ? '20' + year : year;
      result.date = new Date(`${fullYear}-${month}-${day}`).toLocaleDateString('nl-NL');
    }
    
    // Total detection
    if (line.match(/totaal|total|te betalen|sum/i)) {
      const amountMatch = line.match(/€?\s*(\d+)[,\.](\d{2})/);
      if (amountMatch) {
        result.total = parseFloat(amountMatch[1] + '.' + amountMatch[2]);
      }
    }
    
    // Discount detection
    if (line.match(/korting|discount|actie/i)) {
      const amountMatch = line.match(/€?\s*(\d+)[,\.](\d{2})/);
      if (amountMatch) {
        result.discount = parseFloat(amountMatch[1] + '.' + amountMatch[2]);
      }
    }
    
    // Product detection
    const productMatch = line.match(/^(.+?)\s+€?\s*(\d+)[,\.](\d{2})\s*$/);
    if (productMatch && !line.match(/totaal|korting|btw|bon/i)) {
      result.items.push({
        name: productMatch[1].trim(),
        price: parseFloat(productMatch[2] + '.' + productMatch[3])
      });
    }
  }
  
  // Calculate subtotal if we have items
  if (result.items.length > 0) {
    result.subtotal = result.items.reduce((sum, item) => sum + item.price, 0);
  }
  
  // If no store detected, try to extract from text
  if (!result.store) {
    const storePatterns = [
      'ALBERT HEIJN', 'JUMBO', 'PLUS', 'LIDL', 'ALDI', 
      'COOP', 'SPAR', 'DIRK', 'VOMAR', 'DEEN'
    ];
    for (const pattern of storePatterns) {
      if (text.toUpperCase().includes(pattern)) {
        result.store = pattern;
        break;
      }
    }
  }
  
  // Default store if still not found
  if (!result.store) {
    result.store = 'Supermarkt';
  }
  
  // If no total found, use subtotal
  if (result.total === 0 && result.subtotal > 0) {
    result.total = result.subtotal - result.discount;
  }
  
  return result;
}

async function processReceiptWithMCP(imagePath, userId) {
  console.log('[Receipt] Processing with Google Vision API...');
  console.log('[Receipt] Image path:', imagePath);
  console.log('[Receipt] User ID:', userId);
  
  try {
    // Read image file and convert to base64
    const imageBuffer = await fs_promises.readFile(imagePath);
    const imageData = imageBuffer.toString('base64');
    
    console.log('[Receipt] Image size:', imageBuffer.length, 'bytes');
    
    // Call Google Vision API
    console.log('[Receipt] Calling Google Vision API...');
    const visionResponse = await callVisionAPI(imageData);
    
    const fullText = visionResponse.textAnnotations?.[0]?.description || '';
    
    if (!fullText) {
      throw new Error('No text detected in image');
    }
    
    console.log('[Receipt] Extracted text:', fullText.substring(0, 100) + '...');
    
    // Parse receipt
    const parsed = parseReceipt(fullText);
    
    console.log('[Receipt] Parsed receipt:', {
      store: parsed.store,
      itemCount: parsed.items.length,
      total: parsed.total
    });
    
    return {
      success: true,
      receiptId: 'RCP-' + Date.now(),
      store: parsed.store,
      date: parsed.date,
      items: parsed.items,
      subtotal: parsed.subtotal,
      discount: parsed.discount,
      total: parsed.total,
      savings: parsed.discount
    };
    
  } catch (error) {
    console.error('[Receipt] Error processing with Vision API:', error.message);
    
    // On error, return structured error response
    return {
      success: false,
      error: error.message,
      receiptId: 'RCP-' + Date.now(),
      store: 'Onbekend',
      date: new Date().toLocaleDateString('nl-NL'),
      items: [],
      subtotal: 0,
      discount: 0,
      total: 0,
      savings: 0
    };
  }
}

function formatReceiptResponse(data) {
  let msg = '🛒 **Kassabon Verwerkt!**\n\n';
  msg += '📍 Winkel: ' + data.store + '\n';
  msg += '📅 Datum: ' + data.date + '\n\n';
  
  // Add items if available
  if (data.items && data.items.length > 0) {
    msg += '📝 **Producten:**\n';
    data.items.slice(0, 10).forEach(item => {
      msg += `• ${item.name}: €${(item.price || 0).toFixed(2)}\n`;
    });
    if (data.items.length > 10) {
      msg += `... en nog ${data.items.length - 10} producten\n`;
    }
  }
  
  msg += '\n💰 Subtotaal: €' + (data.subtotal || 0).toFixed(2) + '\n';
  
  if (data.discount && data.discount > 0) {
    msg += '🎯 Korting: €' + data.discount.toFixed(2) + '\n';
  }
  
  msg += '💳 **Totaal: €' + (data.total || 0).toFixed(2) + '**\n\n';
  
  if (data.savings && data.savings > 0) {
    msg += '✅ Je hebt €' + data.savings.toFixed(2) + ' bespaard!\n';
  } else if (!data.success) {
    msg += '⚠️ De kassabon kon niet volledig worden verwerkt.\n';
  }
  
  msg += '📊 Bekijk meer besparingsmogelijkheden in het dashboard.';
  
  return msg;
}

module.exports = { processReceiptWithMCP, formatReceiptResponse };
