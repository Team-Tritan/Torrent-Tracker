"use strict";

import express from "express";
import router from "./routes/router";
import { cleanupInactivePeers, torrents } from "./lib/store";
import { loadState, saveState, setupPeriodicStateSaving } from "./utils";
import { defaultStateSaveInterval, peerExpirationTime } from "./types";

const server = express();
const port = process.env.PORT || 8080;

const cleanupInterval = process.env.CLEANUP_INTERVAL
  ? parseInt(process.env.CLEANUP_INTERVAL, 10) * 60 * 1000
  : Math.floor(peerExpirationTime / 3);

Object.assign(torrents, loadState());

server.use(router);

function initServer(): void {
  server
    .listen(port, () => {
      console.log(`BitTorrent Tracker listening at :${port}`);
      console.log(
        `Peer expiration time: ${peerExpirationTime / 60000} minutes`
      );
    })
    .on("error", (err: any) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

const peerCleanupInterval = setInterval(cleanupInactivePeers, cleanupInterval);
const stateSavingInterval = setupPeriodicStateSaving(
  torrents,
  defaultStateSaveInterval
);

function handleShutdown(): void {
  console.log("Shutting down tracker...");
  clearInterval(peerCleanupInterval);
  clearInterval(stateSavingInterval);
  saveState(torrents);
  process.exit(0);
}

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

initServer();
