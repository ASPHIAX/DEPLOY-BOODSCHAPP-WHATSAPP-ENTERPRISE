const { exec } = require('child_process');
const qrcode = require('qrcode-terminal');

// Function to get QR code as text
function getQRCodeText(data) {
  let output = '';
  const originalLog = console.log;
  console.log = (text) => { output += text + '\n'; };
  qrcode.generate(data, { small: true });
  console.log = originalLog;
  return output;
}

// Start the WhatsApp service and capture QR
const child = exec('cd /app && node src/index.js', { maxBuffer: 10 * 1024 * 1024 });

let qrCaptured = false;

child.stdout.on('data', (data) => {
  process.stdout.write(data);
  
  // Detect when QR is being generated
  if (data.includes('QR code received') && !qrCaptured) {
    setTimeout(() => {
      // Try to get QR from the saved file
      try {
        const qr = require('fs').readFileSync('/app/current-qr.txt', 'utf8');
        console.log('\n\n=== SCAN THIS QR CODE WITH WHATSAPP ===\n');
        const qrText = getQRCodeText(qr);
        console.log(qrText);
        console.log('\n=== END QR CODE ===\n');
        qrCaptured = true;
      } catch (e) {
        console.log('Could not read QR code file');
      }
    }, 1000);
  }
});

child.stderr.on('data', (data) => {
  process.stderr.write(data);
});

child.on('error', (error) => {
  console.error('Error:', error);
});
