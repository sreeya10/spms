import {
  notificationsStore,
  projectsStore,
  teamMembersStore,
  usersStore
} from '../models/store.js';

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

/**
 * Dispatches a persistent notification / risk alert to all students in a specified project group.
 * Strictly checks that sender is faculty supervising the project (or admin).
 */
export const sendGroupNotification = async (req, res) => {
  try {
    const { projectId, title, message, type, severity } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Notification title is required.' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Notification message body is required.' });
    }
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Target project group ID is required.' });
    }

    // Role check: Only faculty or admin can dispatch group notifications
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty members or administrators can send project group notifications.'
      });
    }

    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Target project group not found.' });
    }

    // Authorization check: faculty can only send to projects they supervise or within their department
    if (req.user.role === 'faculty') {
      const isSupervisor = project.facultySupervisorId === req.user.id;
      const isSameDept = project.department === req.user.department;
      if (!isSupervisor && !isSameDept) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: You are not authorized to send messages to this project group.'
        });
      }
    }

    // Identify recipient students in the project group (leader + members)
    const recipientUserIds = new Set();
    if (project.leaderId && project.leaderId !== req.user.id) {
      recipientUserIds.add(project.leaderId);
    }

    const teamMembers = teamMembersStore.find({ projectId: project._id });
    teamMembers.forEach(tm => {
      if (tm.userId && tm.userId !== req.user.id) {
        recipientUserIds.add(tm.userId);
      }
    });

    if (recipientUserIds.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student members found registered in this project group.'
      });
    }

    // Persist notification for each group member
    const createdNotifications = [];
    for (const studentId of recipientUserIds) {
      const student = usersStore.findById(studentId);
      const notif = notificationsStore.create({
        recipientId: studentId,
        recipientEmail: student?.email || '',
        recipientName: student?.name || '',
        senderId: req.user.id,
        senderName: req.user.name,
        senderRole: req.user.role,
        projectId: project._id,
        projectTitle: project.title,
        title: title.trim(),
        message: message.trim(),
        type: type || 'risk_alert',
        severity: severity || (type === 'risk_alert' ? 'High' : null),
        isRead: false,
        createdAt: new Date().toISOString()
      });
      createdNotifications.push(notif);
    }

    return res.status(201).json({
      success: true,
      message: `Notification successfully delivered to ${createdNotifications.length} student(s) in "${project.title}".`,
      count: createdNotifications.length,
      projectId: project._id,
      projectTitle: project.title
    });
  } catch (err) {
    console.error('Error sending group notification:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to dispatch group notification.' });
  }
};
