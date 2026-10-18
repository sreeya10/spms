import {
  projectsStore,
  repoDataStore,
  snapshotsStore
} from '../models/store.js';
import { predictReadinessAndRisks } from '../services/mlClientService.js';
import { generateAIRecommendations } from '../services/aiRecommendationService.js';

export const getReadiness = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const snapshots = snapshotsStore.find({ projectId });
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    if (!latest) {
      return res.status(200).json({
        success: true,
        readinessScore: 0,
        riskLevel: 'Unknown',
        message: 'No repository sync has been performed yet.'
      });
    }

    return res.status(200).json({
      success: true,
      readinessScore: latest.readinessScore,
      breakdown: latest.breakdown,
      lastAnalyzedAt: latest.timestamp
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getRisks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const snapshots = snapshotsStore.find({ projectId });
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    if (!latest) {
      return res.status(200).json({
        success: true,
        riskLevel: 'Unknown',
        identifiedRisks: []
      });
    }

    return res.status(200).json({
      success: true,
      riskLevel: latest.riskLevel,
      identifiedRisks: latest.identifiedRisks || [],
      lastAnalyzedAt: latest.timestamp
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getRecommendations = async (req, res) => {
  try {
    const { projectId } = req.params;
    const snapshots = snapshotsStore.find({ projectId });
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    if (!latest) {
      return res.status(200).json({
        success: true,
        recommendations: [],
        summary: 'Sync repository to generate AI recommendations.'
      });
    }

    return res.status(200).json({
      success: true,
      summary: latest.aiSummary || '',
      strengths: latest.strengths || [],
      recommendations: latest.aiRecommendations || []
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const snapshots = snapshotsStore.find({ projectId });

    return res.status(200).json({
      success: true,
      count: snapshots.length,
      history: snapshots
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
