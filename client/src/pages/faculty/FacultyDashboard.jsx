import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { RiskBadge } from '../../components/common/RiskBadge';
import {
  Users,
  GitBranch,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  FileDown,
  RefreshCw,
  Search,
  BellPlus,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Trash2,
  Eye,
  X,
  BookOpen,
  Layers,
  Code2
} from 'lucide-react';

const LifecycleBadge = ({ status }) => {
  const map = {
    'Completed': 'bg-green-50 text-green-700 border-green-200',
    'Ready for Review': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
    'Needs Attention': 'bg-rose-50 text-rose-700 border-rose-200',
    'Analysing': 'bg-purple-50 text-purple-700 border-purple-200',
  };
  const cls = map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${cls}`}>
      {status || 'In Progress'}
    </span>
  );
};

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Removal state & confirmation
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Review Analysis state
  const [selectedReviewProject, setSelectedReviewProject] = useState(null);
  const [reviewAnalysis, setReviewAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Group-targeted notification & risk alert state
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifForm, setNotifForm] = useState({
    projectId: '',
    title: '',
    message: '',
    type: 'risk_alert',
    severity: 'High'
  });
  const [notifSending, setNotifSending] = useState(false);
  const [notifError, setNotifError] = useState('');

  const handleOpenSendAlert = (proj = null, prefilledRisk = null) => {
    const targetProjId = proj?._id || (projects.length > 0 ? projects[0]._id : '');
    const targetProj = projects.find(p => p._id === targetProjId) || proj;
    let initialTitle = '';
    let initialMessage = '';

    if (prefilledRisk && targetProj) {
      initialTitle = `Risk Alert: Action Required for ${prefilledRisk.factor || 'Identified Risk'}`;
      initialMessage = `Dear ${targetProj.title} Team,\n\nDuring faculty review of your project, the following risk was identified:\n• Risk Factor: ${prefilledRisk.factor}\n• Severity: ${prefilledRisk.severity}\n• Details: ${prefilledRisk.description}\n\nPlease take immediate steps to address this before your upcoming evaluation.`;
    } else if (targetProj) {
      initialTitle = `Supervisory Notice: ${targetProj.title}`;
      initialMessage = `Dear ${targetProj.title} Team,\n\nPlease review your latest milestones and project deliverables. Contact me if you have any questions or require guidance.`;
    }

    setNotifForm({
      projectId: targetProjId,
      title: initialTitle,
      message: initialMessage,
      type: prefilledRisk ? 'risk_alert' : 'general',
      severity: prefilledRisk?.severity || 'High'
    });
    setNotifError('');
    setShowNotifModal(true);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifForm.projectId) {
      setNotifError('Please select a target project group.');
      return;
    }
    if (!notifForm.title.trim()) {
      setNotifError('Please enter a notification title.');
      return;
    }
    if (!notifForm.message.trim()) {
      setNotifError('Please enter a notification message.');
      return;
    }

    setNotifSending(true);
    setNotifError('');
    try {
      const res = await api.post('/notifications/send-group', {
        projectId: notifForm.projectId,
        title: notifForm.title.trim(),
        message: notifForm.message.trim(),
        type: notifForm.type,
        severity: notifForm.type === 'risk_alert' ? notifForm.severity : null
      });

      if (res.data.success) {
        setShowNotifModal(false);
        setMessage({
          text: res.data.message || 'Notification successfully sent to the project group!',
          type: 'success'
        });
      }
    } catch (err) {
      setNotifError(err.response?.data?.message || err.message || 'Failed to dispatch notification.');
    } finally {
      setNotifSending(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects');
      if (res.data && res.data.projects) {
        setProjects(res.data.projects);
      }
    } catch (err) {
      console.error('Failed fetching faculty projects', err);
      setMessage({ text: 'Failed to load supervised projects.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSyncProject = async (projectId) => {
    setSyncingId(projectId);
    setMessage({ text: '', type: '' });
    try {
      const res = await api.post(`/github/sync/${projectId}`);
      if (res.data.success) {
        setMessage({ text: 'Repository synced and ML scores updated!', type: 'success' });
        await fetchProjects();
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Sync failed.', type: 'error' });
    } finally {
      setSyncingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!projectToDelete) return;
    setDeleteLoading(true);
    try {
      const res = await api.delete(`/projects/${projectToDelete._id}/faculty-remove`);
      if (res.data.success) {
        setMessage({ text: res.data.message || 'Project removed successfully.', type: 'success' });
        setProjectToDelete(null);
        await fetchProjects();
      }
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to remove project. Faculty authorization required.',
        type: 'error'
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleOpenReview = async (p) => {
    setSelectedReviewProject(p);
    setReviewAnalysis(null);
    setLoadingAnalysis(true);
    try {
      const res = await api.get(`/github/analysis/${p._id}`);
      if (res.data.success) {
        setReviewAnalysis(res.data);
      }
    } catch (e) {
      console.warn('Could not load analysis details for review', e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handlePublishAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/announcements', announcement);
      if (res.data.success) {
        setShowAnnounceModal(false);
        setMessage({ text: 'Announcement broadcast successfully to students!', type: 'success' });
        setAnnouncement({
          title: '',
          content: '',
          targetScope: 'department',
          targetDepartment: user?.department || 'Computer Science & Engineering',
          targetRole: 'student',
          type: 'review'
        });
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to post announcement.', type: 'error' });
    }
  };

  const downloadPdf = (projectId) => {
    const token = sessionStorage.getItem('spms_token') || localStorage.getItem('spms_token');
    window.open(`/api/v1/reports/project/${projectId}/pdf?token=${token}`, '_blank');
  };

  // Filter projects
  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.leaderName.toLowerCase().includes(search.toLowerCase());
    const matchesRisk =
      riskFilter === 'all' || (p.riskLevel || 'unknown').toLowerCase() === riskFilter.toLowerCase();
    return matchesSearch && matchesRisk;
  });

  // Calculate aggregates
  const totalSupervised = projects.length;
  const scoredProjects = projects.filter((p) => p.readinessScore != null);
  const avgReadiness = scoredProjects.length
    ? (scoredProjects.reduce((acc, p) => acc + p.readinessScore, 0) / scoredProjects.length).toFixed(1)
    : 0;
  const atRiskCount = projects.filter((p) => ['high', 'critical'].includes((p.riskLevel || '').toLowerCase())).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Faculty Supervisor Portal
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Supervising department: <span className="font-semibold text-slate-800">{user?.department}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenSendAlert(null)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition"
            >
              <BellPlus className="w-4 h-4" />
              Send Message / Risk Alert
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {message.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start justify-between ${
              message.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Aggregate KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Supervised Projects</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{totalSupervised}</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Avg. Readiness Score</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{avgReadiness}%</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase font-bold text-slate-400">At-Risk Projects</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{atRiskCount}</p>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by title or leader name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="all">All Risks</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>

        {/* Projects Supervision Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Supervised Student Projects</h2>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredProjects.length} of {projects.length}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Fetching projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No projects found matching the specified filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Project & Leader</th>
                    <th className="px-4 py-3.5">Repository Status</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Readiness</th>
                    <th className="px-4 py-3.5">Risk Level</th>
                    <th className="px-4 py-3.5">Deadline</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProjects.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-900 text-sm">{p.title}</p>
                        <p className="text-slate-400 mt-0.5">
                          Leader: <span className="font-semibold text-slate-600">{p.leaderName}</span> ({p.teamCount} members)
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {p.hasRepository ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                              {p.repoOwner}/{p.repoName}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              {p.totalCommits} commits
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No repo connected</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <LifecycleBadge status={p.lifecycleStatus} />
                      </td>

                      <td className="px-4 py-4">
                        {p.readinessScore != null ? (
                          <div className="w-28">
                            <div className="flex justify-between font-bold text-slate-800 mb-1 text-[11px]">
                              <span>{p.readinessScore}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, p.readinessScore)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Sync</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <RiskBadge level={p.riskLevel || 'unknown'} size="sm" />
                      </td>

                      <td className="px-4 py-4 text-slate-600 whitespace-nowrap">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'None set'}
                      </td>

                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSendAlert(p)}
                          className="p-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition"
                          title="Send Risk Alert / Message to this Project Group"
                        >
                          <BellPlus className="w-4 h-4" />
                        </button>
                        {p.hasRepository && (
                          <button
                            onClick={() => handleOpenReview(p)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            title="Review Repository Analysis"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {p.hasRepository && (
                          <button
                            onClick={() => handleSyncProject(p._id)}
                            disabled={syncingId === p._id}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
                            title="Sync Repository"
                          >
                            <RefreshCw className={`w-4 h-4 ${syncingId === p._id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                        <button
                          onClick={() => downloadPdf(p._id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs transition"
                          title="Download Evaluation Report"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          PDF
                        </button>
                        <button
                          onClick={() => setProjectToDelete(p)}
                          className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition"
                          title="Remove Project (Faculty)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ── Remove Project Confirmation Modal ──────────────────────────────── */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Remove Student Project</h3>
                <p className="text-xs text-slate-500">Authorized faculty removal action</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to remove <strong className="text-slate-900">{projectToDelete.title}</strong> led by{' '}
              <strong className="text-slate-900">{projectToDelete.leaderName}</strong>?
              <br /><br />
              This will permanently delete the project record, associated repository links, telemetry logs, and all ML analysis snapshots from persistent storage.
            </p>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={deleteLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Analysis Modal ──────────────────────────────────────────── */}
      {selectedReviewProject && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedReviewProject.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Leader: {selectedReviewProject.leaderName} · Repository Analysis & Evidence
                </p>
              </div>
              <button
                onClick={() => setSelectedReviewProject(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-4 text-xs flex-1">
              {loadingAnalysis ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-xs text-slate-500">Loading analysis data...</p>
                </div>
              ) : reviewAnalysis ? (
                <>
                  {/* Status & Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Readiness Score</p>
                      <p className="text-xl font-black text-indigo-600 mt-0.5">
                        {reviewAnalysis.latestSnapshot?.readinessScore ?? 'Pending'}%
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</p>
                      <div className="mt-1">
                        <RiskBadge level={reviewAnalysis.latestSnapshot?.riskLevel || 'unknown'} size="sm" />
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Lifecycle</p>
                      <div className="mt-1">
                        <LifecycleBadge status={reviewAnalysis.latestSnapshot?.lifecycleStatus} />
                      </div>
                    </div>
                  </div>

                  {/* README Overview */}
                  {reviewAnalysis.readme?.found && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                        <BookOpen className="w-4 h-4 text-indigo-600" />
                        README Scope & Purpose
                      </div>
                      <p className="text-indigo-800 text-[11px] leading-relaxed">
                        {reviewAnalysis.readme.purpose || 'README detected with structured features and requirements.'}
                      </p>
                    </div>
                  )}

                  {/* Feature Classification */}
                  <div>
                    <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">
                      Evidence-Based Feature Classification
                    </h4>
                    {reviewAnalysis.classifiedFeatures && reviewAnalysis.classifiedFeatures.length > 0 ? (
                      <div className="space-y-2">
                        {reviewAnalysis.classifiedFeatures.map((f, i) => (
                          <div key={i} className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">{f.feature}</p>
                              {f.evidence && f.evidence.length > 0 && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Evidence: {f.evidence.join(' · ')}
                                </p>
                              )}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              f.status === 'Implemented'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : f.status === 'Partially implemented'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : f.status === 'Verification needed'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {f.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic">No classified features available. Re-sync repository to analyze.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-slate-500 text-center py-6">No analysis data found for this project.</p>
              )}
            </div>

            {/* Identified Risks & Action in Review Modal */}
            {reviewAnalysis?.latestSnapshot?.identifiedRisks && reviewAnalysis.latestSnapshot.identifiedRisks.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2 flex items-center justify-between">
                  <span>Identified Development Risks</span>
                  <span className="text-[10px] text-rose-600 font-bold">
                    {reviewAnalysis.latestSnapshot.identifiedRisks.length} Risk(s) Flagged
                  </span>
                </h4>
                <div className="space-y-2">
                  {reviewAnalysis.latestSnapshot.identifiedRisks.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 flex items-start justify-between gap-3 text-xs">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">{r.factor}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.severity === 'Critical' ? 'bg-rose-200 text-rose-800' :
                            r.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {r.severity} Risk
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{r.description}</p>
                        {r.impact && <p className="text-slate-400 text-[10px] mt-0.5 italic">Impact: {r.impact}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const proj = selectedReviewProject;
                          setSelectedReviewProject(null);
                          handleOpenSendAlert(proj, r);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold shrink-0 transition flex items-center gap-1 shadow-2xs"
                      >
                        <BellPlus className="w-3.5 h-3.5" />
                        Send Alert
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const proj = selectedReviewProject;
                  const topRisk = reviewAnalysis?.latestSnapshot?.identifiedRisks?.[0] || null;
                  setSelectedReviewProject(null);
                  handleOpenSendAlert(proj, topRisk);
                }}
                className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center gap-1.5"
              >
                <BellPlus className="w-3.5 h-3.5 text-amber-600" />
                Compose Group Alert
              </button>

              <button
                type="button"
                onClick={() => setSelectedReviewProject(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Group-Specific Notification / Risk Alert Modal ─────────────────── */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <BellPlus className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  {notifForm.type === 'risk_alert' ? 'Send Group Risk Alert' : 'Send Group Message'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {notifError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{notifError}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              {/* Recipient Selector: Project Groups supervised by this faculty */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Recipient Project Group <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={notifForm.projectId}
                  onChange={(e) => setNotifForm({ ...notifForm, projectId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>-- Select a supervised project group --</option>
                  {projects.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title} (Leader: {p.leaderName} · {p.teamCount} student{p.teamCount === 1 ? '' : 's'})
                    </option>
                  ))}
                </select>
                {notifForm.projectId && (
                  <p className="text-[11px] text-indigo-700 bg-indigo-50/70 p-2 rounded-lg mt-1.5 border border-indigo-100">
                    ✓ Recipient: Delivered exclusively to students registered in{' '}
                    <strong className="text-indigo-900 font-bold">
                      {projects.find(p => p._id === notifForm.projectId)?.title}
                    </strong>. Students outside this group will not see it.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Message Type</label>
                  <select
                    value={notifForm.type}
                    onChange={(e) => setNotifForm({ ...notifForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="risk_alert">Risk Alert</option>
                    <option value="review">Software Review</option>
                    <option value="deadline">Milestone Deadline</option>
                    <option value="general">Supervisory Feedback</option>
                  </select>
                </div>

                {notifForm.type === 'risk_alert' ? (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Risk Severity</label>
                    <select
                      value={notifForm.severity}
                      onChange={(e) => setNotifForm({ ...notifForm, severity: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                    >
                      <option value="Critical">Critical Risk</option>
                      <option value="High">High Risk</option>
                      <option value="Medium">Medium Risk</option>
                      <option value="Low">Low Risk</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Supervising Faculty</label>
                    <input
                      type="text"
                      disabled
                      value={user?.name || 'Faculty Supervisor'}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Message Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={notifForm.title}
                  onChange={(e) => setNotifForm({ ...notifForm, title: e.target.value })}
                  placeholder="e.g. Action Required: Incipient Development Volume Risk"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows="4"
                  required
                  value={notifForm.message}
                  onChange={(e) => setNotifForm({ ...notifForm, message: e.target.value })}
                  placeholder="Detail the supervisory feedback, milestone expectations, or required risk mitigations..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNotifModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={notifSending}
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {notifSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Confirm & Send Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
