"use strict";

import { Request, Response, Router } from "express";
import redis from "../../lib/redis";
import { TorrentStats } from "../../types";
import os from "os";
import { blacklist } from "../../lib/store";

const router = Router();

const SUMMARY_TTL_MS = 15000;
const DETAILS_TTL_MS = 60000;

type SummaryStats = {
  torrents: number;
  seeders: number;
  leechers: number;
  peers: number;
  uniquePeers: number;
  uploaded: number;
  downloaded: number;
  blacklistSize: number;
  peersOnlySeedingCount: number;
  peersOnlyLeechingCount: number;
  peersSeedingAndLeechingCount: number;
  ipv4PeersCount: number;
  ipv6PeersCount: number;
  clients: Record<string, number>;
  memoryUsage: NodeJS.MemoryUsage;
  os: {
    loadavg: number[];
    totalmem: number;
    freemem: number;
  };
};

type Cache<T> = {
  data: T | null;
  updatedAt: number;
  inFlight: Promise<void> | null;
};

const summaryCache: Cache<SummaryStats> = {
  data: null,
  updatedAt: 0,
  inFlight: null,
};

const detailsCache: Cache<TorrentStats[]> = {
  data: null,
  updatedAt: 0,
  inFlight: null,
};

function isStale(updatedAt: number, ttlMs: number): boolean {
  return Date.now() - updatedAt > ttlMs;
}

async function buildSummary(): Promise<SummaryStats> {
  let totalTorrents = 0;
  let totalSeeders = 0;
  let totalLeechers = 0;
  let totalUploaded = 0;
  let totalDownloaded = 0;
  const uniquePeers: Record<string, { isSeeding: boolean; isLeeching: boolean; ip: string }> = {};
  const clientMap: Record<string, number> = {};

  const keyStream = redis.scanStream({ match: "torrent:*", count: 500 });
  for await (const keys of keyStream) {
    for (const key of keys) {
      totalTorrents++;

      const peerStream = redis.hscanStream(key, { count: 200 });

      for await (const chunk of peerStream) {
        for (let i = 1; i < chunk.length; i += 2) {
          const peerData = chunk[i];

          if (!peerData) continue;
          const peer = JSON.parse(peerData);

          if (peer.left === 0) {
            totalSeeders++;
          } else {
            totalLeechers++;
          }

          totalUploaded += peer.uploaded;
          totalDownloaded += peer.downloaded;

          if (!uniquePeers[peer.peer_id]) {
            uniquePeers[peer.peer_id] = {
              isSeeding: peer.left === 0,
              isLeeching: peer.left > 0,
              ip: peer.ip,
            };
          } else {
            uniquePeers[peer.peer_id].isSeeding =
              uniquePeers[peer.peer_id].isSeeding || peer.left === 0;
            uniquePeers[peer.peer_id].isLeeching =
              uniquePeers[peer.peer_id].isLeeching || peer.left > 0;
          }

          const match = peer.peer_id.match(/^-(.{2})/);
          const clientPrefix = match?.[1] || "??";
          clientMap[clientPrefix] = (clientMap[clientPrefix] || 0) + 1;
        }
      }
    }
  }

  let seedersOnly = 0;
  let leechersOnly = 0;
  let seedingAndLeeching = 0;
  let ipv4Peers = 0;
  let ipv6Peers = 0;

  for (const peer of Object.values(uniquePeers)) {
    if (peer.isSeeding && !peer.isLeeching) {
      seedersOnly++;
    } else if (!peer.isSeeding && peer.isLeeching) {
      leechersOnly++;
    } else if (peer.isSeeding && peer.isLeeching) {
      seedingAndLeeching++;
    }

    if (peer.ip.includes(":")) {
      ipv6Peers++;
    } else {
      ipv4Peers++;
    }
  }

  return {
    torrents: totalTorrents,
    seeders: totalSeeders,
    leechers: totalLeechers,
    peers: totalSeeders + totalLeechers,
    uniquePeers: Object.keys(uniquePeers).length,
    uploaded: totalUploaded,
    downloaded: totalDownloaded,
    blacklistSize: blacklist.length,
    peersOnlySeedingCount: seedersOnly,
    peersOnlyLeechingCount: leechersOnly,
    peersSeedingAndLeechingCount: seedingAndLeeching,
    ipv4PeersCount: ipv4Peers,
    ipv6PeersCount: ipv6Peers,
    clients: clientMap,
    memoryUsage: process.memoryUsage(),
    os: {
      loadavg: os.loadavg(),
      totalmem: os.totalmem(),
      freemem: os.freemem(),
    },
  };
}

