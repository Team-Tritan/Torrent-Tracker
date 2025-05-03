"use strict";

import { Router } from "express";
import { handleAnnounce, handleScrape, handleStats } from "../lib/tracker";

const router = Router();

router.get("/announce", handleAnnounce);
router.get("/scrape", handleScrape);
router.get("/stats", handleStats);

router.get("/", (req, res) => {
  res.end();
});

router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default router;
