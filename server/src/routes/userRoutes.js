import express from 'express';
import { listUsers, toggleUserStatus, getAuditLogs } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { logActivity } from '../middleware/audit.js';

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', listUsers);
router.patch('/:id/status', logActivity('TOGGLE_USER_STATUS', 'User'), toggleUserStatus);
router.get('/audit-logs', getAuditLogs);

export default router;
