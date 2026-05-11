"use strict";

import { Request, Response, Router } from "express";
import { parse } from "url";
import bencode from "bencode";
import { parseQuery } from "../../utils";
import redis from "../../lib/redis";
import { blacklist } from "../../lib/store";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
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
        if (blacklist.includes(info_hash)) continue;
        const torrentKey = `torrent:${info_hash}`;
        const swarmData = await redis.hvals(torrentKey);
        if (swarmData.length > 0) {
          let complete = 0;
          let incomplete = 0;
          swarmData.forEach((p) => {
            const peer = JSON.parse(p);
            if (peer.left === 0) complete++;
            else incomplete++;
          });
          files[info_hash] = { complete, incomplete, downloaded: 0 };
        }
      }
    } else {
      const allTorrentKeys = await redis.keys("torrent:*");
      for (const torrentKey of allTorrentKeys) {
        const info_hash = torrentKey.replace("torrent:", "");
        if (blacklist.includes(info_hash)) continue;
        const swarmData = await redis.hvals(torrentKey);
        let complete = 0;
        let incomplete = 0;
        swarmData.forEach((p) => {
          const peer = JSON.parse(p);
          if (peer.left === 0) complete++;
          else incomplete++;
        });
        files[info_hash] = { complete, incomplete, downloaded: 0 };
      }
    }

    res.set("Content-Type", "text/plain");
    res.send(bencode.encode({ files }));
  } catch (error) {
    console.error("Scrape error:", error);
    res.status(500).send(
      bencode.encode({
        "failure reason": "Internal server error",
      }),
    );
  }
});

export default router;
