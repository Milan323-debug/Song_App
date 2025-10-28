import asyncHandler from "express-async-handler";
import Playlist from "../models/playlist.model.js";
import Song from "../models/song.model.js";

// Create a playlist - protected
export const createPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title, description, songs, imageUrl, artworkUrl } = req.body;

  if (!title) return res.status(400).json({ error: "Title is required" });

  // Validate song IDs if provided
  let validSongs = [];
  if (Array.isArray(songs) && songs.length > 0) {
    // Ensure songs exist
    const found = await Song.find({ _id: { $in: songs } }).select("_id");
    validSongs = found.map((s) => s._id);
  }

  // prefer explicit imageUrl or artworkUrl from client
  const posterUrl = imageUrl || artworkUrl || undefined;

  const playlist = await Playlist.create({
    title,
    description: description || "",
    user: user._id,
    songs: validSongs,
    ...(posterUrl ? { imageUrl: posterUrl } : {}),
  });
  // populate user and songs for immediate client consumption
  const populated = await Playlist.findById(playlist._id).populate('user', 'username profileImage').populate('songs');
  res.status(201).json({ playlist: populated });
});

// Get all playlists (publicly readable)
export const getPlaylists = asyncHandler(async (req, res) => {
  let playlists = await Playlist.find({}).sort({ createdAt: -1 }).populate("user", "username profileImage").populate("songs");
  // Order songs so recently-added appear first (reverse stored array)
  playlists = playlists.map(pl => {
    const p = pl.toObject ? pl.toObject() : pl
    p.songs = Array.isArray(p.songs) ? p.songs.slice().reverse() : []
    return p
  })
  res.status(200).json({ playlists });
});

// Get current user's playlists (protected)
export const getMyPlaylists = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  let playlists = await Playlist.find({ user: user._id }).sort({ createdAt: -1 }).populate('user', 'username profileImage').populate('songs');
  playlists = playlists.map(pl => {
    const p = pl.toObject ? pl.toObject() : pl
    p.songs = Array.isArray(p.songs) ? p.songs.slice().reverse() : []
    return p
  })
  res.status(200).json({ playlists });
});

// Get single playlist
export const getPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const playlist = await Playlist.findById(id)
      .populate("user", "username profileImage")
      .populate({
        path: "songs",
        select: "_id title artist artworkUrl duration url createdAt updatedAt"
      })
      .lean();
    
    if (!playlist) {
      return res.status(404).json({ error: "Playlist not found" });
    }

    // Ensure songs array exists and is populated
    if (!playlist.songs) {
      playlist.songs = [];
    }
    // Return songs with most-recently-added first (reverse stored order)
    playlist.songs = Array.isArray(playlist.songs) ? playlist.songs.slice().reverse() : []
    res.status(200).json({ playlist });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: "Failed to fetch playlist" });
  }
});

// Update playlist (only owner)
export const updatePlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { title, description, songs, imageUrl, artworkUrl } = req.body;

  const playlist = await Playlist.findById(id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  if (String(playlist.user) !== String(user._id)) return res.status(403).json({ error: "Not authorized" });

  if (title) playlist.title = title;
  if (typeof description !== "undefined") playlist.description = description;
  if (Array.isArray(songs)) {
    // validate song ids
    const found = await Song.find({ _id: { $in: songs } }).select("_id");
    playlist.songs = found.map((s) => s._id);
  }

  // allow updating poster image
  const posterUrl = imageUrl || artworkUrl;
  if (typeof posterUrl !== 'undefined') playlist.imageUrl = posterUrl;

  await playlist.save();
  const updated = await Playlist.findById(id).populate("user", "username profileImage").populate("songs");
  res.status(200).json({ playlist: updated });
});

// Delete playlist (only owner)
export const deletePlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const playlist = await Playlist.findById(id);
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  if (String(playlist.user) !== String(user._id)) return res.status(403).json({ error: "Not authorized" });
  await Playlist.findByIdAndDelete(id);
  res.status(200).json({ message: "Playlist deleted" });
});
