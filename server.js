import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import process from "process";

import { createRequestHandler } from "@remix-run/express";
import { WebSocketServer } from "./app/server/websocket";

dotenv.config();
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5785;

new WebSocketServer(server);

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

app.use(
  viteDevServer ? viteDevServer.middlewares : express.static("build/client"),
);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
  : await import("./build/server/index.js");

app.all("*", createRequestHandler({ build }));

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
