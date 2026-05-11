"use strict";

import { Router, Request, Response } from "express";
import announceRouter from "./announce";
import scrapeRouter from "./scrape";
import statsRouter from "./stats";
import healthRouter from "./health";
import torrentRouter from "./torrent";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.sendFile("index.html", {
    root: `${process.cwd()}/dist/pages`,
  });
});

router.use("/announce", announceRouter);
router.use("/scrape", scrapeRouter);
router.use("/stats", statsRouter);
router.use("/health", healthRouter);
router.use("/torrent", torrentRouter);

router.use((_req: Request, res: Response) => {
  res.status(404).json({ status: 404, message: "Route not found" });
});

export default router;
