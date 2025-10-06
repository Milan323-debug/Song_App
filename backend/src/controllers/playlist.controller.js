import asyncHandler from "express-async-handler";
import Playlist from "../models/playlist.model.js";
import Song from "../models/song.model.js";

// Create a playlist - protected
export const createPlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { title, description, songs } = req.body;

  if (!title) return res.status(400).json({ error: "Title is required" });

  // Validate song IDs if provided
  let validSongs = [];
  if (Array.isArray(songs) && songs.length > 0) {
    // Ensure songs exist
    const found = await Song.find({ _id: { $in: songs } }).select("_id");
    validSongs = found.map((s) => s._id);
  }

  const playlist = await Playlist.create({ title, description: description || "", user: user._id, songs: validSongs });
  res.status(201).json({ playlist });
});

// Get all playlists (publicly readable)
export const getPlaylists = asyncHandler(async (req, res) => {
  const playlists = await Playlist.find({}).sort({ createdAt: -1 }).populate("user", "username profileImage").populate("songs");
  res.status(200).json({ playlists });
});

// Get single playlist
export const getPlaylist = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const playlist = await Playlist.findById(id).populate("user", "username profileImage").populate("songs");
  if (!playlist) return res.status(404).json({ error: "Playlist not found" });
  res.status(200).json({ playlist });
});

// Update playlist (only owner)
export const updatePlaylist = asyncHandler(async (req, res) => {
  const user = req.user;
  const { id } = req.params;
  const { title, description, songs } = req.body;

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
