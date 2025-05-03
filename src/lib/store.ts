import { Torrents, peerExpirationTime } from "../types";
import { saveState } from "../utils";

export const torrents: Torrents = {};

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
