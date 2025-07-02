require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const logger = require("./utils/logger");
const { setupRoutes } = require("./routes");
const { setQR } = require("./qrStorage");
const { setupDatabase } = require("./database");
const { processInboundMessage } = require("./messageHandler");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// FIXED: Generate unique session ID to prevent profile conflicts
const sessionId = `whatsapp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// FIXED: Enhanced Puppeteer configuration for container stability + unique profiles
const client = new Client({
  authStrategy: new LocalAuth({ clientId: sessionId }),
  puppeteer: {
    headless: true,
    executablePath: "/usr/bin/chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox", 
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI",
      "--disable-extensions",
      "--disable-default-apps",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--user-data-dir=/tmp/chrome-user-data-" + sessionId,
      "--disable-software-rasterizer",
      "--disable-features=VizDisplayCompositor",
      "--force-color-profile=srgb",
      "--memory-pressure-off",
      "--max_old_space_size=4096"
    ]
  }
});

// FIXED: Better error handling for WhatsApp events
client.on("qr", (qr) => {
  try {
    logger.info("QR code received, scan to authenticate");
    setQR(qr);
    qrcode.generate(qr, { small: true });
    require("fs").writeFileSync("/app/current-qr.txt", qr);
    console.log("\n=== QR CODE SAVED TO /app/current-qr.txt ===\n");
  } catch (error) {
    logger.error("QR generation error:", error);
  }
});

client.on("ready", () => {
  logger.info("WhatsApp client is ready and authenticated");
});

client.on("message_create", async (message) => {
  try {
    logger.info(`MESSAGE_CREATE EVENT! From: ${message.from}, FromMe: ${message.fromMe}, Body: ${message.body || "[Media]"}`);
    await processInboundMessage(message);
  } catch (error) {
    logger.error("Message processing error:", error);
  }
});

client.on("disconnected", (reason) => {
  logger.warn(`Client was disconnected: ${reason}`);
  // Try to reconnect after 5 seconds
  setTimeout(() => {
    logger.info("Attempting to reconnect...");
    initializeClient();
  }, 5000);
});

// FIXED: Add comprehensive error event handlers
client.on("auth_failure", (msg) => {
  logger.error("Authentication failure:", msg);
});

client.on("authenticated", () => {
  logger.info("WhatsApp authentication successful");
});

client.on("loading_screen", (percent, message) => {
  logger.info(`WhatsApp loading: ${percent}% - ${message}`);
});

// FIXED: Robust client initialization with retry logic
async function initializeClient(retryCount = 0) {
  if (retryCount >= 3) {
    logger.error("Max retry attempts reached. Giving up on WhatsApp client initialization.");
    return;
  }
  
  try {
    logger.info(`Initializing WhatsApp client (attempt ${retryCount + 1})`);
    await client.initialize();
    logger.info("WhatsApp client initialized successfully");
  } catch (error) {
    logger.error(`Client initialization error (attempt ${retryCount + 1}):`, error.message);
    // Wait and retry
    setTimeout(() => {
      initializeClient(retryCount + 1);
    }, 5000);
  }
}

// Setup API routes
setupRoutes(app, client);

// Connect to database (with better error handling)
async function initializeDatabase() {
  try {
    await setupDatabase();
  } catch (error) {
    logger.error("Database setup error:", error.message);
    // Continue without database if connection fails
  }
}

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Initialize database and WhatsApp client after server starts
initializeDatabase();
setTimeout(() => {
  initializeClient();
}, 2000); // Delay to ensure server is fully started

// FIXED: Better signal handling to prevent abrupt shutdowns
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  setTimeout(() => {
    if (client && client.pupPage) {
      client.destroy().catch(() => {});
    }
    process.exit(0);
  }, 2000);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  setTimeout(() => {
    if (client && client.pupPage) {
      client.destroy().catch(() => {});
    }
    process.exit(0);
  }, 2000);
});

// FIXED: Handle uncaught exceptions to prevent crashes
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error.message);
  logger.error("Stack:", error.stack);
  // Don't exit, log and continue
});

process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection:", error.message);
  logger.error("Stack:", error.stack);
  // Don't exit, log and continue
});

module.exports = { app, client };
