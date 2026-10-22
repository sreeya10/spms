import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { RiskBadge } from '../../components/common/RiskBadge';
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  FileDown,
  Clock,
  ChevronDown,
  Check,
  FolderGit2,
  BookOpen,
  Code2,
  BarChart3,
  Layers,
  Trash2,
  UserPlus,
  Info,
  AlertTriangle,
  XCircle,
  X
} from 'lucide-react';

// ─── Helper: lifecycle status badge ──────────────────────────────────────────
const LifecycleBadge = ({ status }) => {
  const map = {
    'Analysing':      'bg-blue-50 text-blue-700 border border-blue-200',
    'In Progress':    'bg-amber-50 text-amber-700 border border-amber-200',
    'Needs Attention':'bg-rose-50 text-rose-700 border border-rose-200',
    'Ready for Review':'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'Completed':      'bg-green-50 text-green-700 border border-green-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 border border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${cls}`}>
      {status || 'Unknown'}
    </span>
  );
};

// ─── Helper: feature status badge ────────────────────────────────────────────
const FeatureStatusBadge = ({ status }) => {
  const map = {
    'Implemented':           'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Partially implemented': 'bg-amber-50 text-amber-700 border-amber-200',
    'Verification needed':   'bg-blue-50 text-blue-700 border-blue-200',
    'Missing or not detected': 'bg-rose-50 text-rose-700 border-rose-200',
    'Unknown':               'bg-slate-100 text-slate-600 border-slate-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls} whitespace-nowrap shrink-0`}>
      {status}
    </span>
  );
};

