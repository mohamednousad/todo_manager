import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "./app/server/websocket";

const app = express();
const server = createServer(app);
const PORT = 5765;

new WebSocketServer(server);

app.get("/health", (req, res) => {
  res.json({
    status: "WebSocket server ok",
    timestamp: new Date().toISOString(),
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
