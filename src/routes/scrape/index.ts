"use strict";

import { Request, Response, Router } from "express";
import { parse } from "url";
import bencode from "bencode";
import { parseQuery, getScrapeData } from "../../utils";
import { torrents } from "../../lib/store";

const router = Router();

router.get("/", (req: Request, res: Response) => {
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
});

export default router;
