import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Song from '../models/song.model.js';
import cloudinary from '../config/cloudinary.js';
import Notification from '../models/notification.model.js';

// Get current authenticated user
export const getCurrentUser = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });
	res.status(200).json({ user });
});

// Get public profile by username
export const getUserProfile = asyncHandler(async (req, res) => {
	const { username } = req.params;
	const user = await User.findOne({ username }).select('-password');
	if (!user) return res.status(404).json({ message: 'User not found' });
	const followersCount = Array.isArray(user.followers) ? user.followers.length : 0;
	const followingCount = Array.isArray(user.following) ? user.following.length : 0;
	res.status(200).json({ user, followersCount, followingCount });
});

// Get user by id (public)
export const getUserById = asyncHandler(async (req, res) => {
	const { id } = req.params;
	if (!id) return res.status(400).json({ message: 'Missing user id' });
	const user = await User.findById(id).select('-password');
	if (!user) return res.status(404).json({ message: 'User not found' });
	res.status(200).json({ user });
});

// Batch fetch users by array of ids
export const getUsersBatch = asyncHandler(async (req, res) => {
	const { ids } = req.body || {};
	console.log('getUsersBatch: received ids count=', Array.isArray(ids) ? ids.length : typeof ids);
	if (!Array.isArray(ids) || ids.length === 0) {
		// return empty list (frontend can handle) instead of error to avoid noisy warnings
		return res.status(200).json({ users: [] });
	}
	try {
		const users = await User.find({ _id: { $in: ids } }).select('-password');
		return res.status(200).json({ users });
	} catch (e) {
		console.error('getUsersBatch: error fetching users', e);
		return res.status(500).json({ message: 'Failed to fetch users', users: [] });
	}
});

// Sync user (placeholder - ensure user exists / create minimal record)
export const syncUser = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });
	// This endpoint can be used to refresh profile data from external auth provider
	res.status(200).json({ user });
});

