import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Navbar } from '../../components/layout/Navbar';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Calendar, Info } from 'lucide-react';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications');
      if (res.data && res.data.notifications) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(
        notifications.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed marking all read', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'review':
        return <Clock className="w-4 h-4 text-indigo-600" />;
      case 'deadline':
        return <Calendar className="w-4 h-4 text-amber-600" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Announcements & Notifications
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Official institutional deadlines, software review notices, and supervisory feedback
            </p>
          </div>

          {notifications.some((n) => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-xs transition"
            >
              <CheckCheck className="w-3.5 h-3.5 text-indigo-600" />
              Mark All as Read
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-xs text-slate-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>You have no announcements or notifications at this time.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-5 transition-colors flex items-start justify-between gap-4 ${
                    n.isRead ? 'bg-white' : 'bg-indigo-50/30'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                      {getTypeIcon(n.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{n.title}</span>
                        <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {n.type || 'Notice'}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-2">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n._id)}
                      className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-white"
                      title="Mark as Read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
