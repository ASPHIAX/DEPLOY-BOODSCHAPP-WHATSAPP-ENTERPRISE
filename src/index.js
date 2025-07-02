require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const { setupRoutes } = require('./routes');
const { setQR } = require('./qrStorage');
const { setupDatabase } = require('./database');
const { processInboundMessage } = require("./messageHandler");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  }
});

// WhatsApp event handlers
client.on('qr', (qr) => {
  // Generate and display QR code in terminal
  logger.info('QR code received, scan to authenticate');
  setQR(qr);
  qrcode.generate(qr, { small: true });
  // Also save QR to file for easy access
  require('fs').writeFileSync('/app/current-qr.txt', qr);
  console.log('\n\n=== QR CODE SAVED TO /app/current-qr.txt ===\n');
});

client.on('ready', () => {
  logger.info('WhatsApp client is ready');
});

client.on('message_create', async (message) => {
  logger.info(`MESSAGE_CREATE EVENT! From: ${message.from}, FromMe: ${message.fromMe}, Body: ${message.body || "[Media]"}`);
  // TESTING: Allow self-messages for debugging purposes
  await processInboundMessage(message);
});

client.on('disconnected', (reason) => {
  logger.warn(`Client was disconnected: ${reason}`);
});

// Initialize WhatsApp client
client.initialize();

// Setup API routes
setupRoutes(app, client);

// Connect to database
setupDatabase();

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  client.destroy();
  process.exit(0);
});

module.exports = { app, client };