// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // Your configurations
});

const websocketPort = process.env.WEBSOCKET_PORT; // Example port
if (websocketPort) {
  try {
    const socket = new WebSocket(`ws://localhost:${websocketPort}`);
    // Handle WebSocket events here
  } catch (error) {
    console.error("WebSocket connection failed:", error);
  }
} else {
  console.warn("WebSocket port is not defined, skipping WebSocket setup.");
}
