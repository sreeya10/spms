import express from 'express';
import {
  getProjectReportData,
  downloadProjectPDF,
  getDepartmentSummaryReport
} from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(authenticate);

router.get('/project/:projectId', getProjectReportData);
router.get('/project/:projectId/pdf', downloadProjectPDF);
router.get('/department/:department', authorize('faculty', 'admin'), getDepartmentSummaryReport);

export default router;
