import { Request, Response } from "express";
import { parse } from "url";
import bencode from "bencode";
import {
  Peer,
  Swarm,
  TorrentStats,
  Torrents,
  AnnounceResponse,
  peerExpirationTime,
  defaultAnnounceInterval,
} from "../types";
import { getIP, parseQuery, getScrapeData, saveState } from "../utils";

export const torrents: Torrents = {};

export function handleAnnounce(req: Request, res: Response): void {
  try {
    const { query } = parse(req.url ?? "", false);
    const params = parseQuery(query ?? undefined);

    const info_hash = params["info_hash"];
    const peer_id = params["peer_id"];
    const port = parseInt(params["port"], 10);

    if (!info_hash || !peer_id || isNaN(port) || port <= 0 || port > 65535) {
      return sendError(res, "Missing or invalid required parameters");
    }

    const uploaded = parseInt(params["uploaded"], 10) || 0;
    const downloaded = parseInt(params["downloaded"], 10) || 0;
    const left = parseInt(params["left"], 10) || 0;
    const event = params["event"];
    const compact = params["compact"] === "1";

    const ip = getIP(req);

    processAnnounce(
      info_hash,
      { peer_id, ip, port, uploaded, downloaded, left, lastSeen: Date.now() },
      event
    );

    const response = generateAnnounceResponse(info_hash, peer_id, compact);

    res.set("Content-Type", "text/plain");
    res.send(bencode.encode(response));
  } catch (error) {
    console.error("Announce error:", error);
    sendError(res, "Internal tracker error");
  }
}

function processAnnounce(info_hash: string, peer: Peer, event?: string): void {
  if (!torrents[info_hash]) {
    torrents[info_hash] = {};
  }

  if (event === "stopped") {
    delete torrents[info_hash][peer.peer_id];
  } else {
    torrents[info_hash][peer.peer_id] = peer;
  }

  if (Object.keys(torrents[info_hash]).length === 0) {
    delete torrents[info_hash];
  }
}

function generateAnnounceResponse(
  info_hash: string,
  requestingPeerId: string,
  compact: boolean
): AnnounceResponse {
  const swarm = torrents[info_hash] || {};

  let seeders = 0;
  let leechers = 0;

  Object.values(swarm).forEach((p) => {
    if (p.left === 0) seeders++;
    else leechers++;
  });

  const peerList = Object.values(swarm).filter(
    (p) => p.peer_id !== requestingPeerId
  );

  const response: AnnounceResponse = {
    interval: defaultAnnounceInterval,
    complete: seeders,
    incomplete: leechers,
    peers: compact
      ? createCompactPeerList(peerList)
      : createDictionaryPeerList(peerList),
  };

  return response;
}

function createCompactPeerList(peers: Peer[]): Buffer {
  const buffer = Buffer.alloc(peers.length * 6);

  peers.forEach((peer, i) => {
    const offset = i * 6;
    const ipParts = peer.ip.split(".").map(Number);

    for (let j = 0; j < 4; j++) {
      buffer[offset + j] = ipParts[j] || 0;
    }

    buffer[offset + 4] = (peer.port >> 8) & 0xff;
    buffer[offset + 5] = peer.port & 0xff;
  });

  return buffer;
}

function createDictionaryPeerList(
  peers: Peer[]
): Array<{ peer_id: string; ip: string; port: number }> {
  return peers.map((p) => ({
    peer_id: p.peer_id,
    ip: p.ip,
    port: p.port,
  }));
}

function sendError(res: Response, message: string): void {
  res.set("Content-Type", "text/plain");
  res.status(400).send(
    bencode.encode({
      "failure reason": message,
    })
  );
}

export function handleStats(_req: Request, res: Response): void {
  try {
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
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export function handleScrape(req: Request, res: Response): void {
  try {
    const { query } = parse(req.url ?? "", false);
    const params = parseQuery(query ?? undefined);

    const info_hashes = Array.isArray(params["info_hash"])
      ? params["info_hash"]
      : params["info_hash"]
        ? [params["info_hash"]]
        : [];

    const files: Record<string, any> = {};

    if (info_hashes.length > 0) {
      for (const info_hash of info_hashes) {
        if (torrents[info_hash]) {
          files[info_hash] = getScrapeData(torrents, info_hash);
        }
      }
    } else {
      const allHashes = Object.keys(torrents).slice(0, 100);
      for (const info_hash of allHashes) {
        files[info_hash] = getScrapeData(torrents, info_hash);
      }
    }

    res.set("Content-Type", "text/plain");
    res.send(bencode.encode({ files }));
  } catch (error) {
    console.error("Scrape error:", error);
    res.status(500).send(
      bencode.encode({
        "failure reason": "Internal server error",
      })
    );
  }
}

export function cleanupInactivePeers(): void {
  const now = Date.now();
  let changesDetected = false;

  for (const [infoHash, swarm] of Object.entries(torrents)) {
    for (const [peerId, peer] of Object.entries(swarm)) {
      if (now - peer.lastSeen > peerExpirationTime) {
        delete torrents[infoHash][peerId];
        changesDetected = true;
      }
    }

    if (Object.keys(torrents[infoHash]).length === 0) {
      delete torrents[infoHash];
      changesDetected = true;
    }
  }

  if (changesDetected) {
    saveState(torrents);
  }
}
