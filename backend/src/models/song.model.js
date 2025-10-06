import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    artist: { type: String, default: "" },
    url: { type: String, required: true },
    publicId: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    // optional artwork (cover image)
    artworkUrl: { type: String, default: "" },
    artworkPublicId: { type: String, default: "" },
    artworkMimeType: { type: String, default: "" },
    artworkSize: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Song = mongoose.model("Song", songSchema);

export default Song;
