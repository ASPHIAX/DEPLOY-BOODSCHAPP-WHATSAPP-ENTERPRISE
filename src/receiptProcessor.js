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

// Enhanced Dutch receipt parser
function parseDutchReceipt(text) {
  console.log('[Receipt Parser] ===== PARSING RECEIPT =====');
  console.log('[Receipt Parser] Full OCR text:');
  console.log(text);
  console.log('[Receipt Parser] =========================');
  
  const result = {
    store: '',
    date: new Date().toLocaleDateString('nl-NL'),
    items: [],
    subtotal: 0,
    discount: 0,
    total: 0
  };
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  console.log('[Receipt Parser] Total lines:', lines.length);
  
  // Store detection
  const storePatterns = [
    'ALBERT HEIJN', 'JUMBO', 'PLUS', 'LIDL', 'ALDI', 
    'COOP', 'SPAR', 'DIRK', 'VOMAR', 'DEEN', 'HOOGVLIET',
    'KRUIDVAT', 'ETOS', 'HEMA', 'ACTION'
  ];
  
  for (const pattern of storePatterns) {
    if (text.toUpperCase().includes(pattern)) {
      result.store = pattern;
      console.log('[Receipt Parser] Store found:', pattern);
      break;
    }
  }
  
  // Enhanced product patterns
  const productPatterns = [
    // Standard receipt format: product price
    /^(.+?)\s+€?\s*(\d+)[,\.](\d{2})\s*$/,
    // With quantity: 2x product price
    /^(\d+x?\s*.+?)\s+€?\s*(\d+)[,\.](\d{2})\s*$/,
    // Price without euro sign
    /^(.+?)\s+(\d+)[,\.](\d{2})\s*$/,
    // Price on next line (common in receipts)
    /^(.+?)\s*$/
  ];
  
  // Process lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    
    // Skip header lines
    if (i < 3 || line.match(/btw|bon|kassa|datum|tijd|winkel|tel/i)) {
      continue;
    }
    
    // Date detection
    const dateMatch = line.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
    if (dateMatch) {
      result.date = dateMatch[0];
      console.log('[Receipt Parser] Date found:', result.date);
      continue;
    }
    
    // Total detection
    if (line.match(/totaal|total|te betalen|totale/i)) {
      const totalMatch = line.match(/€?\s*(\d+)[,\.](\d{2})/);
      if (totalMatch) {
        result.total = parseFloat(totalMatch[1] + '.' + totalMatch[2]);
        console.log('[Receipt Parser] Total found:', result.total);
      }
      continue;
    }
    
    // Discount detection
    if (line.match(/korting|discount|actie|voordeel/i)) {
      const discountMatch = line.match(/€?\s*(\d+)[,\.](\d{2})/);
      if (discountMatch) {
        result.discount = parseFloat(discountMatch[1] + '.' + discountMatch[2]);
        console.log('[Receipt Parser] Discount found:', result.discount);
      }
      continue;
    }
    
    // Product detection
    let productFound = false;
    
    // First try: line has both product and price
    const priceMatch = line.match(/€?\s*(\d+)[,\.](\d{2})\s*$/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[1] + '.' + priceMatch[2]);
      const productName = line.substring(0, line.lastIndexOf(priceMatch[0])).trim();
      
      if (productName.length > 2 && price > 0 && price < 500) {
        result.items.push({
          name: productName,
          price: price
        });
        console.log('[Receipt Parser] Product found:', productName, '€', price);
        productFound = true;
      }
    }
    
    // Second try: product on one line, price on next
    if (!productFound && nextLine) {
      const nextPriceMatch = nextLine.match(/^€?\s*(\d+)[,\.](\d{2})\s*$/);
      if (nextPriceMatch && line.length > 2 && !line.match(/\d/)) {
        const price = parseFloat(nextPriceMatch[1] + '.' + nextPriceMatch[2]);
        if (price > 0 && price < 500) {
          result.items.push({
            name: line,
            price: price
          });
          console.log('[Receipt Parser] Product found (two lines):', line, '€', price);
          i++; // Skip next line
        }
      }
    }
  }
  
  console.log('[Receipt Parser] Total products found:', result.items.length);
  console.log('[Receipt Parser] Products:', result.items);
  
  // Calculate subtotal
  if (result.items.length > 0) {
    result.subtotal = result.items.reduce((sum, item) => sum + item.price, 0);
    console.log('[Receipt Parser] Calculated subtotal:', result.subtotal);
  }
  
  // Default store if not found
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
    
    console.log('[Receipt] OCR completed, text length:', fullText.length);
    
    // Parse receipt with enhanced parser
    const parsed = parseDutchReceipt(fullText);
    
    console.log('[Receipt] Final parsed result:', {
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
    
    // Return structured error response
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
  const { templateEngine } = require('./boodschapp-messages');
  
  // Use enterprise template engine instead of manual string building
  return templateEngine.formatReceiptResponse(data);
}

module.exports = { processReceiptWithMCP, formatReceiptResponse };