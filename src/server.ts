"use strict";

import express from "express";
import { cleanupInactivePeers, loadBlacklist } from "./lib/store";
import { peerExpirationTime } from "./types";
import fs from "fs";
import path from "path";
import router from "./routes/router";
import redis from "./lib/redis";

const config = {
  port: parseInt(process.env.PORT || "8080"),
  cleanupInterval: process.env.CLEANUP_INTERVAL
    ? parseInt(process.env.CLEANUP_INTERVAL, 10) * 60 * 1000
    : Math.floor(peerExpirationTime / 3),
};

const blacklistPath = path.join(__dirname, "..", "data", "blacklist.json");
try {
  if (fs.existsSync(blacklistPath)) {
    const blacklistData = fs.readFileSync(blacklistPath, "utf-8");
    const blacklist = JSON.parse(blacklistData);

    if (Array.isArray(blacklist)) {
      loadBlacklist(blacklist);
      console.log(`Loaded ${blacklist.length} hashes from the blacklist.`);
    } else {
      console.error("Blacklist is not a valid array.");
    }
  }
} catch (error) {
  const err = error as Error;
  console.error("Error loading blacklist:", err.message);
}

const server = express()
  .disable("x-powered-by")
  .use(router)
  .listen(config.port, () => {
    console.log(`Torrent Tracker listening at :${config.port}`);
    console.log(`Peer expiration time: ${peerExpirationTime / 60000} minutes`);
  })
  .on("error", (err: Error) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });

const peerCleanupInterval = setInterval(
  cleanupInactivePeers,
  config.cleanupInterval,
);

const handleShutdown = async (): Promise<void> => {
  console.log("Shutting down tracker...");

  clearInterval(peerCleanupInterval);
  await redis.quit();
  process.exit(0);
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
