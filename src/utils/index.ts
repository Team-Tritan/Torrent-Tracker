"use strict";

import { Request } from "express";
import { Torrents } from "../types";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

export function parseQuery(query: string = ""): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function getIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : undefined;

  return (
    forwardedIp || req.socket.remoteAddress?.replace("::ffff:", "") || "0.0.0.0"
  );
}

export function getScrapeData(
  torrents: Torrents,
  infoHash: string
): Record<string, number> {
  let complete = 0;
  let incomplete = 0;

  const swarm = torrents[infoHash];
  if (swarm) {
    for (const peer of Object.values(swarm)) {
      if (peer.left === 0) complete++;
      else incomplete++;
    }
  }

  return { complete, incomplete, downloaded: 0 };
}

export const dataDir = process.env.DATA_DIR || join(process.cwd(), "data");
export const dataFile = join(dataDir, "tracker-state.json");

export function ensureDataDirectory(): void {
  if (!existsSync(dataDir)) {
    try {
      mkdirSync(dataDir, { recursive: true });
      console.log(`Created data directory at ${dataDir}`);
    } catch (error) {
      console.error(`Failed to create data directory: ${error}`);
      process.exit(1);
    }
  }
}

let lastStateSize = 0;

export function saveState(torrents: Torrents): void {
  try {
    ensureDataDirectory();

    const stateSize = Object.keys(torrents).length;

    if (Math.abs(stateSize - lastStateSize) > 10 || stateSize === 0) {
      writeFileSync(dataFile, JSON.stringify(torrents, null, 2));
      console.log(`State saved to ${dataFile}`);
      lastStateSize = stateSize;
    }
  } catch (error) {
    console.error(`Failed to save state: ${error}`);
  }
}

export function loadState(): Torrents {
  ensureDataDirectory();

  if (!existsSync(dataFile)) {
    console.log(
      `No state file found at ${dataFile}, starting with empty state`
    );
    return {};
  }

  try {
    const data = readFileSync(dataFile, "utf-8");
    const loadedTorrents = JSON.parse(data) as Torrents;
    lastStateSize = Object.keys(loadedTorrents).length;
    console.log(`State loaded from ${dataFile}`);
    return loadedTorrents;
  } catch (error) {
    console.error(`Failed to load state, starting with empty state: ${error}`);
    return {};
  }
}

export function setupPeriodicStateSaving(
  torrents: Torrents,
  intervalMinutes: number = 5
): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;
  console.log(
    `Setting up automatic state saving every ${intervalMinutes} minutes`
  );

  return setInterval(() => {
    saveState(torrents);
  }, interval);
}
