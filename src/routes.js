
const express = require('express');
const { getQR } = require('./qrStorage');

// Setup routes
function setupRoutes(app) {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', clientStatus: global.client ? (global.client.info ? 'authenticated' : 'not authenticated') : 'not initialized' });
  });

  // Get QR code
  app.get('/api/qr', (req, res) => {
    const qr = getQR();
    if (qr) {
      res.json({ qr, timestamp: new Date() });
    } else {
      res.status(404).json({ error: 'No QR code available' });
    }
  });

  // QR code display page
  app.get('/qr', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>WhatsApp QR Code</title>
        <meta charset='utf-8'>
        <style>
          body { font-family: Arial; text-align: center; padding: 20px; }
          #qr-container { margin: 20px auto; padding: 20px; border: 2px solid #ccc; display: inline-block; }
          #status { margin: 20px; font-weight: bold; }
          .error { color: red; }
          .success { color: green; }
        </style>
      </head>
      <body>
        <h1>BOODSCHAPP WhatsApp Authentication</h1>
        <div id='status'>Loading QR code...</div>
        <div id='qr-container'></div>
        <p>Scan this QR code with WhatsApp on your phone</p>
        <script src='https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'></script>
        <script>
          let lastQR = null;
          
          async function fetchQR() {
            try {
              const response = await fetch('/api/qr');
              if (response.ok) {
                const data = await response.json();
                if (data.qr && data.qr !== lastQR) {
                  lastQR = data.qr;
                  document.getElementById('qr-container').innerHTML = '';
                  QRCode.toCanvas(data.qr, { width: 300 }, function (err, canvas) {
                    if (err) throw err;
                    document.getElementById('qr-container').appendChild(canvas);
                  });
                  document.getElementById('status').innerHTML = '<span class="success">QR Code Ready - Scan Now!</span>';
                }
              } else {
                document.getElementById('status').innerHTML = '<span class="error">Waiting for QR code...</span>';
              }
            } catch (error) {
              document.getElementById('status').innerHTML = '<span class="error">Error: ' + error.message + '</span>';
            }
          }
          
          // Check for QR every 2 seconds
          setInterval(fetchQR, 2000);
          fetchQR();
        </script>
      </body>
      </html>
    `);
  });
}

module.exports = { setupRoutes };
