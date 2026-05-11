import { peerExpirationTime } from "../types";
import redis from "./redis";

export async function cleanupInactivePeers(): Promise<void> {
  const now = Date.now();
  const keyStream = redis.scanStream({ match: "torrent:*", count: 500 });

  for await (const keys of keyStream) {
    for (const key of keys) {
      const stalePeers: string[] = [];
      const peerStream = redis.hscanStream(key, { count: 200 });

      for await (const chunk of peerStream) {
        for (let i = 0; i < chunk.length; i += 2) {
          const peerId = chunk[i];
          const peerData = chunk[i + 1];
          if (!peerData) continue;
          const peer = JSON.parse(peerData);
          if (now - peer.lastSeen > peerExpirationTime) {
            stalePeers.push(peerId);
          }
        }
      }

      if (stalePeers.length > 0) {
        await redis.hdel(key, ...stalePeers);
      }

      const remainingPeers = await redis.hlen(key);
      if (remainingPeers === 0) {
        await redis.del(key);
      }
    }
  }
}

export let blacklist: string[] = [];

export function loadBlacklist(newBlacklist: string[]): void {
  blacklist = newBlacklist;
}
