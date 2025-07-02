const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function processReceiptWithMCP(imagePath, userId) {
  console.log('[Receipt] Processing with MCP...');
  
  // For now, return mock data
  // TODO: Implement actual MCP call
  return {
    success: true,
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

function formatReceiptResponse(data) {
  let msg = '🛒 *Kassabon Verwerkt!*\n\n';
  msg += '📍 Winkel: ' + data.store + '\n';
  msg += '📅 Datum: ' + data.date + '\n\n';
  msg += '💰 *Totaal: €' + data.total.toFixed(2) + '*\n';
  if (data.savings > 0) {
    msg += '✨ *Besparing: €' + data.savings.toFixed(2) + '*\n';
  }
  return msg;
}

module.exports = { processReceiptWithMCP, formatReceiptResponse };
