import asyncHandler from "express-async-handler";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const notifications = await Notification.find({ to: user._id })
    .sort({ createdAt: -1 })
    .populate("from", "username firstName lastName profileImage");

  res.status(200).json({ notifications });
});

export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const user = req.user;
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    to: user._id,
  });

  if (!notification) return res.status(404).json({ error: "Notification not found" });

  res.status(200).json({ message: "Notification deleted successfully" });
});