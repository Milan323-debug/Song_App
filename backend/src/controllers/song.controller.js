import asyncHandler from "express-async-handler";
import mongoose from 'mongoose';
import Song from "../models/song.model.js";
import User from "../models/user.model.js";
import cloudinary from "../config/cloudinary.js";
import { ENV } from "../config/env.js";

// list recent songs
export const getSongs = asyncHandler(async (req, res) => {
  // Support optional filtering by userId query parameter. Accepts either a Mongo ObjectId or a username.
  const { userId } = req.query || {};
  const filter = {};
  if (userId) {
    // If it's a valid ObjectId, filter by user field
    if (mongoose.Types.ObjectId.isValid(String(userId))) {
      filter.user = String(userId);
    } else {
      // Otherwise, try to resolve as username
      try {
        const u = await User.findOne({ username: String(userId) }).select('_id');
        if (u && u._id) filter.user = u._id;
      } catch (e) {
        // ignore and return an empty list later if user not found
      }
    }
  }
  const songs = await Song.find(filter).sort({ createdAt: -1 }).populate('user', 'username firstName lastName profileImage');
  res.status(200).json({ songs });
});

export const getUserSongs = asyncHandler(async (req, res) => {
  const { username } = req.params;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const songs = await Song.find({ user: user._id }).sort({ createdAt: -1 });
  res.status(200).json({ songs });
});

export const createSong = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { title, artist } = req.body;
  const file = req.file;
  // optional artwork fields (if client uploaded artwork separately)
  const artworkUrl = req.body.artworkUrl || null;
  const artworkPublicId = req.body.artworkPublicId || null;

  // Support two flows:
  // 1) direct upload: client uploaded file to Cloudinary first and passes publicId+url in body
  // 2) server upload: client uploaded file via server (multipart) and req.file is present
  const publicId = req.body.publicId || null;
  const url = req.body.url || null;

  if (!file && !(publicId && url)) return res.status(400).json({ error: 'No file uploaded or file metadata provided' });
  if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' });

  try {
    let created;
    if (file) {
      const base64Data = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'application/octet-stream';
      const resourceType = isAudio ? 'raw' : (file.mimetype.startsWith('video/') ? 'video' : 'raw');
      const uploadOptions = { folder: 'songs', resource_type: resourceType, chunk_size: 6000000 };
      const uploadResponse = await cloudinary.uploader.upload(base64Data, uploadOptions);
      created = await Song.create({
        user: user._id,
        title: title.trim(),
        artist: (artist || '').trim(),
        url: uploadResponse.secure_url || uploadResponse.url || '',
        publicId: uploadResponse.public_id || '',
        mimeType: file.mimetype,
        size: file.size || 0,
        // if artwork metadata provided in body, include it
        artworkUrl: artworkUrl || req.body.artworkUrl || '',
        artworkPublicId: artworkPublicId || req.body.artworkPublicId || '',
      });
    } else {
      // pre-uploaded to Cloudinary path
      created = await Song.create({
        user: user._id,
        title: title.trim(),
        artist: (artist || '').trim(),
        url: url,
        publicId: publicId,
        mimeType: req.body.mimeType || '',
        size: req.body.size || 0,
        artworkUrl: artworkUrl || req.body.artworkUrl || '',
        artworkPublicId: artworkPublicId || req.body.artworkPublicId || '',
      });
    }

    res.status(201).json({ song: created });
  } catch (e) {
    console.error('createSong error', e);
    res.status(500).json({ error: 'Failed to upload song' });
  }
});

// generate a signed upload payload for direct-to-cloudinary uploads
export const getUploadSignature = asyncHandler(async (req, res) => {
  // require auth
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { publicId, folder, resource_type } = req.body || {};
  const timestamp = Math.floor(Date.now() / 1000);
  // Sign only the parameters that will be sent reliably (timestamp, folder, public_id, resource_type)
  const paramsToSign = { timestamp };
  if (folder) paramsToSign.folder = folder;
  if (publicId) paramsToSign.public_id = publicId;
  if (resource_type) paramsToSign.resource_type = resource_type;

  // cloudinary.utils.api_sign_request requires the params and the API secret
  const signature = cloudinary.utils.api_sign_request(paramsToSign, ENV.CLOUDINARY_API_SECRET);

  // Echo back folder and resource_type so the client can include them in the upload form
  return res.json({
    signature,
    timestamp,
    api_key: ENV.CLOUDINARY_API_KEY,
    cloud_name: ENV.CLOUDINARY_CLOUD_NAME,
    folder: folder || undefined,
    resource_type: resource_type || undefined,
  });
});

export const deleteSong = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  const { songId } = req.params;
  const song = await Song.findById(songId);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  // only owner can delete
  if (song.user.toString() !== user._id.toString()) {
    return res.status(403).json({ error: 'Not allowed to delete this song' });
  }

  try {
    if (song.publicId) {
      try {
        // delete raw resource from Cloudinary
        await cloudinary.uploader.destroy(song.publicId, { resource_type: 'raw' });
      } catch (e) {
        console.warn('Failed to delete cloudinary resource for song', e);
      }
    }
    // delete artwork resource if exists
    if (song.artworkPublicId) {
      try {
        await cloudinary.uploader.destroy(song.artworkPublicId, { resource_type: 'image' });
      } catch (e) {
        console.warn('Failed to delete cloudinary artwork for song', e);
      }
    }

    await Song.findByIdAndDelete(songId);
    res.status(200).json({ message: 'Song deleted' });
  } catch (e) {
    console.error('deleteSong error', e);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

// Toggle like/unlike for a song by the authenticated user
export const toggleLike = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const { songId } = req.params;
  if (!songId) return res.status(400).json({ error: 'Missing songId' });

  const song = await Song.findById(songId);
  if (!song) return res.status(404).json({ error: 'Song not found' });

  // determine if user already liked
  const already = Array.isArray(user.likedSongs) && user.likedSongs.some((s) => String(s) === String(song._id));

  if (!already) {
    // like: add to user.likedSongs and increment song.likesCount
    user.likedSongs = user.likedSongs || [];
    user.likedSongs.push(song._id);
    song.likesCount = (song.likesCount || 0) + 1;
  } else {
    // unlike: remove and decrement (not below 0)
    user.likedSongs = (user.likedSongs || []).filter((s) => String(s) !== String(song._id));
    song.likesCount = Math.max(0, (song.likesCount || 0) - 1);
  }

  // Save both documents; do best-effort transaction if available
  try {
    const session = await Song.db.startSession();
    try {
      await session.withTransaction(async () => {
        await user.save({ session });
        await song.save({ session });
      });
    } finally {
      session.endSession();
    }
  } catch (e) {
    // Transactions might not be available; fall back to sequential saves
    await user.save();
    await song.save();
  }

  return res.status(200).json({ liked: !already, likesCount: song.likesCount });
});

// Return popular songs sorted by likesCount desc with pagination
export const getPopular = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const total = await Song.countDocuments();
  const songs = await Song.find()
    .sort({ likesCount: -1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username profileImage');

  res.status(200).json({ songs, page, limit, total });
});
