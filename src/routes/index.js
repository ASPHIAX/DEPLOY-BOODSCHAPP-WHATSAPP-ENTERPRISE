const messageRoutes = require("./messageRoutes");
const authRoutes = require("./authRoutes");
const contactRoutes = require("./contactRoutes");
const package = require("../../package.json");

function setupRoutes(app, client) {
  // MCP Version endpoint
  app.get("/api/v1/version", (req, res) => {
    res.json({
      service_name: package.name,
      version: package.version,
      description: package.description
    });
  });

  // MCP Capabilities endpoint
  app.get("/api/v1/mcp/capabilities", (req, res) => {
    res.json({
      service: "whatsapp",
      capabilities: [
        "send_message",
        "receive_message",
        "qr_authentication",
        "contact_management"
      ],
      endpoints: {
        health: "/api/health",
        messages: "/api/messages",
        auth: "/api/auth",
        contacts: "/api/contacts"
      }
    });
  });

  // API health check route
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: "OK",
      clientStatus: client.info ? "authenticated" : "not authenticated"
    });
  });

  // Setup all route groups
  app.use("/api/messages", messageRoutes(client));
  app.use("/api/auth", authRoutes(client));
  app.use("/api/contacts", contactRoutes(client));

  // Fallback 404 route
  app.use("*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });
}

module.exports = { setupRoutes };