import React from 'react';
import { Shield, Download, RotateCcw } from 'lucide-react';
import { Company } from '../../types';

interface HeaderProps {
  company: Company;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onExportDataRoom: () => void;
  onResetData: () => void;
  readinessScore: number;
}

export const Header: React.FC<HeaderProps> = ({
  company,
  activeTab,
  setActiveTab,
  onExportDataRoom,
  onResetData,
  readinessScore,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900 border-b border-slate-800 text-slate-100 z-30 shrink-0">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <Shield className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold tracking-tight text-white font-sans">
            LegalStack Architect
          </span>
          <span className="text-xs text-slate-400 font-normal">
            {company.legal_name}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'dashboard' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          Readiness ({readinessScore}%)
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'vault' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          IP & Vault
        </button>
        <button
          onClick={() => setActiveTab('triage')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'triage' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          Portfolio (42 Apps)
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'finances' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          Clean Books
        </button>
        <button
          onClick={() => setActiveTab('software')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'software' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          Software Zip Scanner
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={`whitespace-nowrap transition-colors hover:text-white pb-0.5 ${
            activeTab === 'compliance' ? 'text-indigo-400 font-semibold border-b border-indigo-400' : ''
          }`}
        >
          Calendar
        </button>
      </nav>

      {/* Zone 3: Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onResetData}
          title="Reset to fresh 42-app demo data"
          className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md border border-slate-700/60 transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
        <button
          onClick={onExportDataRoom}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Due Diligence Packet</span>
        </button>
      </div>
    </header>
  );
};
