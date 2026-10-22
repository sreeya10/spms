import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  sendGroupNotification
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.post('/send-group', authorize('faculty', 'admin'), sendGroupNotification);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

export default router;
