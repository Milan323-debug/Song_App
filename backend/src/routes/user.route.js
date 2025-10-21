import express from "express";
import User from "../models/user.model.js";
import {
  followUser,
  getCurrentUser,
  getUserProfile,
  getUserById,
  getUsersBatch,
  syncUser,
  updateProfile,
  getLikedSongs,
  getUserLikedSongs,
  addLikedSong,
  removeLikedSong,
} from "../controllers/user.controller.js";
import upload from "../middleware/upload.middleware.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// public route
router.get("/profile/:username", getUserProfile);
// batch fetch users by ids
router.post('/batch', getUsersBatch);

// protected routes
router.post("/sync", protectRoute, syncUser);
router.get("/me", protectRoute, getCurrentUser);
// allow multipart upload for profileImage and bannerImage
// accept either one or both files in the same request
router.put("/profile", protectRoute, upload.fields([{ name: 'profileImage', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]), updateProfile);
router.post("/follow/:targetUserId", protectRoute, followUser);

// liked songs
router.get('/liked', protectRoute, getLikedSongs);
// public: get liked songs for a userId (paginated)
router.get('/:userId/likes', getUserLikedSongs);
router.post('/liked', protectRoute, addLikedSong);
router.delete('/liked/:songId', protectRoute, removeLikedSong);

// fetch user by id (move below specific routes to avoid collisions like '/liked')
router.get('/:id', getUserById);

export default router;