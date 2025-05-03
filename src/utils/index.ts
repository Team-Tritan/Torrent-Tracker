"use strict";

import { Request } from "express";
import { Torrents } from "../types";

export function parseQuery(query: string = ""): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function getIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (
    (typeof forwarded === "string" ? forwarded.split(",")[0] : undefined) ||
    req.socket.remoteAddress?.replace("::ffff:", "") ||
    "0.0.0.0"
  );
}

export function getScrapeData(
  torrents: Torrents,
  info_hash: string
): Record<string, number> {
  let complete = 0;
  let incomplete = 0;

  if (torrents[info_hash]) {
    for (const peer of Object.values(torrents[info_hash])) {
      if (peer.left === 0) complete++;
      else incomplete++;
    }
  }

  return { complete, incomplete, downloaded: 0 };
}
