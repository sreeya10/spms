import { notificationsStore } from '../models/store.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = notificationsStore.find({ recipientId: req.user.id });
    const sorted = notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = sorted.filter(n => !n.isRead).length;

    return res.status(200).json({
      success: true,
      count: sorted.length,
      unreadCount,
      notifications: sorted
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const notif = notificationsStore.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (notif.recipientId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = notificationsStore.findByIdAndUpdate(notif._id, {
      isRead: true,
      readAt: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'Marked as read.',
      notification: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    const userNotifs = notificationsStore.find({ recipientId: req.user.id, isRead: false });
    userNotifs.forEach(n => {
      notificationsStore.findByIdAndUpdate(n._id, {
        isRead: true,
        readAt: new Date().toISOString()
      });
    });

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