// Update profile
export const updateProfile = asyncHandler(async (req, res) => {
	const user = req.user;
	if (!user) return res.status(401).json({ message: 'Not authenticated' });

	// If multer processed a 'profileImage' file, it'll be available as req.file
	// If multer processed other files (like bannerImage), they may be in req.files
	const updates = req.body || {};

	// handle multipart upload for profileImage (single file)
	const profileFile = req.file; // from upload.single('profileImage')
	if (profileFile && profileFile.buffer) {
		try {
			const base64Image = `data:${profileFile.mimetype};base64,${profileFile.buffer.toString('base64')}`;
			const uploadResponse = await cloudinary.uploader.upload(base64Image, {
				folder: 'profile_images',
				resource_type: 'image',
				transformation: [
					{ width: 800, height: 800, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.profileImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (profileFile):', uploadErr);
		}
	}
	const allowed = ['firstName', 'lastName', 'bio', 'location', 'profileImage', 'bannerImage'];
	// If profileImage or bannerImage is a base64 data URI (sent in body), upload to Cloudinary
	if (updates.profileImage && typeof updates.profileImage === 'string' && updates.profileImage.startsWith('data:')) {
		try {
			const uploadResponse = await cloudinary.uploader.upload(updates.profileImage, {
				folder: 'profile_images',
				resource_type: 'image',
				transformation: [
					{ width: 800, height: 800, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.profileImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (profileImage):', uploadErr);
			// leave updates.profileImage as-is; we'll still try to set it if it's a URL
		}
	}

	if (updates.bannerImage && typeof updates.bannerImage === 'string' && updates.bannerImage.startsWith('data:')) {
		try {
			const uploadResponse = await cloudinary.uploader.upload(updates.bannerImage, {
				folder: 'profile_banners',
				resource_type: 'image',
				transformation: [
					{ width: 1200, height: 400, crop: 'limit' },
					{ quality: 'auto' },
					{ format: 'auto' },
				],
			});
			updates.bannerImage = uploadResponse.secure_url;
		} catch (uploadErr) {
			console.error('Cloudinary upload error (bannerImage):', uploadErr);
		}
	}

	Object.keys(updates).forEach((key) => {
		if (allowed.includes(key)) user[key] = updates[key];
	});

	await user.save();
	res.status(200).json({ user });
});

// Follow / unfollow user
export const followUser = asyncHandler(async (req, res) => {
	const currentUser = req.user;
	const { targetUserId } = req.params;
	if (!currentUser) return res.status(401).json({ message: 'Not authenticated' });

	if (currentUser._id.toString() === targetUserId) {
		return res.status(400).json({ message: "You can't follow yourself" });
	}

	const targetUser = await User.findById(targetUserId);
	if (!targetUser) return res.status(404).json({ message: 'Target user not found' });

	console.log(`followUser: actor=${currentUser._id.toString()} target=${targetUserId}`);
	// determine current following state by checking whether current user is in target's followers
	const isFollowing = (targetUser.followers || []).some((f) => f.toString() === currentUser._id.toString());
	console.log('followUser: initial isFollowing=', isFollowing);

	// We'll attempt a transaction when possible and fall back to non-transactional updates.
	let session = null;
	let updatedTarget = null;
	let updatedCurrent = null;

	const performUnfollow = async (opts = {}) => {
		const { session } = opts;
		updatedTarget = await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUser._id } }, { new: true, session }).select('followers');
		updatedCurrent = await User.findByIdAndUpdate(currentUser._id, { $pull: { following: targetUser._id } }, { new: true, session }).select('following');
		// remove follow notifications
		await Notification.deleteMany({ from: currentUser._id, to: targetUser._id, type: 'follow' }, { session }).catch(() => {});
	};

	const performFollow = async (opts = {}) => {
		const { session } = opts;
		updatedTarget = await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUser._id } }, { new: true, session }).select('followers');
		updatedCurrent = await User.findByIdAndUpdate(currentUser._id, { $addToSet: { following: targetUser._id } }, { new: true, session }).select('following');
		try {
			await Notification.create([{ from: currentUser._id, to: targetUser._id, type: 'follow' }], { session });
		} catch (e) {
			console.warn('followUser: create notification failed', e);
		}
	};

	try {
		session = await mongoose.startSession();
		try {
			await session.withTransaction(async () => {
				if (isFollowing) {
					await performUnfollow({ session });
				} else {
					await performFollow({ session });
				}
			});
		} finally {
			session.endSession();
		}
	} catch (txErr) {
		// Transactions may not be supported (e.g., standalone mongod). Fall back to sequential non-transactional updates.
		console.warn('followUser: transactions not available, falling back', txErr.message || txErr);
		try {
			if (isFollowing) {
				await performUnfollow({});
			} else {
				await performFollow({});
			}
		} catch (err) {
			console.error('followUser: error during fallback updates', err);
			return res.status(500).json({ message: isFollowing ? 'Failed to unfollow user' : 'Failed to follow user' });
		}
	}

	// ensure we have the latest counts (in case updates didn't return full arrays)
	try {
		if (!updatedTarget) updatedTarget = await User.findById(targetUserId).select('followers');
		if (!updatedCurrent) updatedCurrent = await User.findById(currentUser._id).select('following');
	} catch (e) {
		console.warn('followUser: failed to re-fetch updated users', e);
	}

	const followersCount = Array.isArray(updatedTarget?.followers) ? updatedTarget.followers.length : 0;
	const followingCount = Array.isArray(updatedCurrent?.following) ? updatedCurrent.following.length : 0;

	console.log(`followUser: completed action=${isFollowing ? 'unfollow' : 'follow'} targetFollowers=${followersCount} currentFollowing=${followingCount}`);

	return res.status(200).json({ message: isFollowing ? 'Unfollowed user' : 'Followed user', isFollowing: !isFollowing, followersCount, followingCount });
});

// Get liked songs for current user
export const getLikedSongs = asyncHandler(async (req, res) => {
	try {
		const user = req.user;
		if (!user || !user._id) return res.status(401).json({ message: 'Not authenticated' });

		const found = await User.findById(user._id).select('likedSongs').lean();
		if (!found) return res.status(404).json({ message: 'User not found' });

		const raw = Array.isArray(found.likedSongs) ? found.likedSongs : [];
		if (raw.length === 0) return res.status(200).json({ songs: [] });

		// Normalize various shapes like string, ObjectId, { $oid: '...' }, { _id: { $oid: '...' } }
		const normalize = (entry) => {
			if (!entry && entry !== 0) return null;
			if (typeof entry === 'string') return entry;
			if (entry instanceof mongoose.Types.ObjectId) return String(entry);
			if (typeof entry === 'object') {
				if (entry.$oid && typeof entry.$oid === 'string') return entry.$oid;
				if (entry._id && typeof entry._id === 'object' && entry._id.$oid) return entry._id.$oid;
				if (entry.id && typeof entry.id === 'string') return entry.id;
				// If the object looks like {"$binary":...} or other BSON forms, try JSON stringify then regex - last resort
				try {
					const s = JSON.stringify(entry);
					const m = s.match(/"\$oid"\s*:\s*"([a-fA-F0-9]{24})"/);
					if (m) return m[1];
				} catch (e) {}
			}
			return null;
		};

		const extracted = raw.map(normalize).filter(Boolean);
		console.log('getLikedSongs: raw sample=', raw.slice(0,5));
		console.log('getLikedSongs: extracted ids sample=', extracted.slice(0,5));

		const validIds = extracted.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
		console.log('getLikedSongs: validIds sample=', validIds.slice(0,10));
		if (validIds.length === 0) {
			// No valid ids after normalization — return empty list rather than error
			return res.status(200).json({ songs: [] });
		}

		// Coerce to ObjectId array to avoid CastError when passing unusual strings
		const objectIds = validIds.map((id) => mongoose.Types.ObjectId(String(id)));
		let songs;
		try {
			songs = await Song.find({ _id: { $in: objectIds } }).populate('user', 'username profileImage').lean();
		} catch (findErr) {
			console.error('getLikedSongs: Song.find failed', findErr && findErr.stack ? findErr.stack : findErr);
			// If Song.find fails for some reason, return empty list to avoid 500 loops on the client
			return res.status(200).json({ songs: [] });
		}

		return res.status(200).json({ songs });
	} catch (err) {
		console.error('getLikedSongs: unexpected error', err && err.stack ? err.stack : err);
		return res.status(500).json({ error: 'Internal Server Error' });
	}
});

// Public endpoint: get liked songs for a given user id (paginated)
export const getUserLikedSongs = asyncHandler(async (req, res) => {
	const { userId } = req.params;
	if (!userId) return res.status(400).json({ message: 'Missing userId' });
	const page = Math.max(1, parseInt(req.query.page) || 1);
	const limit = Math.min(100, parseInt(req.query.limit) || 20);
	const skip = (page - 1) * limit;

	const user = await User.findById(userId).select('likedSongs');
	if (!user) return res.status(404).json({ message: 'User not found' });

	const ids = Array.isArray(user.likedSongs) ? user.likedSongs : [];
	const total = ids.length;
	const pageIds = ids.slice(skip, skip + limit).filter(id => mongoose.Types.ObjectId.isValid(String(id)));

	const songs = await Song.find({ _id: { $in: pageIds } }).populate('user', 'username profileImage').lean();

	return res.status(200).json({ songs, page, limit, total });
});

// Add a song to liked songs
export const addLikedSong = asyncHandler(async (req, res) => {
	try {
		if (!req.user || !req.user._id) return res.status(401).json({ message: 'Not authenticated' });
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		const { songId, remove } = req.body || {};
		if (!songId) return res.status(400).json({ message: 'Missing songId' });
		// toggle behavior if remove flag provided
		if (remove) {
			user.likedSongs = (user.likedSongs || []).filter((s) => s.toString() !== songId.toString());
			await user.save();
			return res.status(200).json({ message: 'Removed from liked', songId });
		}
		// add if not present
		const exists = (user.likedSongs || []).some((s) => s.toString() === songId.toString());
		if (!exists) {
			user.likedSongs = user.likedSongs || [];
			user.likedSongs.push(songId);
			await user.save();
		}
		return res.status(200).json({ message: exists ? 'Already liked' : 'Added to liked', songId });
	} catch (err) {
		console.error('addLikedSong: unexpected error', err);
		return res.status(500).json({ message: 'Failed to update liked songs' });
	}
});

// Remove liked song by id (route param)
export const removeLikedSong = asyncHandler(async (req, res) => {
	try {
		const { songId } = req.params;
		if (!req.user || !req.user._id) return res.status(401).json({ message: 'Not authenticated' });
		const user = await User.findById(req.user._id);
		if (!user) return res.status(404).json({ message: 'User not found' });
		user.likedSongs = (user.likedSongs || []).filter((s) => s.toString() !== songId.toString());
		await user.save();
		return res.status(200).json({ message: 'Removed from liked', songId });
	} catch (err) {
		console.error('removeLikedSong: unexpected error', err);
		return res.status(500).json({ message: 'Failed to remove liked song' });
	}
});

export default {};
