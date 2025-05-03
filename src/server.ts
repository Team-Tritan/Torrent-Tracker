"use strict";

import express from "express";
import router from "./router";
import { cleanupInactivePeers } from "./lib/tracker";

const server = express();
const port = process.env.PORT;

server.use(router);

function initServer(): void {
  server
    .listen(port, () => {
      console.log(`Tracker listening at :${port}`);
    })
    .on("error", (err: any) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

setInterval(cleanupInactivePeers, 15 * 60 * 1000);

initServer();
