import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/user.model.js';
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

export default {};
