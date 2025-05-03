"use strict";

import { Router, Request, Response } from "express";
import announceRouter from "./announce";
import scrapeRouter from "./scrape";
import statsRouter from "./stats";
import healthRouter from "./health";

const router = Router();

router.use("/announce", announceRouter);
router.use("/scrape", scrapeRouter);
router.use("/stats", statsRouter);
router.use("/health", healthRouter);

router.use((_req: Request, res: Response) => {
  res.end();
});

export default router;
