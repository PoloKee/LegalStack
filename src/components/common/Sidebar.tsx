import React from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Layers,
  Scale,
  CalendarDays,
  Zap,
  FolderArchive,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Company } from '../../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  company: Company;
  unreadFlags: number;
  unassignedApps: number;
  readinessScore: number;
  packageCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  company,
  unreadFlags,
  unassignedApps,
  readinessScore,
  packageCount,
}) => {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Readiness Score',
      icon: LayoutDashboard,
      badge: `${readinessScore}%`,
      badgeColor: readinessScore >= 80 ? 'text-emerald-400' : 'text-amber-400',
    },
    {
      id: 'vault',
      label: 'Entity & IP Vault',
      icon: ShieldCheck,
      badge: unassignedApps > 0 ? `${unassignedApps} pending` : '100% OK',
      badgeColor: unassignedApps > 0 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      id: 'software',
      label: 'Software Zip Scanner',
      icon: FolderArchive,
      badge: `${packageCount} zips`,
      badgeColor: 'text-indigo-400',
    },
    {
      id: 'triage',
      label: '42 Apps Triage',
      icon: Layers,
      badge: '80/20 Engine',
      badgeColor: 'text-indigo-400',
    },
    {
      id: 'finances',
      label: 'Clean Books & Flags',
      icon: Scale,
      badge: unreadFlags > 0 ? `${unreadFlags} flags` : 'Clean',
      badgeColor: unreadFlags > 0 ? 'text-red-400' : 'text-emerald-400',
    },
    {
      id: 'compliance',
      label: 'Compliance Calendar',
      icon: CalendarDays,
      badge: company.state,
      badgeColor: 'text-slate-400',
    },
    {
      id: 'monetization',
      label: 'Paywalls & Sprints',
      icon: Zap,
      badge: 'Stripe Snippets',
      badgeColor: 'text-violet-400',
    },
    {
      id: 'dataroom',
      label: 'Due Diligence Room',
      icon: FolderArchive,
      badge: 'Export Pack',
      badgeColor: 'text-slate-400',
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
      {/* Company Registry Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Registered Entity</span>
        </div>
        <div className="font-semibold text-slate-100 text-sm truncate">
          {company.legal_name}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
          <span>{company.state} {company.entity_type}</span>
          <span>·</span>
          <span className="font-mono text-slate-400">EIN: {company.ein}</span>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
          Management Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono shrink-0 ${item.badgeColor}`}>
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Founder Status Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 bg-slate-900/60">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Architecture Mode</span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            Active
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Designed for solo founders with 42+ apps scaling toward monetization or acquisition.
        </p>
      </div>
    </aside>
  );
};
