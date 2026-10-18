import {
  validateRepository,
  fetchRepositoryFullData,
  parseRepoUrl
} from '../services/githubSyncService.js';
import { predictReadinessAndRisks } from '../services/mlClientService.js';
import { generateAIRecommendations } from '../services/aiRecommendationService.js';
import {
  projectsStore,
  repoDataStore,
  snapshotsStore,
  teamMembersStore
} from '../models/store.js';

export const validateRepo = async (req, res) => {
  try {
    const { repoUrl, token } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ success: false, message: 'Repository URL is required.' });
    }

    const validation = await validateRepository(repoUrl, token);
    return res.status(200).json({
      success: validation.isValid,
      ...validation
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const connectRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { repoUrl, token } = req.body;

    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Permission check
    const isLeader = project.leaderId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isLeader && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only the project leader or administrator can connect a GitHub repository.'
      });
    }

    // REQ-2.5: Validate repository before establishing connection
    const validation = await validateRepository(repoUrl, token);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message || 'Repository validation failed.'
      });
    }

    // Fetch full GitHub data
    const fullData = await fetchRepositoryFullData(validation.owner, validation.repo, token);

    // Save or update repository record
    let repoRecord = repoDataStore.findOne({ projectId: project._id });
    if (repoRecord) {
      repoRecord = repoDataStore.findByIdAndUpdate(repoRecord._id, {
        ...fullData,
        isConnected: true
      });
    } else {
      repoRecord = repoDataStore.create({
        projectId: project._id,
        ...fullData,
        isConnected: true
      });
    }

    // Run ML Analysis & AI recommendations immediately on initial sync
    const team = teamMembersStore.find({ projectId: project._id });
    const deadlineDate = project.deadline ? new Date(project.deadline) : new Date(Date.now() + 30 * 86400000);
    const daysToDeadline = Math.max(0, Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)));

    const mlInput = {
      project_id: project._id,
      title: project.title,
      days_to_deadline: daysToDeadline,
      total_commits: fullData.totalCommits,
      total_prs: fullData.totalPullRequests,
      merged_prs: fullData.mergedPullRequests,
      open_prs: fullData.openPullRequests,
      total_issues: fullData.totalIssues,
      closed_issues: fullData.closedIssues,
      open_issues: fullData.openIssues,
      total_branches: fullData.totalBranches,
      days_since_last_commit: fullData.daysSinceLastCommit,
      weekly_commits: fullData.weeklyActivity,
      contributors: fullData.contributors
    };

    const mlPrediction = await predictReadinessAndRisks(mlInput);
    const aiRecommendations = await generateAIRecommendations(
      { ...project, daysToDeadline },
      fullData,
      mlPrediction
    );

    // Save snapshot
    const snapshot = snapshotsStore.create({
      projectId: project._id,
      timestamp: new Date().toISOString(),
      readinessScore: mlPrediction.readiness_score,
      riskLevel: mlPrediction.risk_level,
      breakdown: mlPrediction.breakdown,
      identifiedRisks: mlPrediction.identified_risks,
      aiRecommendations: aiRecommendations.recommendations,
      aiSummary: aiRecommendations.summary,
      strengths: aiRecommendations.strengths,
      gitMetrics: {
        totalCommits: fullData.totalCommits,
        totalPRs: fullData.totalPullRequests,
        totalIssues: fullData.totalIssues,
        totalBranches: fullData.totalBranches
      }
    });

    return res.status(200).json({
      success: true,
      message: `Repository ${validation.owner}/${validation.repo} successfully connected and synced.`,
      repository: repoRecord,
      snapshot
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const syncRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const repoRecord = repoDataStore.findOne({ projectId: project._id });
    if (!repoRecord || !repoRecord.isConnected) {
      return res.status(400).json({
        success: false,
        message: 'No connected repository found for this project. Please connect a repository first.'
      });
    }

    // Refresh data from GitHub
    const fullData = await fetchRepositoryFullData(repoRecord.repoOwner, repoRecord.repoName);
    const updatedRepo = repoDataStore.findByIdAndUpdate(repoRecord._id, {
      ...fullData,
      lastSyncedAt: new Date().toISOString()
    });

    // Run ML and AI pipeline
    const deadlineDate = project.deadline ? new Date(project.deadline) : new Date(Date.now() + 30 * 86400000);
    const daysToDeadline = Math.max(0, Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24)));

    const mlInput = {
      project_id: project._id,
      title: project.title,
      days_to_deadline: daysToDeadline,
      total_commits: fullData.totalCommits,
      total_prs: fullData.totalPullRequests,
      merged_prs: fullData.mergedPullRequests,
      open_prs: fullData.openPullRequests,
      total_issues: fullData.totalIssues,
      closed_issues: fullData.closedIssues,
      open_issues: fullData.openIssues,
      total_branches: fullData.totalBranches,
      days_since_last_commit: fullData.daysSinceLastCommit,
      weekly_commits: fullData.weeklyActivity,
      contributors: fullData.contributors
    };

    const mlPrediction = await predictReadinessAndRisks(mlInput);
    const aiRecommendations = await generateAIRecommendations(
      { ...project, daysToDeadline },
      fullData,
      mlPrediction
    );

    const snapshot = snapshotsStore.create({
      projectId: project._id,
      timestamp: new Date().toISOString(),
      readinessScore: mlPrediction.readiness_score,
      riskLevel: mlPrediction.risk_level,
      breakdown: mlPrediction.breakdown,
      identifiedRisks: mlPrediction.identified_risks,
      aiRecommendations: aiRecommendations.recommendations,
      aiSummary: aiRecommendations.summary,
      strengths: aiRecommendations.strengths,
      gitMetrics: {
        totalCommits: fullData.totalCommits,
        totalPRs: fullData.totalPullRequests,
        totalIssues: fullData.totalIssues,
        totalBranches: fullData.totalBranches
      }
    });

    return res.status(200).json({
      success: true,
      message: 'GitHub repository data and intelligence metrics synchronized successfully.',
      repository: updatedRepo,
      snapshot
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getRepoStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const repo = repoDataStore.findOne({ projectId });
    if (!repo) {
      return res.status(404).json({ success: false, message: 'No repository linked to this project.' });
    }

    return res.status(200).json({
      success: true,
      repository: repo
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
