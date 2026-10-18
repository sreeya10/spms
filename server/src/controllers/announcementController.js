import {
  announcementsStore,
  notificationsStore,
  usersStore,
  projectsStore,
  teamMembersStore
} from '../models/store.js';
import { sendInstitutionalEmail } from '../services/emailService.js';

export const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      targetScope, // "all", "department", "project", "role"
      targetDepartment,
      targetProjectId,
      targetRole,
      type, // "announcement", "deadline", "review"
      sendEmail
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Announcement title and content are required.'
      });
    }

    const scope = targetScope || 'all';
    const dept = targetDepartment || (scope === 'department' ? req.user.department : null);

    const announcement = announcementsStore.create({
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      title: title.trim(),
      content: content.trim(),
      targetScope: scope,
      targetDepartment: dept,
      targetProjectId: targetProjectId || null,
      targetRole: targetRole || 'student',
      type: type || 'announcement',
      publishedAt: new Date().toISOString()
    });

    // REQ-4.3, 4.7: Fan out in-app notifications to intended users
    let targetUsers = [];

    if (scope === 'project' && targetProjectId) {
      const members = teamMembersStore.find({ projectId: targetProjectId });
      const memberUserIds = members.map(m => m.userId);
      targetUsers = usersStore.find().filter(u => memberUserIds.includes(u._id));
    } else if (scope === 'department' && dept) {
      targetUsers = usersStore.find().filter(u => 
        u.department === dept && (targetRole ? u.role === targetRole : u.role === 'student')
      );
    } else if (scope === 'role' && targetRole) {
      targetUsers = usersStore.find().filter(u => u.role === targetRole);
    } else {
      // Global: all students
      targetUsers = usersStore.find().filter(u => u.role === 'student');
    }

    targetUsers.forEach(u => {
      notificationsStore.create({
        recipientId: u._id,
        recipientEmail: u.email,
        announcementId: announcement._id,
        title: announcement.title,
        message: announcement.content,
        type: announcement.type,
        isRead: false
      });

      // Optional email notification
      if (sendEmail) {
        sendInstitutionalEmail({
          to: u.email,
          subject: `[SPMS Official Notice] ${announcement.title}`,
          html: `<h3>${announcement.title}</h3><p>${announcement.content}</p><p><small>Published by ${req.user.name} (${req.user.role.toUpperCase()})</small></p>`
        });
      }
    });

    return res.status(201).json({
      success: true,
      message: `Announcement published successfully and delivered to ${targetUsers.length} students.`,
      announcement,
      recipientsCount: targetUsers.length
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const { role, department, id } = req.user;
    const all = announcementsStore.find();

    // Filter relevant announcements
    const relevant = all.filter(a => {
      if (role === 'admin') return true;
      if (a.authorId === id) return true;
      if (a.targetScope === 'all') return true;
      if (a.targetScope === 'department' && a.targetDepartment === department) return true;
      if (a.targetScope === 'role' && a.targetRole === role) return true;
      if (a.targetScope === 'project' && a.targetProjectId) {
        const isMember = teamMembersStore.findOne({ projectId: a.targetProjectId, userId: id });
        if (isMember) return true;
      }
      return false;
    });

    return res.status(200).json({
      success: true,
      count: relevant.length,
      announcements: relevant.reverse()
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = announcementsStore.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    // REQ-4.9: Allow Faculty and Admins to edit
    if (announcement.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only the author or administrator can edit this announcement.'
      });
    }

    const { title, content, type } = req.body;
    const updates = {};
    if (title) updates.title = title.trim();
    if (content) updates.content = content.trim();
    if (type) updates.type = type;

    const updated = announcementsStore.findByIdAndUpdate(announcement._id, updates);

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      announcement: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = announcementsStore.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found.' });
    }

    // REQ-4.10: Allow Administrators to remove outdated announcements
    if (req.user.role !== 'admin' && announcement.authorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only administrators or the author can remove announcements.'
      });
    }

    announcementsStore.findByIdAndDelete(announcement._id);

    return res.status(200).json({
      success: true,
      message: 'Announcement removed successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
