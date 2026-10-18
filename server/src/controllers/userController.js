import { usersStore, logsStore } from '../models/store.js';

export const listUsers = async (req, res) => {
  try {
    const { role, department } = req.query;
    let users = usersStore.find();

    if (role) {
      users = users.filter(u => u.role === role.toLowerCase());
    }
    if (department) {
      users = users.filter(u => u.department.toLowerCase() === department.toLowerCase());
    }

    const sanitized = users.map(u => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      registrationNumber: u.registrationNumber,
      designation: u.designation,
      githubUsername: u.githubUsername,
      isActive: u.isActive !== false,
      createdAt: u.createdAt
    }));

    return res.status(200).json({
      success: true,
      count: sanitized.length,
      users: sanitized
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  try {
    const user = usersStore.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user._id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own administrator account.' });
    }

    const newStatus = !(user.isActive !== false);
    usersStore.findByIdAndUpdate(user._id, { isActive: newStatus });

    return res.status(200).json({
      success: true,
      message: `User ${user.name} is now ${newStatus ? 'activated' : 'deactivated'}.`,
      isActive: newStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const logs = logsStore.find().reverse().slice(0, 100);
    return res.status(200).json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
