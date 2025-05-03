"use strict";

import { z } from "zod";

export const peerSchema = z.object({
  peer_id: z.string(),
  ip: z.string(),
  port: z.number(),
  uploaded: z.number(),
  downloaded: z.number(),
  left: z.number(),
  lastSeen: z.number(),
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

export type Peer = z.infer<typeof peerSchema>;
export type TorrentStats = z.infer<typeof torrentStatsSchema>;
export type Swarm = z.infer<typeof swarmSchema>;
export type Torrents = z.infer<typeof torrentsSchema>;
