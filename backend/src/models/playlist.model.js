import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    songs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }],
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Playlist = mongoose.model("Playlist", playlistSchema);

export default Playlist;
