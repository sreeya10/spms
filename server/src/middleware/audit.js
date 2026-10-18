import { logsStore } from '../models/store.js';

export const logActivity = (action, entityType = 'general') => {
  return (req, res, next) => {
    // Continue request execution, then log
    res.on('finish', () => {
      if (res.statusCode < 400) {
        try {
          logsStore.create({
            userId: req.user ? req.user.id : null,
            userEmail: req.user ? req.user.email : (req.body ? req.body.email : 'anonymous'),
            action,
            entityType,
            statusCode: res.statusCode,
            method: req.method,
            path: req.originalUrl,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
          });
        } catch (err) {
          console.error('Audit logging error:', err);
        }
      }
    });
    next();
  };
};
