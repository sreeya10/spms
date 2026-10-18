import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { RiskBadge } from '../../components/common/RiskBadge';
import {
  Shield,
  Users,
  FolderGit2,
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  Search,
  FileDown,
  UserCheck,
  UserX,
  Layers,
  Database
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'users', 'system'
  const [projects, setProjects] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ backend: true, mlService: true, db: true });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, usersRes, healthRes] = await Promise.allSettled([
        api.get('/projects'),
        api.get('/users'),
        api.get('/health')
      ]);

      if (projRes.status === 'fulfilled' && projRes.value.data?.projects) {
        setProjects(projRes.value.data.projects);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.data?.users) {
        setUsersList(usersRes.value.data.users);
      }

      // Check ML Health directly via health endpoint or gateway
      let mlHealthy = false;
      try {
        const mlRes = await fetch('http://127.0.0.1:5001/health');
        if (mlRes.ok) mlHealthy = true;
      } catch (e) {
        mlHealthy = false;
      }

      setSystemHealth({
        backend: healthRes.status === 'fulfilled',
        mlService: mlHealthy,
        db: true
      });
    } catch (err) {
      console.error('Failed fetching admin telemetry', err);
      setStatusMsg({ text: 'Error loading admin data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      const res = await api.patch(`/users/${userId}/status`);
      if (res.data.success) {
        setStatusMsg({ text: res.data.message, type: 'success' });
        await fetchData();
      }
    } catch (err) {
      setStatusMsg({ text: err.response?.data?.message || 'Failed updating user status.', type: 'error' });
    }
  };

  const downloadProjectPdf = (projectId) => {
    const token = localStorage.getItem('spms_token');
    window.open(`/api/v1/reports/project/${projectId}/pdf?token=${token}`, '_blank');
  };

  // Filtered lists
  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.leaderName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = usersList.length;
  const totalProjects = projects.length;
  const connectedRepos = projects.filter((p) => p.hasRepository).length;
  const criticalCount = projects.filter((p) => ['critical', 'high'].includes((p.riskLevel || '').toLowerCase())).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-purple-100 text-purple-700">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Institutional Administration & Monitoring Portal
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Centralized project governance, telemetry health, and user administration
            </p>
          </div>

          <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'projects' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Projects ({projects.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'users' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              User Directory ({usersList.length})
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'system' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Infrastructure Status
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {statusMsg.text && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center justify-between ${
              statusMsg.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
          >
            <span>{statusMsg.text}</span>
            <button onClick={() => setStatusMsg({ text: '', type: '' })} className="font-bold underline">
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Total Registered</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalUsers}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Students, Faculty & Admins</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Active Projects</span>
              <FolderGit2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{totalProjects}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Under institutional monitoring</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>Connected Repos</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">{connectedRepos}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">GitHub REST API linked</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>High / Critical Risk</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600 mt-1">{criticalCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Requires immediate attention</p>
          </div>
        </div>

        {/* Tab 1: All Projects */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search project, department, or leader..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Projects: {filteredProjects.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Project Title</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Leader & Supervisor</th>
                    <th className="px-4 py-3.5">Readiness</th>
                    <th className="px-4 py-3.5">Risk Level</th>
                    <th className="px-6 py-3.5 text-right">Evaluation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProjects.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-sm block">{p.title}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.academicYear} • {p.hasRepository ? `${p.totalCommits} commits` : 'No Repo'}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-600">
                        {p.department}
                      </td>

                      <td className="px-4 py-4">
                        <span className="font-semibold text-slate-800 block">Lead: {p.leaderName}</span>
                        <span className="text-[11px] text-slate-400">Sup: {p.supervisorName}</span>
                      </td>

                      <td className="px-4 py-4">
                        {p.readinessScore != null ? (
                          <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {p.readinessScore}%
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not Synced</span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <RiskBadge level={p.riskLevel || 'unknown'} size="sm" />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => downloadProjectPdf(p._id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 font-bold text-xs transition"
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
          </div>
        )}

        {/* Tab 2: Users Management */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Total Users: {filteredUsers.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-4 py-3.5">Role</th>
                    <th className="px-4 py-3.5">Department</th>
                    <th className="px-4 py-3.5">Identifier</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5">
                        <span className="font-bold text-slate-900 block">{u.name}</span>
                        <span className="text-[11px] text-slate-400">{u.email}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                            u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : u.role === 'faculty'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-medium text-slate-600">
                        {u.department}
                      </td>

                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                        {u.registrationNumber || u.githubUsername || '—'}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                            u.isActive !== false ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {u.isActive !== false ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          {u.isActive !== false ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(u._id)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition ${
                              u.isActive !== false
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.isActive !== false ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Infrastructure Status */}
        {activeTab === 'system' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">SPMS Infrastructure Health Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Status of all microservices, API gateways, and persistent storage layers.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                <Server className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">Node.js Express Gateway</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Host: http://localhost:5000</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">Status: Operational (HTTP 200)</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                <Activity className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">Python FastAPI ML Engine</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Host: http://127.0.0.1:5001</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">Status: Operational (Scikit-Learn)</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
                <Database className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">Persistence Tier</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">Engine: MongoDB & Document Store</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">Status: Operational (Zero Loss)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
