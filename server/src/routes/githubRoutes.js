import express from 'express';
import {
  validateRepo,
  connectRepo,
  syncRepo,
  getRepoStats,
  getRepoAnalysis
} from '../controllers/githubController.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = express.Router();

router.use(authenticate);

router.post('/validate', validateRepo);
router.post('/connect/:projectId', logActivity('CONNECT_GITHUB_REPO', 'Repository'), connectRepo);
router.post('/sync/:projectId', logActivity('SYNC_GITHUB_REPO', 'Repository'), syncRepo);
router.get('/stats/:projectId', getRepoStats);
router.get('/analysis/:projectId', getRepoAnalysis);

export default router;
