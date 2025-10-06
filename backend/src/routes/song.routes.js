import express from 'express';
import { createSong, getSongs, getUserSongs, getUploadSignature, deleteSong } from '../controllers/song.controller.js';
import protectRoute from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = express.Router();

// public
router.get('/', getSongs);
router.get('/user/:username', getUserSongs);

// protected upload - accepts single file under 'file'
router.post('/', protectRoute, upload.single('file'), createSong);
// issue a signature for direct-to-cloudinary uploads
router.post('/sign', protectRoute, getUploadSignature);
router.delete('/:songId', protectRoute, deleteSong);

export default router;
