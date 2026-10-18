import express from 'express';
import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement
} from '../controllers/announcementController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { logActivity } from '../middleware/audit.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('faculty', 'admin'), logActivity('CREATE_ANNOUNCEMENT', 'Announcement'), createAnnouncement);
router.get('/', getAnnouncements);
router.put('/:id', authorize('faculty', 'admin'), logActivity('UPDATE_ANNOUNCEMENT', 'Announcement'), updateAnnouncement);
router.delete('/:id', authorize('faculty', 'admin'), logActivity('DELETE_ANNOUNCEMENT', 'Announcement'), deleteAnnouncement);

export default router;
