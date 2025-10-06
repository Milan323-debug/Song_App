import express from "express";
import protectRoute from "../middleware/auth.middleware.js";
import { createPlaylist, getPlaylists, getPlaylist, updatePlaylist, deletePlaylist } from "../controllers/playlist.controller.js";

const router = express.Router();

router.get("/", getPlaylists);
router.get("/:id", getPlaylist);

// protected routes
router.post("/", protectRoute, createPlaylist);
router.put("/:id", protectRoute, updatePlaylist);
router.delete("/:id", protectRoute, deletePlaylist);

export default router;
