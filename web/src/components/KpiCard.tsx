import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: 'agri' | 'cold' | 'amber' | 'rose';
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon,
  tone = 'agri',
  onClick
}) => {
  const toneClasses = {
    agri: 'bg-agri-500/10 text-agri-700 dark:text-agri-400 border-agri-200 dark:border-agri-800/60',
    cold: 'bg-cold-500/10 text-cold-700 dark:text-cold-400 border-cold-200 dark:border-cold-800/60',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
    rose: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
  };

  const iconBgClasses = {
    agri: 'bg-agri-600 text-white shadow-md shadow-agri-600/20',
    cold: 'bg-cold-600 text-white shadow-md shadow-cold-600/20',
    amber: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
    rose: 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg ${
        onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBgClasses[tone]}`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{value}</span>
        {change && (
          <span className={`inline-flex items-center text-xs font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</div>
      )}
    </div>
  );
};
