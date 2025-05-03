"use strict";

import { Request, Response, Router } from "express";
import { torrents } from "../../lib/store";
import { TorrentStats } from "../../types";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  try {
    const totalTorrents = Object.keys(torrents).length;
    let totalSeeders = 0;
    let totalLeechers = 0;

    const uniquePeers: Record<
      string,
      {
        isSeeding: boolean;
        isLeeching: boolean;
        ip: string;
      }
    > = {};

    const clientMap: Record<string, number> = {};

    for (const swarm of Object.values(torrents)) {
      for (const peer of Object.values(swarm)) {
        if (peer.left === 0) {
          totalSeeders++;
        } else {
          totalLeechers++;
        }

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

    res.json({
      torrents: totalTorrents,
      seeders: totalSeeders,
      leechers: totalLeechers,
      uniquePeers: Object.keys(uniquePeers).length,
      peersOnlySeedingCount: seedersOnly,
      peersOnlyLeechingCount: leechersOnly,
      peersSeedingAndLeechingCount: seedingAndLeeching,
      ipv4PeersCount: ipv4Peers,
      ipv6PeersCount: ipv6Peers,
      clients: clientMap,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/details", (_req: Request, res: Response) => {
  try {
    const stats: TorrentStats[] = Object.entries(torrents).map(
      ([infoHash, swarm]) => {
        let seeders = 0;
        let leechers = 0;
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

        for (const peer of Object.values(swarm)) {
          if (peer.left === 0) {
            seeders++;
          } else {
            leechers++;
          }

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

        return {
          infoHash,
          totalPeers: seeders + leechers,
          seeders,
          leechers,
          hasSeederAndLeecher: seeders > 0 && leechers > 0,
          clients: clientMap,
          peers: peerDetails,
        };
      }
    );

    res.json({ torrents: stats });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