// ─── Helper: readme quality indicator ────────────────────────────────────────
const ReadmeQualityBadge = ({ quality }) => {
  const map = {
    informative: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Informative' },
    minimal:     { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Minimal' },
    generic:     { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Generic/Template' },
    insufficient:{ cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Insufficient' },
    empty:       { cls: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Empty' },
  };
  const { cls, label } = map[quality] || { cls: 'bg-slate-100 text-slate-600 border-slate-200', label: quality || 'Unknown' };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
  );
};

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Connect Repo Modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [validateLoading, setValidateLoading] = useState(false);
  const [validateResult, setValidateResult] = useState(null); // { success, message, fullName, description, ... }
  const [connectModalError, setConnectModalError] = useState('');

  // Create Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    department: user?.department || 'Computer Science & Engineering',
    academicYear: '2025-2026',
    semester: 'Winter',
    deadline: ''
  });

  // Team Member Modal
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('Contributor');
  const [memberGithub, setMemberGithub] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [projectNotifs, setProjectNotifs] = useState([]);

  const fetchProjectData = useCallback(async (targetProjectId = null) => {
    try {
      setLoading(true);
      const [res, notifRes] = await Promise.all([
        api.get('/projects'),
        api.get('/notifications').catch(() => ({ data: { notifications: [] } }))
      ]);

      const projList = (res.data && res.data.projects) || [];
      const allNotifs = (notifRes.data && notifRes.data.notifications) || [];
      setProjects(projList);

      if (projList.length > 0) {
        const currentTargetId = targetProjectId || selectedProjectId;
        const matched = projList.find(p => p._id === currentTargetId);
        const activeProj = matched || projList[0];

        setSelectedProjectId(activeProj._id);
        const detailRes = await api.get(`/projects/${activeProj._id}`);
        setProject(detailRes.data.project);

        // Filter notifications addressed to this project group
        const groupNotifs = allNotifs.filter(n => n.projectId === activeProj._id);
        setProjectNotifs(groupNotifs);
      } else {
        setSelectedProjectId(null);
        setProject(null);
        setProjectNotifs([]);
      }
    } catch (err) {
      console.error('Failed to load project details', err);
      setError('Unable to load project data.');
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjectData();
  }, [user?.id]);

  const handleSelectProject = async (projId) => {
    setShowProjectDropdown(false);
    if (projId === selectedProjectId && project) return;
    setError('');
    setSuccessMsg('');
    try {
      setLoading(true);
      setSelectedProjectId(projId);
      const detailRes = await api.get(`/projects/${projId}`);
      setProject(detailRes.data.project);
    } catch (err) {
      setError('Failed to switch to selected project.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    if (!window.confirm(
      `Are you sure you want to delete the project "${project.title}"?\n\nThis will permanently delete all associated repository links, ML snapshots, and team assignments.`
    )) return;

    setDeleteLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.delete(`/projects/${project._id}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Project deleted successfully.');
        await fetchProjectData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSync = async () => {
    if (!project) return;
    setSyncing(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.post(`/github/sync/${project._id}`);
      if (res.data.success) {
        setSuccessMsg('Repository synced and ML readiness re-evaluated successfully!');
        await fetchProjectData(project._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed. Please check repository connection.');
    } finally {
      setSyncing(false);
    }
  };

  // Helper to validate GitHub repository URL format before API calls
  const isValidGitHubUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    const clean = url.trim().replace(/\.git$/, '').replace(/\/$/, '');
    return /^(?:https?:\/\/)?github\.com\/[a-zA-Z0-9_.\-]+\/[a-zA-Z0-9_.\-]+$/i.test(clean);
  };

  // ── Validate only (does NOT save) ─────────────────────────────────────────
  const handleValidate = async () => {
    setConnectModalError('');
    const trimmedUrl = repoUrl.trim();
    if (!trimmedUrl) {
      setValidateResult({
        success: false,
        message: 'Please enter a GitHub repository URL.'
      });
      return;
    }

    if (!isValidGitHubUrl(trimmedUrl)) {
      setValidateResult({
        success: false,
        message: 'Invalid GitHub repository URL format. Expected: https://github.com/owner/repository'
      });
      return;
    }

    setValidateLoading(true);
    setValidateResult(null);
    try {
      const res = await api.post('/github/validate', {
        repoUrl: trimmedUrl,
        token: ghToken.trim() || undefined
      });
      setValidateResult(res.data);
    } catch (err) {
      setValidateResult({
        success: false,
        message: err.response?.data?.message || 'Validation failed. Please check the URL and try again.'
      });
    } finally {
      setValidateLoading(false);
    }
  };

  // ── Connect (saves after validate succeeds) ───────────────────────────────
  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!validateResult?.success) {
      setConnectModalError('Please validate the repository first before connecting.');
      return;
    }
    setConnectLoading(true);
    setConnectModalError('');
    try {
      const res = await api.post(`/github/connect/${project._id}`, {
        repoUrl: repoUrl.trim(),
        token: ghToken.trim() || undefined
      });
      if (res.data.success) {
        setShowConnectModal(false);
        setRepoUrl('');
        setGhToken('');
        setValidateResult(null);
        setSuccessMsg('GitHub repository successfully verified and connected!');
        await fetchProjectData(project._id);
      }
    } catch (err) {
      setConnectModalError(err.response?.data?.message || 'Failed to connect repository.');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/projects', newProject);
      if (res.data.success) {
        setShowCreateModal(false);
        setNewProject({
          title: '',
          description: '',
          department: user?.department || 'Computer Science & Engineering',
          academicYear: '2025-2026',
          semester: 'Winter',
          deadline: ''
        });
        setSuccessMsg('Project created successfully!');
        await fetchProjectData(res.data.project?._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Project creation failed.');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberEmail) return;
    setMemberLoading(true);
    setMemberError('');
    try {
      const res = await api.post(`/projects/${project._id}/members`, {
        studentEmail: memberEmail.trim(),
        email: memberEmail.trim(),
        roleInTeam: memberRole,
        githubUsername: memberGithub.trim()
      });
      if (res.data.success) {
        setShowAddMemberModal(false);
        setMemberEmail('');
        setMemberRole('Contributor');
        setMemberGithub('');
        setSuccessMsg(res.data.message || 'Team member added successfully!');
        await fetchProjectData();
      }
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add team member.');
    } finally {
      setMemberLoading(false);
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this project?`)) return;
    setRemovingMemberId(userId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await api.delete(`/projects/${project._id}/members/${userId}`);
      if (res.data.success) {
        setSuccessMsg(res.data.message || `${memberName} was removed from the team.`);
        await fetchProjectData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove team member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const downloadPdfReport = () => {
    if (!project) return;
    const token = sessionStorage.getItem('spms_token') || localStorage.getItem('spms_token');
    window.open(`/api/v1/reports/project/${project._id}/pdf?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading project data...</p>
          </div>
        </div>
      </div>
    );
  }

  const latest = project?.latestSnapshot;
  const repo = project?.repository;
  const readmeAnalysis = latest?.readmeAnalysis || repo?.readme;
  const structureSummary = latest?.structureSummary || repo?.structure;
  const classifiedFeatures = latest?.classifiedFeatures || repo?.classifiedFeatures || [];
  const lifecycleStatus = latest?.lifecycleStatus;
  const progressEstimate = latest?.progressEstimate;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 flex-wrap">
              <span>Student Project Dashboard</span>
              {project && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {project.academicYear} · {project.semester}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              GitHub telemetry, automated analysis, and ML readiness evaluation
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Project Switcher */}
            {projects.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 shadow-sm transition"
                >
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span className="max-w-[150px] truncate font-bold">{project?.title || 'Select Project'}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100">
                    {projects.length}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {showProjectDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowProjectDropdown(false)} />
                    <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-2">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Your Projects</span>
                        <span className="text-xs font-bold text-slate-500">{projects.length} Total</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-50">
                        {projects.map((p) => {
                          const isSelected = p._id === selectedProjectId;
                          const isLeader = p.leaderId === user?.id;
                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => handleSelectProject(p._id)}
                              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition ${isSelected ? 'bg-indigo-50/70' : ''}`}
                            >
                              <div className="mt-0.5 shrink-0">
                                {isSelected ? (
                                  <Check className="w-4 h-4 text-indigo-600" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border border-slate-300" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                                  {p.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[10px] text-slate-500">{p.academicYear} · {p.semester}</span>
                                  {isLeader ? (
                                    <span className="text-[10px] font-bold px-1.5 rounded bg-amber-100 text-amber-800">Leader</span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-1.5 rounded bg-slate-100 text-slate-600">Member</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-t border-slate-100 p-2">
                        <button
                          type="button"
                          onClick={() => { setShowProjectDropdown(false); setShowCreateModal(true); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Register Another Project
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm transition"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Project</span>
            </button>

            {project && repo && repo.isConnected && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Repository'}
              </button>
            )}

            {project && (
              <button
                onClick={downloadPdfReport}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
              >
                <FileDown className="w-4 h-4" />
                Export PDF
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError('')} className="font-bold text-rose-700 hover:underline">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg('')} className="font-bold text-emerald-700 hover:underline">Dismiss</button>
          </div>
        )}

        {/* No project state */}
        {!project ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-sm mt-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">No Project Registered</h2>
            <p className="text-sm text-slate-500 mt-2">
              Register a new software project to link your GitHub repository and activate automated ML monitoring.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              Register New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">

              {/* Project Info Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {project.department}
                      </span>
                      {project.leaderId === user?.id ? (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          ★ Project Leader
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Team Member
                        </span>
                      )}
                      {lifecycleStatus && <LifecycleBadge status={lifecycleStatus} />}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-2">{project.title}</h2>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {project.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <RiskBadge level={repo && repo.isConnected && latest?.riskLevel ? latest.riskLevel : 'Unknown'} size="lg" />
                    {(project.leaderId === user?.id || user?.role === 'admin') && (
                      <button
                        onClick={handleDeleteProject}
                        disabled={deleteLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteLoading ? 'Deleting...' : 'Delete Project'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase">Faculty Supervisor</span>
                    <span className="font-bold text-slate-800 text-sm">{project.supervisorName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase">Project Leader</span>
                    <span className="font-bold text-slate-800 text-sm">{project.leaderName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase">Review Deadline</span>
                    <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'TBD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'analysis', label: 'Code Analysis', icon: Code2 },
                  { id: 'features', label: 'Features', icon: Layers },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition ${
                      activeTab === tab.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Overview Tab ──────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <>
                  {/* GitHub Repository Telemetry */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-100">
                          <GitBranch className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">GitHub Repository Telemetry</h3>
                          {repo?.lastSyncedAt && (
                            <p className="text-xs text-slate-400">
                              Last synced: {new Date(repo.lastSyncedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {repo && repo.isConnected ? (
                        <a
                          href={repo.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
                        >
                          {repo.repoOwner}/{repo.repoName}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            Repository Not Connected
                          </span>
                          <button
                            onClick={() => setShowConnectModal(true)}
                            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-sm"
                          >
                            Connect Repository
                          </button>
                        </div>
                      )}
                    </div>

                    {repo && repo.isConnected ? (
                      <div className="space-y-6 pt-5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                              <span>Commits</span>
                              <GitCommit className="w-4 h-4 text-indigo-500" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalCommits || 0}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {repo.daysSinceLastCommit === 0 ? 'Today' : `${repo.daysSinceLastCommit}d ago`}
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                              <span>Pull Requests</span>
                              <GitPullRequest className="w-4 h-4 text-emerald-500" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalPullRequests || 0}</p>
                            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">{repo.mergedPullRequests || 0} merged</p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                              <span>Issues</span>
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalIssues || 0}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              {repo.openIssues || 0} open / {repo.closedIssues || 0} closed
                            </p>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                              <span>Branches</span>
                              <GitBranch className="w-4 h-4 text-purple-500" />
                            </div>
                            <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalBranches || 1}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Default: {repo.defaultBranch || 'main'}
                            </p>
                          </div>
                        </div>

                        {/* Contributors */}
                        {repo.contributors && repo.contributors.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                              Team Contributor Equity
                            </h4>
                            <div className="space-y-2.5">
                              {repo.contributors.map((contrib, idx) => (
                                <div key={idx} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    {contrib.avatarUrl ? (
                                      <img src={contrib.avatarUrl} alt={contrib.username} className="w-8 h-8 rounded-full border border-slate-200" />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                        {contrib.username.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-bold text-sm text-slate-800">{contrib.username}</span>
                                      <span className="text-xs text-slate-400 block">{contrib.commits} commits ({contrib.percentage || 0}%)</span>
                                    </div>
                                  </div>
                                  <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${contrib.percentage || 0}%` }}></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 text-center space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Repository Not Connected
                        </div>
                        <p className="text-sm font-bold text-slate-800">
                          No verified GitHub repository is connected to this project.
                        </p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                          To link a real GitHub repository: Create the repository in your GitHub account (e.g. <code className="text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">https://github.com/{user?.githubUsername || 'username'}/{project?.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'repo'}</code>), push your project files, and click "Connect GitHub Repository" below. SPMS verifies live repository existence directly on GitHub before connecting.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setShowConnectModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition shadow-sm"
                          >
                            <GitBranch className="w-4 h-4" />
                            Connect GitHub Repository
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI Recommendations */}
                  {latest?.aiRecommendations && latest.aiRecommendations.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                        <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">AI Quality Recommendations</h3>
                          <p className="text-xs text-slate-500">Actionable guidance from repository metrics analysis</p>
                        </div>
                      </div>

                      {latest.aiSummary && (
                        <p className="text-sm text-slate-600 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 italic">
                          {latest.aiSummary}
                        </p>
                      )}

                      <div className="space-y-3">
                        {latest.aiRecommendations.map((rec, i) => (
                          <div key={i} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                              rec.priority === 'High' ? 'bg-rose-100 text-rose-700' :
                              rec.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rec.priority}
                            </span>
                            <div>
                              <span className="text-xs font-bold text-slate-800 block">{rec.area}: {rec.action}</span>
                              {rec.rationale && <span className="text-xs text-slate-500 mt-1 block">{rec.rationale}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── Code Analysis Tab ─────────────────────────────────── */}
              {activeTab === 'analysis' && (
                <div className="space-y-6">
                  {/* README Analysis */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-bold text-slate-900">README Analysis</h3>
                        <p className="text-xs text-slate-500">Automatically extracted from your repository</p>
                      </div>
                      {readmeAnalysis && readmeAnalysis.quality && (
                        <ReadmeQualityBadge quality={readmeAnalysis.quality} />
                      )}
                    </div>

                    {!repo?.isConnected ? (
                      <p className="text-sm text-slate-500 text-center py-4">Connect a repository to see README analysis.</p>
                    ) : !readmeAnalysis || !readmeAnalysis.found ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">README not found</p>
                          <p className="text-xs mt-0.5">No README file was detected in the repository root. Adding a README.md is strongly recommended for project evaluation.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* README warnings */}
                        {readmeAnalysis.warnings && readmeAnalysis.warnings.length > 0 && (
                          <div className="space-y-2">
                            {readmeAnalysis.warnings.map((w, i) => (
                              <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                {w}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Project title from README */}
                        {readmeAnalysis.title && (
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Detected Project Title</span>
                            <p className="font-bold text-slate-800">{readmeAnalysis.title}</p>
                          </div>
                        )}

                        {/* Purpose */}
                        {readmeAnalysis.purpose && (
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Project Purpose</span>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                              {readmeAnalysis.purpose}
                            </p>
                          </div>
                        )}

                        {/* Tech stack */}
                        {readmeAnalysis.techStack && readmeAnalysis.techStack.length > 0 && (
                          <div>
                            <span className="text-xs font-bold uppercase text-slate-400 block mb-2">Detected Technology Stack</span>
                            <div className="flex flex-wrap gap-1.5">
                              {readmeAnalysis.techStack.map((tech, i) => (
                                <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* README metadata */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          {[
                            { label: 'Word Count', value: readmeAnalysis.wordCount || 0 },
                            { label: 'Setup Docs', value: readmeAnalysis.hasSetupInstructions ? '✓ Yes' : '✗ No', ok: readmeAnalysis.hasSetupInstructions },
                            { label: 'Test Docs', value: readmeAnalysis.hasTestingInstructions ? '✓ Yes' : '✗ No', ok: readmeAnalysis.hasTestingInstructions },
                            { label: 'Deploy Docs', value: readmeAnalysis.hasDeploymentInfo ? '✓ Yes' : '✗ No', ok: readmeAnalysis.hasDeploymentInfo },
                          ].map((item, i) => (
                            <div key={i} className={`p-2.5 rounded-xl border ${
                              item.ok === undefined ? 'bg-slate-50 border-slate-100' :
                              item.ok ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                            }`}>
                              <span className="text-slate-400 block">{item.label}</span>
                              <span className={`font-bold ${
                                item.ok === undefined ? 'text-slate-700' :
                                item.ok ? 'text-emerald-700' : 'text-rose-700'
                              }`}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repository Structure Analysis */}
                  {structureSummary && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                          <Code2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-slate-900">Repository Structure Analysis</h3>
                          <p className="text-xs text-slate-500">
                            Evidence-based detection · Confidence:{' '}
                            <span className={`font-bold ${
                              structureSummary.confidence === 'high' ? 'text-emerald-600' :
                              structureSummary.confidence === 'medium' ? 'text-amber-600' :
                              'text-rose-600'
                            }`}>{structureSummary.confidence}</span>
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Frontend', detected: structureSummary.hasFrontend },
                          { label: 'Backend / API', detected: structureSummary.hasBackend },
                          { label: 'Database', detected: structureSummary.hasDatabase },
                          { label: 'Test Suite', detected: structureSummary.hasTests },
                          { label: 'CI/CD Pipeline', detected: structureSummary.hasCi },
                          { label: 'Docker / Container', detected: structureSummary.hasDockerfile },
                        ].map((item, i) => (
                          <div key={i} className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold ${
                            item.detected
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}>
                            {item.detected
                              ? <CheckCircle className="w-4 h-4" />
                              : <XCircle className="w-4 h-4 opacity-40" />
                            }
                            {item.label}
                          </div>
                        ))}
                      </div>

                      {/* Detected frameworks */}
                      {structureSummary.detectedFrameworks && structureSummary.detectedFrameworks.length > 0 && (
                        <div>
                          <span className="text-xs font-bold uppercase text-slate-400 block mb-2">Detected Frameworks</span>
                          <div className="flex flex-wrap gap-1.5">
                            {structureSummary.detectedFrameworks.map((fw, i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full">
                                {fw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {structureSummary.languages && Object.keys(structureSummary.languages).length > 0 && (
                        <div className="mt-4">
                          <span className="text-xs font-bold uppercase text-slate-400 block mb-2">Repository Languages</span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(structureSummary.languages).slice(0, 8).map(([lang, bytes], i) => (
                              <span key={i} className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Features Tab ──────────────────────────────────────── */}
              {activeTab === 'features' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Feature Implementation Status</h3>
                      <p className="text-xs text-slate-500">Evidence-based comparison of README claims vs. code structure</p>
                    </div>
                  </div>

                  {!repo?.isConnected ? (
                    <p className="text-sm text-slate-500 text-center py-4">Connect a repository to see feature analysis.</p>
                  ) : classifiedFeatures.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-sm text-slate-500">
                        No features detected.{' '}
                        {!readmeAnalysis?.found
                          ? 'Add a README.md with a Features section to enable automatic feature tracking.'
                          : 'Sync the repository to refresh the feature analysis.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Disclaimer */}
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 text-xs flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>
                          Feature statuses are determined by automated structural analysis and are <strong>not proof</strong> of working functionality.
                          Status marked <em>"Verification needed"</em> means structural evidence exists but correctness has not been confirmed.
                        </p>
                      </div>

                      {classifiedFeatures.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{item.feature}</p>
                              {item.evidence && item.evidence.length > 0 && (
                                <p className="text-xs text-slate-500 mt-0.5">{item.evidence.join('; ')}</p>
                              )}
                              {item.source === 'inferred' && (
                                <span className="text-[10px] text-slate-400 italic">Inferred from repository structure — lower confidence</span>
                              )}
                            </div>
                            <FeatureStatusBadge status={item.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Progress & Readiness Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    ML Readiness Score
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {progressEstimate?.engine === 'python_fastapi' ? 'ML Model' : 'Rule Engine'}
                  </span>
                </div>

                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="text-indigo-600"
                        strokeDasharray={`${latest?.readinessScore || 0}, 100`}
                        strokeWidth="3.5" strokeLinecap="round" stroke="currentColor" fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-black text-slate-900">
                        {repo && repo.isConnected && latest?.readinessScore != null && !isNaN(latest.readinessScore)
                          ? `${latest.readinessScore}%`
                          : 'Not available'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Readiness</span>
                    </div>
                  </div>

                  {/* Important distinction notice */}
                  <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 text-center">
                    <p className="font-semibold">Automated Estimate</p>
                    <p className="text-[10px] mt-0.5 opacity-80">
                      {repo && repo.isConnected
                        ? 'Implementation readiness based on codebase features and structural evidence.'
                        : 'Connect a verified GitHub repository to activate automated analysis.'}
                    </p>
                  </div>

                  <div className="mt-2 text-xs text-slate-400 text-center">
                    Confidence:{' '}
                    <span className="font-semibold text-slate-600">
                      {repo && repo.isConnected && progressEstimate?.confidence != null
                        ? (typeof progressEstimate.confidence === 'number' && !isNaN(progressEstimate.confidence)
                            ? `${Math.round(progressEstimate.confidence * 100)}%`
                            : typeof progressEstimate.confidence === 'string'
                            ? (progressEstimate.confidence.toLowerCase() === 'nan%' ? 'Not available' : progressEstimate.confidence)
                            : 'Not available')
                        : 'Not available'}
                    </span>
                  </div>
                </div>

                {/* Score Breakdown */}
                {latest?.breakdown && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    {[
                      { label: 'Commit Activity', val: latest.breakdown.commit_activity_score, max: 30, color: 'bg-indigo-600' },
                      { label: 'Collaboration Equity', val: latest.breakdown.collaboration_equity_score, max: 25, color: 'bg-emerald-500' },
                      { label: 'PR Workflow', val: latest.breakdown.pr_workflow_score, max: 20, color: 'bg-blue-500' },
                      { label: 'Issue Management', val: latest.breakdown.issue_management_score, max: 15, color: 'bg-amber-500' },
                      { label: 'Timeline Health', val: latest.breakdown.timeline_health_score, max: 10, color: 'bg-purple-500' },
                    ].map((item, i) => (
                      <div key={i}>
                        <div className="flex justify-between font-semibold text-slate-600 mb-1">
                          <span>{item.label}</span>
                          <span>{item.val} / {item.max}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${(item.val / item.max) * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Faculty Group Messages & Risk Alerts */}
              {projectNotifs && projectNotifs.length > 0 && (
                <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-amber-100 mb-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <Bell className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold uppercase tracking-wider">
                        Faculty Alerts & Messages ({projectNotifs.length})
                      </h3>
                    </div>
                    <Link to="/notifications" className="text-[11px] font-bold text-indigo-600 hover:underline">
                      View All
                    </Link>
                  </div>
                  <div className="space-y-2.5">
                    {projectNotifs.map((n) => (
                      <div
                        key={n._id}
                        className={`p-3 rounded-xl border text-xs ${
                          n.type === 'risk_alert'
                            ? 'bg-rose-50/70 border-rose-200'
                            : 'bg-amber-50/50 border-amber-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          {n.severity && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                              {n.severity} Risk
                            </span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">{n.message}</p>
                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                          <span>From: {n.senderName ? `Prof. ${n.senderName}` : 'Supervisor'}</span>
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Risks */}
              {latest?.identifiedRisks && latest.identifiedRisks.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Identified Risks ({latest.identifiedRisks.length})
                  </h3>
                  <div className="space-y-3">
                    {latest.identifiedRisks.map((risk, idx) => (
                      <div key={idx} className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-rose-800">{risk.factor}</span>
                          <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">{risk.severity}</span>
                        </div>
                        <p className="text-slate-600 mt-1">{risk.description}</p>
                        {risk.impact && <p className="text-rose-700 mt-1 font-medium">{risk.impact}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Roster */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                      Team Roster ({project.members?.length || 1})
                    </h3>
                  </div>
                  {project.leaderId === user?.id && (
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Member
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {project.members?.map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{member.name}</p>
                        <p className="text-slate-400 text-[11px]">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          member.roleInTeam === 'Leader' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {member.roleInTeam}
                        </span>
                        {project.leaderId === user?.id && member.roleInTeam !== 'Leader' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.name)}
                            disabled={removingMemberId === member.userId}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Connect Repo Modal (with separate Validate + Connect) ──────────── */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Connect GitHub Repository</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Validate the repository first, then connect it to this project.
                </p>
              </div>
              <button
                onClick={() => { setShowConnectModal(false); setValidateResult(null); setConnectModalError(''); setRepoUrl(''); setGhToken(''); }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GitHub Repository URL *
                </label>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={(e) => { setRepoUrl(e.target.value); setValidateResult(null); setConnectModalError(''); }}
                  placeholder="https://github.com/username/repository"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Personal Access Token (optional)
                </label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => { setGhToken(e.target.value); setValidateResult(null); }}
                  placeholder="ghp_xxxxxxxxxxxx (for private repos)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Token is sent securely to the backend and is never stored or logged.</p>
              </div>

              {/* Validate Button */}
              <button
                type="button"
                onClick={handleValidate}
                disabled={validateLoading || !repoUrl.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-xs border border-slate-300 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {validateLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Validate Repository
                  </>
                )}
              </button>

              {/* Validation Result */}
              {validateResult && (
                <div className={`p-3.5 rounded-xl border text-xs ${
                  validateResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {validateResult.success
                      ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    }
                    <div>
                      {validateResult.success ? (
                        <>
                          <p className="font-bold">Repository validated successfully</p>
                          <p className="mt-0.5">{validateResult.fullName} · {validateResult.isPrivate ? 'Private' : 'Public'}</p>
                          {validateResult.description && <p className="mt-0.5 opacity-80">{validateResult.description}</p>}
                        </>
                      ) : (
                        <>
                          <p className="font-bold">Validation failed</p>
                          <p className="mt-0.5">{validateResult.message}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Connect error */}
              {connectModalError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {connectModalError}
                </div>
              )}

              {/* Connect Button — only enabled after successful validate */}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowConnectModal(false); setValidateResult(null); setConnectModalError(''); setRepoUrl(''); setGhToken(''); }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConnectRepo}
                  disabled={connectLoading || !validateResult?.success}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-40 flex items-center gap-1.5 transition"
                >
                  {connectLoading ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Connecting...</>
                  ) : (
                    <><GitBranch className="w-3.5 h-3.5" />Connect Repository</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Project Modal ──────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register New Project</h3>
            <p className="text-xs text-slate-500 mb-4">Enter academic details to initialize your project workspace.</p>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Project Title *</label>
                <input
                  type="text" required
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="e.g. Autonomous Robotic Navigation using LIDAR"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Project Description</label>
                <textarea rows="3"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe project objectives and scope..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select value={newProject.department} onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none">
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Academic Year</label>
                  <input type="text" value={newProject.academicYear}
                    onChange={(e) => setNewProject({ ...newProject, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select value={newProject.semester} onChange={(e) => setNewProject({ ...newProject, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white">
                    <option value="Winter">Winter</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Review Deadline</label>
                  <input type="date" value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Member Modal ──────────────────────────────────────────────── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Enter the registered email of your teammate.</p>

            {memberError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{memberError}</div>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Teammate Email *</label>
                <input type="email" required value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="student@vit.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Role in Team</label>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none">
                  <option value="Contributor">Contributor</option>
                  <option value="Developer">Developer</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Designer">Designer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">GitHub Username (Optional)</label>
                <input type="text" value={memberGithub}
                  onChange={(e) => setMemberGithub(e.target.value)}
                  placeholder="e.g. octocat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddMemberModal(false); setMemberError(''); }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" disabled={memberLoading}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5">
                  {memberLoading ? 'Adding...' : 'Add Teammate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
