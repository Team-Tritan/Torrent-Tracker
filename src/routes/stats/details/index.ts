import { Router, Request, Response } from "express";
import { torrents } from "../../../lib/store";
import { TorrentStats } from "../../../types";

const router = Router();

router.get("/details", (req: Request, res: Response) => {
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
