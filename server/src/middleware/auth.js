import { verifyToken } from '../utils/token.js';
import { usersStore } from '../models/store.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No Bearer token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token. Please log in again.'
      });
    }

    // Verify user is still active in database
    const user = usersStore.findById(decoded.id);
    if (!user || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists.'
      });
    }

    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      githubUsername: user.githubUsername
    };

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Authentication verification error.',
      error: err.message
    });
  }
};
