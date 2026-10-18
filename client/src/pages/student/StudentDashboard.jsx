import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  UserPlus,
  UserMinus,
  Trash2,
  ChevronDown,
  Check,
  FolderGit2
} from 'lucide-react';

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

  // Modals
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [connectLoading, setConnectLoading] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    department: user?.department || 'Computer Science & Engineering',
    academicYear: '2025-2026',
    semester: 'Winter',
    deadline: ''
  });

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('Contributor');
  const [memberGithub, setMemberGithub] = useState('');
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [removingMemberId, setRemovingMemberId] = useState(null);

  const fetchProjectData = async (targetProjectId = null) => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      const projList = (res.data && res.data.projects) || [];
      setProjects(projList);

      if (projList.length > 0) {
        // Find requested project, or stay on selected project, or default to first project
        const currentTargetId = targetProjectId || selectedProjectId;
        const matched = projList.find(p => p._id === currentTargetId);
        const activeProj = matched || projList[0];

        setSelectedProjectId(activeProj._id);
        const detailRes = await api.get(`/projects/${activeProj._id}`);
        setProject(detailRes.data.project);
      } else {
        setSelectedProjectId(null);
        setProject(null);
      }
    } catch (err) {
      console.error('Failed to load project details', err);
      setError('Unable to load project data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, []);

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
      console.error('Failed to switch project', err);
      setError('Failed to switch to selected project.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the project "${project.title}"?\n\nThis will permanently delete the project and all associated repository links, commit telemetry, ML snapshots, and team assignments. This action cannot be undone.`
    );
    if (!confirmDelete) return;

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
        setSuccessMsg('GitHub repository synced and ML readiness re-evaluated successfully!');
        await fetchProjectData(project._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sync failed. Please check repository connection.');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    setConnectLoading(true);
    setError('');
    try {
      const res = await api.post(`/github/connect/${project._id}`, {
        repoUrl,
        token: ghToken || undefined
      });
      if (res.data.success) {
        setShowConnectModal(false);
        setSuccessMsg('GitHub repository successfully verified and connected!');
        await fetchProjectData(project._id);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to connect repository.');
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
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this project?`)) return;
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
    const token = localStorage.getItem('spms_token');
    window.open(`/api/v1/reports/project/${project._id}/pdf?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">Loading project telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  const latest = project?.latestSnapshot;
  const repo = project?.repository;

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
                  {project.academicYear} ({project.semester})
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time monitoring, GitHub telemetry, and ML readiness evaluation
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Project Switcher Dropdown */}
            {projects.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 shadow-xs transition"
                >
                  <FolderGit2 className="w-4 h-4 text-indigo-600" />
                  <span className="max-w-[150px] truncate font-bold">{project?.title || 'Select Project'}</span>
                  <span className="text-[11px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full font-bold border border-indigo-100">
                    {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 ml-0.5" />
                </button>

                {showProjectDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProjectDropdown(false)}
                    />
                    <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 py-2">
                      <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Your Enrolled Projects</span>
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
                              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 transition ${
                                isSelected ? 'bg-indigo-50/70' : ''
                              }`}
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
                                  <span className="text-[10px] text-slate-500 truncate">
                                    {p.academicYear} · {p.semester}
                                  </span>
                                  {isLeader ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                      Leader
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                      Member
                                    </span>
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
                          onClick={() => {
                            setShowProjectDropdown(false);
                            setShowCreateModal(true);
                          }}
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

            {/* Persistent "+ Add Project" Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-2xs transition"
              title="Register another project"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Add Project</span>
            </button>

            {project && repo && repo.isConnected && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-600 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Repository'}
              </button>
            )}

            {project && (
              <button
                onClick={downloadPdfReport}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition"
              >
                <FileDown className="w-4 h-4" />
                Export PDF Report
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError('')} className="font-bold text-rose-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1">{successMsg}</div>
            <button onClick={() => setSuccessMsg('')} className="font-bold text-emerald-700 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* If no project registered */}
        {!project ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center max-w-xl mx-auto shadow-xs mt-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">No Project Registered</h2>
            <p className="text-sm text-slate-500 mt-2">
              You are not currently associated with an active project. Register a new software
              project to link your GitHub repository and activate automated ML monitoring.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              Register New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Project Overview, Repo Telemetry, AI Insights */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                        {project.department}
                      </span>
                      {project.leaderId === user?.id ? (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          ★ You are Project Leader
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Team Member / Contributor
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-black text-slate-900 mt-2">{project.title}</h2>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                      {project.description || 'No detailed description provided.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-2 shrink-0">
                    <RiskBadge level={latest?.riskLevel || 'Unknown'} size="lg" />
                    {(project.leaderId === user?.id || user?.role === 'admin') && (
                      <button
                        onClick={handleDeleteProject}
                        disabled={deleteLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition disabled:opacity-50 mt-1"
                        title="Permanently delete this project"
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

              {/* GitHub Repository Telemetry */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 text-slate-800">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">GitHub Repository Telemetry</h3>
                      <p className="text-xs text-slate-500">Continuous commit and collaboration telemetry</p>
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
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-xs"
                    >
                      Connect Repository
                    </button>
                  )}
                </div>

                {repo && repo.isConnected ? (
                  <div className="space-y-6 pt-5">
                    {/* Telemetry Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                          <span>Commits</span>
                          <GitCommit className="w-4 h-4 text-indigo-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalCommits || 0}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {repo.daysSinceLastCommit === 0
                            ? 'Today'
                            : `${repo.daysSinceLastCommit}d ago`}
                        </p>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
                          <span>Pull Requests</span>
                          <GitPullRequest className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-2xl font-black text-slate-900 mt-1">{repo.totalPullRequests || 0}</p>
                        <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                          {repo.mergedPullRequests || 0} merged
                        </p>
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

                    {/* Contributor Equity Distribution */}
                    {repo.contributors && repo.contributors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Team Contributor Equity & Commit Share
                        </h4>
                        <div className="space-y-2.5">
                          {repo.contributors.map((contrib, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                {contrib.avatarUrl ? (
                                  <img
                                    src={contrib.avatarUrl}
                                    alt={contrib.username}
                                    className="w-8 h-8 rounded-full border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                    {contrib.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <span className="font-bold text-sm text-slate-800">
                                    {contrib.username}
                                  </span>
                                  <span className="text-xs text-slate-400 block">
                                    {contrib.commits} commits ({contrib.percentage || 0}%)
                                  </span>
                                </div>
                              </div>

                              <div className="w-32 bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${contrib.percentage || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-sm text-slate-500">
                      No GitHub repository currently linked. Connect your repository to inspect real-time commits, pull requests, and trigger Machine Learning evaluation.
                    </p>
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition"
                    >
                      Connect GitHub Repository
                    </button>
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              {latest?.aiRecommendations && latest.aiRecommendations.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        AI Quality & Milestone Recommendations
                      </h3>
                      <p className="text-xs text-slate-500">
                        Actionable engineering guidance generated from repository metrics
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {latest.aiRecommendations.map((rec, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-3.5"
                      >
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                            rec.priority === 'High'
                              ? 'bg-rose-100 text-rose-700'
                              : rec.priority === 'Medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            {rec.area}: {rec.action}
                          </span>
                          <span className="text-xs text-slate-500 mt-1 block">
                            {rec.guidance}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: ML Readiness Meter, Risk Breakdown, Team Members */}
            <div className="space-y-6">
              {/* ML Readiness Gauge */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    ML Readiness Score
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    FastAPI ML Service
                  </span>
                </div>

                <div className="py-6 flex flex-col items-center justify-center">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-100"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-indigo-600"
                        strokeDasharray={`${latest?.readinessScore || 0}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-3xl font-black text-slate-900">
                        {latest?.readinessScore != null ? `${latest.readinessScore}%` : '0%'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Readiness</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">
                    Estimated milestone readiness derived from Git activity, pull requests, and commit velocity.
                  </p>
                </div>

                {/* Score Breakdown Bars */}
                {latest?.breakdown && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>Commit Activity</span>
                        <span>{latest.breakdown.commit_activity_score} / 30</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{ width: `${(latest.breakdown.commit_activity_score / 30) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>Collaboration Equity</span>
                        <span>{latest.breakdown.collaboration_equity_score} / 25</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${(latest.breakdown.collaboration_equity_score / 25) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>PR Workflow</span>
                        <span>{latest.breakdown.pr_workflow_score} / 20</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(latest.breakdown.pr_workflow_score / 20) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>Issue Management</span>
                        <span>{latest.breakdown.issue_management_score} / 15</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-1.5 rounded-full"
                          style={{ width: `${(latest.breakdown.issue_management_score / 15) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-slate-600 mb-1">
                        <span>Timeline Health</span>
                        <span>{latest.breakdown.timeline_health_score} / 10</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full"
                          style={{ width: `${(latest.breakdown.timeline_health_score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Identified Risks */}
              {latest?.identifiedRisks && latest.identifiedRisks.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Identified Project Risks ({latest.identifiedRisks.length})
                  </h3>

                  <div className="space-y-3">
                    {latest.identifiedRisks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-rose-800">{risk.factor}</span>
                          <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-200 text-rose-900">
                            {risk.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{risk.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
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
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{member.name}</p>
                        <p className="text-slate-400 text-[11px]">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            member.roleInTeam === 'Leader'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {member.roleInTeam}
                        </span>
                        {project.leaderId === user?.id && member.roleInTeam !== 'Leader' && (
                          <button
                            onClick={() => handleRemoveMember(member.userId, member.name)}
                            disabled={removingMemberId === member.userId}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                            title={`Remove ${member.name} from project`}
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

      {/* Connect Repo Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Connect GitHub Repository</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a valid GitHub repository URL. Public repos do not require a personal access token.
            </p>

            <form onSubmit={handleConnectRepo} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GitHub Repository URL
                </label>
                <input
                  type="url"
                  required
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/octocat/Hello-World"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  GitHub Personal Access Token (Optional)
                </label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx (for private repos or high rate limits)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {connectLoading ? 'Validating...' : 'Validate & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Register New Project</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the academic details to initialize your project team workspace.
            </p>

            <form onSubmit={handleCreateProject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  placeholder="e.g. Autonomous Robotic Navigation using LIDAR"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Project Description</label>
                <textarea
                  rows="3"
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="Describe project objectives and scope..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={newProject.department}
                    onChange={(e) => setNewProject({ ...newProject, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electrical & Electronics">Electrical & Electronics</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newProject.academicYear}
                    onChange={(e) => setNewProject({ ...newProject, academicYear: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select
                    value={newProject.semester}
                    onChange={(e) => setNewProject({ ...newProject, semester: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="Winter">Winter</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Target Review Deadline</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the registered institutional email of your student teammate.
            </p>

            {memberError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">{memberError}</div>
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Teammate Email</label>
                <input
                  type="email"
                  required
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  placeholder="student@vit.ac.in"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Role in Team</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none"
                >
                  <option value="Contributor">Contributor</option>
                  <option value="Developer">Developer</option>
                  <option value="Researcher">Researcher</option>
                  <option value="Designer">Designer</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">GitHub Username (Optional)</label>
                <input
                  type="text"
                  value={memberGithub}
                  onChange={(e) => setMemberGithub(e.target.value)}
                  placeholder="e.g. octocat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMemberModal(false);
                    setMemberError('');
                  }}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={memberLoading}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
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
