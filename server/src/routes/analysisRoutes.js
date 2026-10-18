import express from 'express';
import {
  getReadiness,
  getRisks,
  getRecommendations,
  getHistory
} from '../controllers/analysisController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/:projectId/readiness', getReadiness);
router.get('/:projectId/risks', getRisks);
router.get('/:projectId/recommendations', getRecommendations);
router.get('/:projectId/history', getHistory);

export default router;
