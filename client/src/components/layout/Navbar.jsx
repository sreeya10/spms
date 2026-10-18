import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  GraduationCap,
  Bell,
  User,
  LogOut,
  Layers,
  LayoutDashboard,
  FileText,
  Shield,
  CheckCircle,
  Menu,
  X
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data && res.data.notifications) {
          const unread = res.data.notifications.filter(n => !n.isRead).length;
          setUnreadCount(unread);
        }
      } catch (err) {
        // Silently ignore notification fetch errors in navbar
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'faculty':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'student':
      default:
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'faculty':
        return '/faculty';
      case 'admin':
        return '/admin';
      default:
        return '/student';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to={getDashboardPath()} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 leading-tight tracking-tight">
                  SPMS
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  Student Project Monitoring System
                </span>
              </div>
            </Link>

            {/* Role indicator tag */}
            {user && (
              <span
                className={`ml-2 px-2.5 py-0.5 text-xs font-bold rounded-full border capitalize ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role} Portal
              </span>
            )}
          </div>

          {/* Navigation Links */}
          {user && (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to={getDashboardPath()}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname === getDashboardPath()
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>

              <Link
                to="/notifications"
                className={`relative px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/notifications'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* User Profile & Actions */}
          {user ? (
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/profile"
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="View Profile"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    {user.email}
                  </span>
                </div>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-semibold text-slate-700 hover:text-indigo-600 px-3 py-1.5"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
              >
                Register
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          {user && (
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown */}
      {user && menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <div className="py-2 border-b border-slate-100 mb-2">
            <p className="font-semibold text-sm text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <Link
            to={getDashboardPath()}
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            to="/notifications"
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link
            to="/profile"
            onClick={() => setMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-100"
          >
            Profile Settings
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              handleLogout();
            }}
            className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
};
