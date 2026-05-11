"use strict";

import { Request } from "express";
import { existsSync, mkdirSync } from "fs";
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

export const dataDir = process.env.DATA_DIR || join(process.cwd(), "data");

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
