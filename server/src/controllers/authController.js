import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { usersStore } from '../models/store.js';
import { generateToken } from '../utils/token.js';
import { sendInstitutionalEmail } from '../services/emailService.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role, department, registrationNumber, designation, githubUsername } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required fields.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const validRoles = ['student', 'faculty', 'admin'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid role specified. Valid roles are: ${validRoles.join(', ')}.`
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check duplicate email
    const existing = usersStore.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = usersStore.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: role.toLowerCase(),
      department: department || 'Computer Science & Engineering',
      registrationNumber: registrationNumber || '',
      designation: designation || (role === 'faculty' ? 'Assistant Professor' : ''),
      githubUsername: githubUsername ? githubUsername.trim() : '',
      isActive: true
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department,
        registrationNumber: newUser.registrationNumber,
        designation: newUser.designation,
        githubUsername: newUser.githubUsername
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Registration failed.',
      error: err.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersStore.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.'
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
        designation: user.designation,
        githubUsername: user.githubUsername
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Login process error.',
      error: err.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = usersStore.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        registrationNumber: user.registrationNumber,
        designation: user.designation,
        githubUsername: user.githubUsername,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, department, githubUsername, designation, registrationNumber } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (department) updates.department = department.trim();
    if (githubUsername !== undefined) updates.githubUsername = githubUsername.trim();
    if (designation !== undefined) updates.designation = designation.trim();
    if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber.trim();

    const updatedUser = usersStore.findByIdAndUpdate(req.user.id, updates);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        registrationNumber: updatedUser.registrationNumber,
        designation: updatedUser.designation,
        githubUsername: updatedUser.githubUsername
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const user = usersStore.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.'
      });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    usersStore.findByIdAndUpdate(req.user.id, { passwordHash: newHash });

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Institutional email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersStore.findOne({ email: normalizedEmail });

    // Return uniform message regardless of user existence to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email address, password reset instructions have been dispatched.'
      });
    }

    // Generate cryptographic random token (32 bytes = 64 hex chars)
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min validity

    usersStore.findByIdAndUpdate(user._id, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt
    });

    const resetUrl = `http://localhost:5173/reset-password?token=${rawToken}`;

    await sendInstitutionalEmail({
      to: user.email,
      subject: 'SPMS Account Password Reset Request',
      text: `Hello ${user.name},\n\nA request was received to reset your SPMS password.\n\nPlease use the following link to reset your password within 15 minutes:\n${resetUrl}\n\nIf you did not request this, please disregard this email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 540px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5; margin-bottom: 8px;">SPMS Password Reset</h2>
          <p style="color: #475569; font-size: 14px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            A password reset was requested for your Student Project Monitoring System account.
          </p>
          <div style="margin: 24px 0; text-align: center;">
            <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              Reset Account Password
            </a>
          </div>
          <p style="color: #64748b; font-size: 12px;">
            This link will expire in <strong>15 minutes</strong>. If you did not make this request, you can safely ignore this email.
          </p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'If an account exists with this email address, password reset instructions have been dispatched.',
      debugToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Password recovery error.', error: err.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = usersStore.findOne({ resetPasswordToken: hashedToken });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired.'
      });
    }

    if (!user.resetPasswordExpires || new Date(user.resetPasswordExpires).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new link.'
      });
    }

    // Re-hash with standard 12 salt rounds
    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    usersStore.findByIdAndUpdate(user._id, {
      passwordHash: newHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    return res.status(200).json({
      success: true,
      message: 'Password has been successfully reset. You may now log in with your new credentials.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Password reset failed.', error: err.message });
  }
};

