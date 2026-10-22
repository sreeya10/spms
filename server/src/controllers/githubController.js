import {
  validateRepository,
  fetchRepositoryFullData,
  parseRepoUrl,
  determineLifecycleStatus
} from '../services/githubSyncService.js';
import { predictReadinessAndRisks } from '../services/mlClientService.js';
import { generateAIRecommendations } from '../services/aiRecommendationService.js';
import {
  projectsStore,
  repoDataStore,
  snapshotsStore,
  teamMembersStore
} from '../models/store.js';

// ─── Validate Repository ──────────────────────────────────────────────────────
export const validateRepo = async (req, res) => {
  try {
    const { repoUrl, token } = req.body;
    if (!repoUrl || !repoUrl.trim()) {
      return res.status(400).json({ success: false, message: 'Repository URL is required.' });
    }

    // Validate URL format before calling GitHub API
    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        message: 'Invalid GitHub repository URL. Expected format: https://github.com/owner/repository'
      });
    }

    const validation = await validateRepository(repoUrl, token || null);
    return res.status(200).json({
      success: validation.isValid,
      ...validation
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Repository validation encountered an unexpected error.' });
  }
};

// ─── Connect Repository ───────────────────────────────────────────────────────
export const connectRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { repoUrl, token } = req.body;

    if (!repoUrl || !repoUrl.trim()) {
      return res.status(400).json({ success: false, message: 'Repository URL is required.' });
    }

    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Authorization: project leader, assigned team members, supervisor, or admin
    const isLeader = project.leaderId === req.user.id;
    const isMember = teamMembersStore.findOne({ projectId: project._id, userId: req.user.id });
    const isSupervisor = project.facultySupervisorId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isLeader && !isMember && !isSupervisor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized project team members, supervisors, or administrators can connect a GitHub repository.'
      });
    }

    // Validate repository
    const validation = await validateRepository(repoUrl, token || null);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message || 'Repository validation failed.'
      });
    }

    // Duplicate prevention: check if another project is already using this repo
    const allRepos = repoDataStore.find({ isConnected: true });
    const duplicate = allRepos.find(r =>
      r.projectId !== projectId &&
      r.repoOwner && r.repoOwner.toLowerCase() === validation.owner.toLowerCase() &&
      r.repoName && r.repoName.toLowerCase() === validation.repo.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Repository ${validation.owner}/${validation.repo} is already connected to another project. Each repository can only be connected to one project.`
      });
    }

    // Fetch full GitHub data including README and structure analysis
    const fullData = await fetchRepositoryFullData(validation.owner, validation.repo, token || null);

    // Persist or update repository record
    let repoRecord = repoDataStore.findOne({ projectId: project._id });
    if (repoRecord) {
      repoRecord = repoDataStore.findByIdAndUpdate(repoRecord._id, {
        ...fullData,
        isConnected: true,
        connectedAt: new Date().toISOString()
      });
    } else {
      repoRecord = repoDataStore.create({
        projectId: project._id,
        ...fullData,
        isConnected: true,
        connectedAt: new Date().toISOString()
      });
    }

    // Run ML Analysis and AI recommendations
    const deadlineDate = project.deadline
      ? new Date(project.deadline)
      : new Date(Date.now() + 30 * 86400000);
    const daysToDeadline = Math.max(
      0,
      Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24))
    );

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
      contributors: fullData.contributors,
      has_tests: fullData.structure?.hasTests || false
    };

    const mlPrediction = await predictReadinessAndRisks(mlInput);
    const aiRecommendations = await generateAIRecommendations(
      { ...project, daysToDeadline },
      fullData,
      mlPrediction
    );

    // Use evidence-based readiness score when available from feature analysis
    const readinessScore = fullData.evidenceReadinessScore != null
      ? fullData.evidenceReadinessScore
      : mlPrediction.readiness_score;

    // Determine project lifecycle status with deadline awareness
    const lifecycleStatus = determineLifecycleStatus(
      fullData.totalCommits,
      readinessScore,
      mlPrediction.risk_level,
      fullData.structure?.hasTests || false,
      fullData.daysSinceLastCommit,
      fullData.readme?.found || false,
      project.deadline
    );

    // Save snapshot
    const snapshot = snapshotsStore.create({
      projectId: project._id,
      timestamp: new Date().toISOString(),
      readinessScore,
      riskLevel: mlPrediction.risk_level,
      breakdown: mlPrediction.breakdown,
      identifiedRisks: mlPrediction.identified_risks,
      riskExplanation: mlPrediction.risk_explanation,
      aiRecommendations: aiRecommendations.recommendations,
      aiSummary: aiRecommendations.summary,
      strengths: aiRecommendations.strengths,
      lifecycleStatus,
      // Progress estimation metadata
      progressEstimate: {
        estimatedProgress: readinessScore,
        confidence: fullData.evidenceReadinessScore != null ? 'High' : (typeof mlPrediction.confidence_score === 'number' ? `${Math.round(mlPrediction.confidence_score * 100)}%` : 'Medium'),
        engine: fullData.evidenceReadinessScore != null ? 'evidence-heuristic' : mlPrediction.engine,
        isAutomated: true,
        facultyConfirmed: false
      },
      gitMetrics: {
        totalCommits: fullData.totalCommits,
        totalPRs: fullData.totalPullRequests,
        totalIssues: fullData.totalIssues,
        totalBranches: fullData.totalBranches
      },
      readmeAnalysis: fullData.readme,
      classifiedFeatures: fullData.classifiedFeatures,
      structureSummary: fullData.structure ? {
        hasTests: fullData.structure.hasTests,
        hasCi: fullData.structure.hasCi,
        hasDockerfile: fullData.structure.hasDockerfile,
        hasFrontend: fullData.structure.hasFrontend,
        hasBackend: fullData.structure.hasBackend,
        hasDatabase: fullData.structure.hasDatabase,
        detectedFrameworks: fullData.structure.detectedFrameworks,
        languages: fullData.structure.languages,
        confidence: fullData.structure.confidence
      } : null
    });

    return res.status(200).json({
      success: true,
      message: `Repository ${validation.owner}/${validation.repo} successfully connected and analysed.`,
      repository: repoRecord,
      snapshot
    });
  } catch (err) {
    console.error('[connectRepo] Error:', err.message);
    return res.status(500).json({ success: false, message: `Failed to connect repository: ${err.message}` });
  }
};

// ─── Sync Repository ──────────────────────────────────────────────────────────
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
      isConnected: true,
      lastSyncedAt: new Date().toISOString()
    });

    // Run ML and AI pipeline
    const deadlineDate = project.deadline
      ? new Date(project.deadline)
      : new Date(Date.now() + 30 * 86400000);
    const daysToDeadline = Math.max(
      0,
      Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24))
    );

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
      contributors: fullData.contributors,
      has_tests: fullData.structure?.hasTests || false
    };

    const mlPrediction = await predictReadinessAndRisks(mlInput);
    const aiRecommendations = await generateAIRecommendations(
      { ...project, daysToDeadline },
      fullData,
      mlPrediction
    );

    // Use evidence-based readiness score when available from feature analysis
    const readinessScore = fullData.evidenceReadinessScore != null
      ? fullData.evidenceReadinessScore
      : mlPrediction.readiness_score;

    const lifecycleStatus = determineLifecycleStatus(
      fullData.totalCommits,
      readinessScore,
      mlPrediction.risk_level,
      fullData.structure?.hasTests || false,
      fullData.daysSinceLastCommit,
      fullData.readme?.found || false,
      project.deadline
    );

    const snapshot = snapshotsStore.create({
      projectId: project._id,
      timestamp: new Date().toISOString(),
      readinessScore,
      riskLevel: mlPrediction.risk_level,
      breakdown: mlPrediction.breakdown,
      identifiedRisks: mlPrediction.identified_risks,
      riskExplanation: mlPrediction.risk_explanation,
      aiRecommendations: aiRecommendations.recommendations,
      aiSummary: aiRecommendations.summary,
      strengths: aiRecommendations.strengths,
      lifecycleStatus,
      progressEstimate: {
        estimatedProgress: readinessScore,
        confidence: fullData.evidenceReadinessScore != null ? 'High' : (typeof mlPrediction.confidence_score === 'number' ? `${Math.round(mlPrediction.confidence_score * 100)}%` : 'Medium'),
        engine: fullData.evidenceReadinessScore != null ? 'evidence-heuristic' : mlPrediction.engine,
        isAutomated: true,
        facultyConfirmed: false
      },
      gitMetrics: {
        totalCommits: fullData.totalCommits,
        totalPRs: fullData.totalPullRequests,
        totalIssues: fullData.totalIssues,
        totalBranches: fullData.totalBranches
      },
      readmeAnalysis: fullData.readme,
      classifiedFeatures: fullData.classifiedFeatures,
      structureSummary: fullData.structure ? {
        hasTests: fullData.structure.hasTests,
        hasCi: fullData.structure.hasCi,
        hasDockerfile: fullData.structure.hasDockerfile,
        hasFrontend: fullData.structure.hasFrontend,
        hasBackend: fullData.structure.hasBackend,
        hasDatabase: fullData.structure.hasDatabase,
        detectedFrameworks: fullData.structure.detectedFrameworks,
        languages: fullData.structure.languages,
        confidence: fullData.structure.confidence
      } : null
    });

    return res.status(200).json({
      success: true,
      message: 'GitHub repository data and intelligence metrics synchronized successfully.',
      repository: updatedRepo,
      snapshot
    });
  } catch (err) {
    console.error('[syncRepo] Error:', err.message);
    return res.status(500).json({ success: false, message: `Sync failed: ${err.message}` });
  }
};

// ─── Get Repo Stats ───────────────────────────────────────────────────────────
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

// ─── Get Repository Analysis (README + Structure + Features) ──────────────────
export const getRepoAnalysis = async (req, res) => {
  try {
    const { projectId } = req.params;
    const repo = repoDataStore.findOne({ projectId });

    if (!repo || !repo.isConnected) {
      return res.status(200).json({
        success: true,
        connected: false,
        message: 'No repository connected to this project.'
      });
    }

    const snapshots = snapshotsStore.find({ projectId });
    const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    return res.status(200).json({
      success: true,
      connected: true,
      repoOwner: repo.repoOwner,
      repoName: repo.repoName,
      repoUrl: repo.repoUrl,
      primaryLanguage: repo.primaryLanguage,
      lastSyncedAt: repo.lastSyncedAt,
      readme: repo.readme || null,
      structure: repo.structure || null,
      classifiedFeatures: repo.classifiedFeatures || [],
      latestSnapshot: latest ? {
        readinessScore: latest.readinessScore,
        riskLevel: latest.riskLevel,
        lifecycleStatus: latest.lifecycleStatus,
        progressEstimate: latest.progressEstimate,
        readmeAnalysis: latest.readmeAnalysis,
        classifiedFeatures: latest.classifiedFeatures,
        structureSummary: latest.structureSummary,
        timestamp: latest.timestamp
      } : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
