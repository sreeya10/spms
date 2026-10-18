import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { RiskBadge } from '../../components/common/RiskBadge';
import {
  Users,
  GitBranch,
  ShieldAlert,
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
  Sparkles
} from 'lucide-react';

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [syncingId, setSyncingId] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Announcement Modal State
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: '',
    content: '',
    targetScope: 'department',
    targetDepartment: user?.department || 'Computer Science & Engineering',
    targetRole: 'student',
    type: 'review'
  });

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
    const token = localStorage.getItem('spms_token');
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
              onClick={() => setShowAnnounceModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition"
            >
              <BellPlus className="w-4 h-4" />
              Post Announcement
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
            <button onClick={() => setMessage({ text: '', type: '' })} className="font-bold underline">
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
            <h2 className="text-base font-bold text-slate-900">Assigned Projects</h2>
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
                    <th className="px-4 py-3.5">ML Readiness</th>
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
                        {p.readinessScore != null ? (
                          <div className="w-32">
                            <div className="flex justify-between font-bold text-slate-800 mb-1">
                              <span>{p.readinessScore}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${p.readinessScore}%` }}
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

                      <td className="px-4 py-4 text-slate-600">
                        {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'None set'}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Announcement Modal */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Broadcast Official Announcement</h3>
            <p className="text-xs text-slate-500 mb-4">
              Dispatches notifications to all students registered in your academic scope.
            </p>

            <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  placeholder="e.g. Interim Review Rubric & Submission Deadline"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Notice Content</label>
                <textarea
                  rows="4"
                  required
                  value={announcement.content}
                  onChange={(e) => setAnnouncement({ ...announcement, content: e.target.value })}
                  placeholder="Detail review guidelines, milestone expectations, and deadlines..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Notice Type</label>
                  <select
                    value={announcement.type}
                    onChange={(e) => setAnnouncement({ ...announcement, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="review">Software Review</option>
                    <option value="deadline">Milestone Deadline</option>
                    <option value="general">General Notice</option>
                    <option value="alert">Urgent Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Target Department</label>
                  <input
                    type="text"
                    disabled
                    value={announcement.targetDepartment}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