async function buildDetails(): Promise<TorrentStats[]> {
  const stats: TorrentStats[] = [];
  const keyStream = redis.scanStream({ match: "torrent:*", count: 500 });

  for await (const keys of keyStream) {
    for (const key of keys) {
      const infoHash = key.replace("torrent:", "");

      let seeders = 0;
      let leechers = 0;
      let uploaded = 0;
      let downloaded = 0;

      const clientMap: Record<string, number> = {};
      const peerDetails: Array<{
        peerId: string;
        ip: string;
        port: number;
        uploaded: number;
        downloaded: number;
        left: number;
        isSeeder: boolean;
        lastSeen: number;
        client: string;
      }> = [];

      const peerStream = redis.hscanStream(key, { count: 200 });
      for await (const chunk of peerStream) {
        for (let i = 1; i < chunk.length; i += 2) {
          const peerData = chunk[i];
          if (!peerData) continue;

          const peer = JSON.parse(peerData);

          if (peer.left === 0) {
            seeders++;
          } else {
            leechers++;
          }

          uploaded += peer.uploaded;
          downloaded += peer.downloaded;

          const match = peer.peer_id.match(/^-(.{2})/);
          const clientPrefix = match?.[1] || "??";
          
          clientMap[clientPrefix] = (clientMap[clientPrefix] || 0) + 1;

          peerDetails.push({
            peerId: peer.peer_id,
            ip: peer.ip,
            port: peer.port,
            uploaded: peer.uploaded,
            downloaded: peer.downloaded,
            left: peer.left,
            isSeeder: peer.left === 0,
            lastSeen: peer.lastSeen,
            client: clientPrefix,
          });
        }
      }

      stats.push({
        infoHash,
        totalPeers: seeders + leechers,
        seeders,
        leechers,
        uploaded,
        downloaded,
        hasSeederAndLeecher: seeders > 0 && leechers > 0,
        clients: clientMap,
        peers: peerDetails,
      });
    }
  }

  return stats;
}

async function refreshSummary(force: boolean = false): Promise<void> {
  if (summaryCache.inFlight) {
    return summaryCache.inFlight;
  }

  if (!force && summaryCache.data && !isStale(summaryCache.updatedAt, SUMMARY_TTL_MS)) {
    return;
  }

  summaryCache.inFlight = (async () => {
    summaryCache.data = await buildSummary();
    summaryCache.updatedAt = Date.now();
  })().finally(() => {
    summaryCache.inFlight = null;
  });

  return summaryCache.inFlight;
}

async function refreshDetails(force: boolean = false): Promise<void> {
  if (detailsCache.inFlight) {
    return detailsCache.inFlight;
  }

  if (!force && detailsCache.data && !isStale(detailsCache.updatedAt, DETAILS_TTL_MS)) {
    return;
  }

  detailsCache.inFlight = (async () => {
    detailsCache.data = await buildDetails();
    detailsCache.updatedAt = Date.now();
  })().finally(() => {
    detailsCache.inFlight = null;
  });

  return detailsCache.inFlight;
}

void refreshSummary(true);
setInterval(() => {
  void refreshSummary();
}, SUMMARY_TTL_MS);

router.get("/", async (_req: Request, res: Response) => {
  try {
    if (!summaryCache.data) {
      await refreshSummary(true);
    } else if (isStale(summaryCache.updatedAt, SUMMARY_TTL_MS)) {
      void refreshSummary();
    }

    if (!summaryCache.data) {
      res.status(503).json({ error: "Stats warming up" });
      return;
    }

    res.json(summaryCache.data);
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/details", async (_req: Request, res: Response) => {
  try {
    if (!detailsCache.data) {
      await refreshDetails(true);
    } else if (isStale(detailsCache.updatedAt, DETAILS_TTL_MS)) {
      void refreshDetails();
    }

    if (!detailsCache.data) {
      res.status(503).json({ error: "Details warming up" });
      return;
    }

    res.json({ torrents: detailsCache.data });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
