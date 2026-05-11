import { peerExpirationTime } from "../types";
import redis from "./redis";

export async function cleanupInactivePeers(): Promise<void> {
  const now = Date.now();
  const infoHashes = await redis.keys("torrent:*");

  for (const infoHashKey of infoHashes) {
    const infoHash = infoHashKey.replace("torrent:", "");
    const peerIds = await redis.hkeys(infoHashKey);

    for (const peerId of peerIds) {
      const peerData = await redis.hget(infoHashKey, peerId);
      if (peerData) {
        const peer = JSON.parse(peerData);
        if (now - peer.lastSeen > peerExpirationTime) {
          await redis.hdel(infoHashKey, peerId);
        }
      }
    }

    const remainingPeers = await redis.hlen(infoHashKey);
    if (remainingPeers === 0) {
      await redis.del(infoHashKey);
    }
  }
}

export let blacklist: string[] = [];

export function loadBlacklist(newBlacklist: string[]): void {
  blacklist = newBlacklist;
}
