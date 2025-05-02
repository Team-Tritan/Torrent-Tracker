import express, { Request, Response } from "express";
import { parse } from "url";
import bencode from "bencode";

const app = express();
const PORT = 8080;

interface Peer {
  peer_id: string;
  ip: string;
  port: number;
  uploaded: number;
  downloaded: number;
  left: number;
  lastSeen: number;
}

interface TorrentStats {
  infoHash: string;
  totalPeers: number;
  seeders: number;
  leechers: number;
  hasSeederAndLeecher: boolean;
  clients: Record<string, number>;
}

type Swarm = Record<string, Peer>;
const torrents: Record<string, Swarm> = {};

function parseQuery(query: string = ""): Record<string, string> {
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

function getIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return (
    (typeof forwarded === "string" ? forwarded.split(",")[0] : undefined) ||
    req.socket.remoteAddress?.replace("::ffff:", "") ||
    "0.0.0.0"
  );
}

function handleAnnounce(req: Request, res: Response): void {
  const { query } = parse(req.url ?? "", false);
  const params = parseQuery(query ?? undefined);

  const info_hash = params["info_hash"];
  const peer_id = params["peer_id"];
  const port = parseInt(params["port"], 10);
  const uploaded = parseInt(params["uploaded"], 10) || 0;
  const downloaded = parseInt(params["downloaded"], 10) || 0;
  const left = parseInt(params["left"], 10) || 0;
  const event = params["event"];
  const compact = params["compact"] === "1";

  if (!info_hash || !peer_id || isNaN(port)) {
    res.status(400).send("Missing or invalid required parameters");
    return
  }

  const ip = getIP(req);
  const peer: Peer = {
    peer_id,
    ip,
    port,
    uploaded,
    downloaded,
    left,
    lastSeen: Date.now(),
  };

  if (!torrents[info_hash]) torrents[info_hash] = {};

  if (event === "stopped") {
    delete torrents[info_hash][peer_id];
  } else {
    torrents[info_hash][peer_id] = peer;
  }

  let seeders = 0;
  let leechers = 0;

  Object.values(torrents[info_hash]).forEach(p => {
    if (p.left === 0) seeders++;
    else leechers++;
  });

  const peerList = Object.values(torrents[info_hash])
    .filter((p) => p.peer_id !== peer_id);

  const response: any = {
    'interval': 1800,
    'complete': seeders,
    'incomplete': leechers
  };

  if (compact) {
    const compactPeers = Buffer.alloc(peerList.length * 6);

    peerList.forEach((peer, i) => {
      const offset = i * 6;
      const ipParts = peer.ip.split('.').map(Number);

      for (let j = 0; j < 4; j++) {
        compactPeers[offset + j] = ipParts[j] || 0;
      }

      compactPeers[offset + 4] = (peer.port >> 8) & 0xff;
      compactPeers[offset + 5] = peer.port & 0xff;
    });

    response.peers = compactPeers;
  } else {
    response.peers = peerList.map(p => ({
      'peer id': p.peer_id,
      'ip': p.ip,
      'port': p.port
    }));
  }

  res.set('Content-Type', 'text/plain');
  res.send(bencode.encode(response));
}

function handleStats(_req: Request, res: Response): void {
  const stats: TorrentStats[] = Object.entries(torrents).map(
    ([infoHash, swarm]) => {
      let seeders = 0;
      let leechers = 0;
      const clientMap: Record<string, number> = {};

      for (const peer of Object.values(swarm)) {
        if (peer.left === 0) {
          seeders++;
        } else {
          leechers++;
        }

        const match = peer.peer_id.match(/^-(.{2})/);
        const clientPrefix = match?.[1] || "??";
        clientMap[clientPrefix] = (clientMap[clientPrefix] || 0) + 1;
      }

      return {
        infoHash,
        totalPeers: seeders + leechers,
        seeders,
        leechers,
        hasSeederAndLeecher: seeders > 0 && leechers > 0,
        clients: clientMap,
      };
    }
  );

  res.json({ torrents: stats });
}

app.get("/announce", handleAnnounce);
app.get("/stats", handleStats);

function startServer(): void {
  app
    .listen(PORT, () => {
      console.log(`Tracker listening at http://localhost:${PORT}`);
    })
    .on("error", (err: any) => {
      console.error("Failed to start server:", err);
      process.exit(1);
    });
}

startServer();
