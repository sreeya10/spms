import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert, AlertCircle } from 'lucide-react';

export const RiskBadge = ({ level = 'Unknown', size = 'md' }) => {
  const normalized = (level || 'Unknown').toLowerCase();

  const configs = {
    low: {
      label: 'Low Risk',
      classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle
    },
    medium: {
      label: 'Medium Risk',
      classes: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: AlertCircle
    },
    high: {
      label: 'High Risk',
      classes: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: AlertTriangle
    },
    critical: {
      label: 'Critical Risk',
      classes: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
      icon: ShieldAlert
    },
    unknown: {
      label: 'Pending Analysis',
      classes: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: AlertCircle
    }
  };

  const config = configs[normalized] || configs.unknown;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-xs font-bold',
    lg: 'px-3.5 py-1.5 text-sm font-bold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${config.classes} ${
        sizeClasses[size] || sizeClasses.md
      }`}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
};
