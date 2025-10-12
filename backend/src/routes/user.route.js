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
// temporary debug route: return raw likedSong ids (no populate) to help diagnose populate failures
router.get('/liked/raw', protectRoute, (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ message: 'Not authenticated' });
    // find user and return liked ids
    return User.findById(req.user._id).select('likedSongs').then(u => {
      if (!u) return res.status(404).json({ message: 'User not found' });
      console.log('debug /liked/raw liked count=', (u.likedSongs || []).length);
      return res.status(200).json({ liked: u.likedSongs || [] });
    }).catch(err => {
      console.error('debug /liked/raw error', err);
      return res.status(500).json({ message: 'Failed to fetch liked (raw)' });
    });
  } catch (err) {
    console.error('debug /liked/raw unexpected', err);
    return res.status(500).json({ message: 'Failed' });
  }
});
router.post('/liked', protectRoute, addLikedSong);
router.delete('/liked/:songId', protectRoute, removeLikedSong);

export default router;