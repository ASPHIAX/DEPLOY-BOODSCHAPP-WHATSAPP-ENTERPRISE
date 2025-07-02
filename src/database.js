const mongoose = require("mongoose");
const logger = require("./utils/logger");

async function setupDatabase() {
  try {
    // FIXED: Simplified MongoDB connection with better options
    const mongoUri = process.env.MONGODB_URI || "mongodb://BOSS-MONGODB-DEV:27017/whatsapp-mcp";
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,
    });
    
    logger.info("✅ Connected to MongoDB successfully");
    logger.info(`Database: ${mongoose.connection.name}`);
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error.message);
    // Continue without database - don't crash the app
    logger.info("Application will continue without database functionality");
  }
}

// Handle MongoDB connection events
mongoose.connection.on("connected", () => {
  logger.info("MongoDB connection established");
});

mongoose.connection.on("error", (err) => {
  logger.error("MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

module.exports = { setupDatabase };
