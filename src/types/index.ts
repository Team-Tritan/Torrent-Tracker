"use strict";

import { z } from "zod";

export const peerExpirationTime = 40 * 60 * 1000;
export const defaultAnnounceInterval = 1800;
export const defaultStateSaveInterval = 5;

export const peerSchema = z.object({
  peer_id: z.string(),
  ip: z.string(),
  port: z.number(),
  uploaded: z.number(),
  downloaded: z.number(),
  left: z.number(),
  lastSeen: z.number(),
});

export const announceRequestSchema = z.object({
  info_hash: z.string(),
  peer_id: z.string(),
  port: z.number(),
  uploaded: z.number().optional().default(0),
  downloaded: z.number().optional().default(0),
  left: z.number().optional().default(0),
  compact: z
    .union([z.literal("0"), z.literal("1")])
    .optional()
    .default("0"),
  event: z.enum(["started", "completed", "stopped", "paused"]).optional(),
});

export const torrentStatsSchema = z.object({
  infoHash: z.string(),
  totalPeers: z.number(),
  seeders: z.number(),
  leechers: z.number(),
  hasSeederAndLeecher: z.boolean(),
  clients: z.record(z.string(), z.number()),
});

export const swarmSchema = z.record(z.string(), peerSchema);
export const torrentsSchema = z.record(z.string(), swarmSchema);

export interface AnnounceResponse {
  interval: number;
  complete: number;
  incomplete: number;
  peers: Buffer | Array<{ peer_id: string; ip: string; port: number }>;
}

export interface ScrapeResponse {
  files: Record<
    string,
    {
      complete: number;
      incomplete: number;
      downloaded: number;
    }
  >;
}

export type Peer = z.infer<typeof peerSchema>;
export type AnnounceRequest = z.infer<typeof announceRequestSchema>;
export type TorrentStats = z.infer<typeof torrentStatsSchema>;
export type Swarm = z.infer<typeof swarmSchema>;
export type Torrents = z.infer<typeof torrentsSchema>;
