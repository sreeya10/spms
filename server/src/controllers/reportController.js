import {
  projectsStore,
  repoDataStore,
  snapshotsStore,
  teamMembersStore,
  usersStore
} from '../models/store.js';
import { generateProjectPDF } from '../services/pdfReportService.js';

export const getProjectReportData = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const repo = repoDataStore.findOne({ projectId });
    const snapshots = snapshotsStore.find({ projectId });
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const members = teamMembersStore.find({ projectId });

    return res.status(200).json({
      success: true,
      report: {
        project,
        repository: repo,
        latestSnapshot,
        members,
        historyCount: snapshots.length
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadProjectPDF = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = projectsStore.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const repo = repoDataStore.findOne({ projectId });
    const snapshots = snapshotsStore.find({ projectId });
    const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

    generateProjectPDF(project, repo, latestSnapshot, res);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getDepartmentSummaryReport = async (req, res) => {
  try {
    const { department } = req.params;
    const allProjects = projectsStore.find().filter(p => 
      !department || department === 'all' || p.department.toLowerCase() === department.toLowerCase()
    );

    const enriched = allProjects.map(p => {
      const repo = repoDataStore.findOne({ projectId: p._id });
      const snapshots = snapshotsStore.find({ projectId: p._id });
      const latest = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

      return {
        _id: p._id,
        title: p.title,
        department: p.department,
        status: p.status,
        supervisorName: p.supervisorName,
        leaderName: p.leaderName,
        hasRepo: !!(repo && repo.isConnected),
        totalCommits: repo ? repo.totalCommits : 0,
        readinessScore: latest ? latest.readinessScore : 0,
        riskLevel: latest ? latest.riskLevel : 'Unknown'
      };
    });

    const total = enriched.length;
    const lowRiskCount = enriched.filter(p => p.riskLevel === 'Low').length;
    const mediumRiskCount = enriched.filter(p => p.riskLevel === 'Medium').length;
    const highRiskCount = enriched.filter(p => p.riskLevel === 'High').length;
    const criticalRiskCount = enriched.filter(p => p.riskLevel === 'Critical').length;

    const avgReadiness = total > 0
      ? Number((enriched.reduce((acc, p) => acc + (p.readinessScore || 0), 0) / total).toFixed(1))
      : 0;

    return res.status(200).json({
      success: true,
      department: department || 'All Departments',
      totalProjects: total,
      averageReadiness: avgReadiness,
      riskDistribution: {
        Low: lowRiskCount,
        Medium: mediumRiskCount,
        High: highRiskCount,
        Critical: criticalRiskCount
      },
      projects: enriched
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
