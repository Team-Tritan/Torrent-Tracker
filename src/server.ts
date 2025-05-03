"use strict";

import express from "express";
import router from "./routes/router";
import { cleanupInactivePeers, torrents } from "./lib/store";
import { loadState, saveState, setupPeriodicStateSaving } from "./utils";
import { defaultStateSaveInterval, peerExpirationTime } from "./types";

const config = {
  port: parseInt(process.env.PORT || "8080"),
  cleanupInterval: process.env.CLEANUP_INTERVAL
    ? parseInt(process.env.CLEANUP_INTERVAL, 10) * 60 * 1000
    : Math.floor(peerExpirationTime / 3),
  stateSaveInterval: defaultStateSaveInterval,
};

Object.assign(torrents, loadState());

const server = express()
  .use(router)
  .listen(config.port, () => {
    console.log(`BitTorrent Tracker listening at :${config.port}`);
    console.log(`Peer expiration time: ${peerExpirationTime / 60000} minutes`);
  })
  .on("error", (err: Error) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

const peerCleanupInterval = setInterval(
  cleanupInactivePeers,
  config.cleanupInterval
);

const stateSavingInterval = setupPeriodicStateSaving(
  torrents,
  config.stateSaveInterval
);

const handleShutdown = (): void => {
  console.log("Shutting down tracker...");

  clearInterval(peerCleanupInterval);
  clearInterval(stateSavingInterval);

  saveState(torrents);
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
