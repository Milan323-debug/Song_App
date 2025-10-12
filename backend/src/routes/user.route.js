import express from "express";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  getUserById,
  getUsersBatch,
  syncUser,
  updateProfile,
  getLikedSongs,
  addLikedSong,
  removeLikedSong,
} from "../controllers/user.controller.js";
import upload from "../middleware/upload.middleware.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// public route
router.get("/profile/:username", getUserProfile);
// fetch user by id
router.get("/:id", getUserById);
// batch fetch users by ids
router.post('/batch', getUsersBatch);

// protected routes
router.post("/sync", protectRoute, syncUser);
router.get("/me", protectRoute, getCurrentUser);
// allow multipart upload for profileImage (field name: 'profileImage')
router.put("/profile", protectRoute, upload.single("profileImage"), updateProfile);
router.post("/follow/:targetUserId", protectRoute, followUser);

// liked songs
router.get('/liked', protectRoute, getLikedSongs);
router.post('/liked', protectRoute, addLikedSong);
router.delete('/liked/:songId', protectRoute, removeLikedSong);

export default router;