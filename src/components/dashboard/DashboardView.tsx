import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  DollarSign,
  FileCheck2,
  CalendarCheck,
  Lock,
  ExternalLink,
  FolderArchive,
} from 'lucide-react';
import { ReadinessScoreResult, AppPortfolioItem, VaultDocument, Transaction, ComplianceEvent, AuditLogEntry, Company } from '../../types';

interface DashboardViewProps {
  company: Company;
  readiness: ReadinessScoreResult;
  apps: AppPortfolioItem[];
  documents: VaultDocument[];
  transactions: Transaction[];
  complianceEvents: ComplianceEvent[];
  auditLog: AuditLogEntry[];
  setActiveTab: (tab: string) => void;
  onOpenIpAssignment: () => void;
  onOpenOperatingAgreement: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  company,
  readiness,
  apps,
  documents,
  transactions,
  complianceEvents,
  auditLog,
  setActiveTab,
  onOpenIpAssignment,
  onOpenOperatingAgreement,
}) => {
  const { total, grade, gradeTone, breakdown, reasons } = readiness;

  // SVG Gauge calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (total / 100) * circumference;

  const toneColor =
    gradeTone === 'green' ? '#10b981' : gradeTone === 'amber' ? '#f59e0b' : '#ef4444';

  const totalMrr = apps.reduce((acc, a) => acc + (a.mrr || 0), 0);
  const monetizedApps = apps.filter((a) => a.has_paywall).length;
  const assignedApps = apps.filter((a) => a.ip_assigned).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Due Diligence Readiness Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time evaluation of corporate structure, IP chain of title, and financial separation for {company.legal_name}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Target Standard:</span>
          <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ≥ 80% For Angel/M&A Due Diligence
          </span>
        </div>
      </div>

      {/* Top Section: Score Hero + Action Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Readiness Radial Meter (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-3 left-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Overall Score
          </div>

          <div className="relative w-36 h-36 my-2 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
              <circle
                cx="65"
                cy="65"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                stroke={toneColor}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold text-white tracking-tight font-mono">
                {total}
              </span>
              <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                / 100
              </span>
            </div>
          </div>

          <div className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${
            gradeTone === 'green' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
            gradeTone === 'amber' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
            'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}>
            {grade}
          </div>

          <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-xs">
            {total >= 80
              ? 'Your IP assignments and governance records satisfy institutional investor and acquirer diligence audits.'
              : 'Gaps identified in pre-existing app assignments or financial co-mingling that could delay or discount an acquisition.'}
          </p>
        </div>

        {/* Action Queue: "Fix These First" (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Critical Diligence Action Queue
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {reasons.length} Pending Gaps
            </span>
          </div>

          {reasons.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/40 rounded-lg border border-slate-800/60">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mb-2" />
              <h3 className="text-sm font-semibold text-white">Full Diligence Defense Verified</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                All 42 apps have signed IP assignments, Operating Agreement Article IV is executed, and zero co-mingling flags remain.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {reasons.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-4 p-3 bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 rounded-lg transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider font-mono">
                        {item.component}
                      </span>
                      <span className="text-[10px] text-amber-400/90 font-mono">
                        +{item.delta} pts to score
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {item.component === 'IP Coverage' ? (
                      <button
                        onClick={onOpenIpAssignment}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                      >
                        <span>Assign IP</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : item.component === 'Operating Agreement' ? (
                      <button
                        onClick={onOpenOperatingAgreement}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1 shadow-sm whitespace-nowrap"
                      >
                        <span>Sign OA</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab(item.actionTab)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors flex items-center gap-1 whitespace-nowrap"
                      >
                        <span>Resolve</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5 Core Component Breakdown Bars */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4">
          Weighted Diligence Component Breakdown
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
          {/* 1. IP Coverage */}
          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">IP Coverage</span>
              <span className="font-mono text-white font-semibold">{breakdown.ipCoverage}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${breakdown.ipCoverage >= 90 ? 'bg-emerald-500' : breakdown.ipCoverage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${breakdown.ipCoverage}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">
              40% Weight · {assignedApps}/{apps.length} apps signed
            </span>
          </div>

          {/* 2. Legal Docs */}
          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Legal Docs</span>
              <span className="font-mono text-white font-semibold">{breakdown.legalDocs}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${breakdown.legalDocs >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${breakdown.legalDocs}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">
              20% Weight · OA & IP clauses
            </span>
          </div>

          {/* 3. Compliance Health */}
          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Compliance</span>
              <span className="font-mono text-white font-semibold">{breakdown.complianceHealth}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${breakdown.complianceHealth >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${breakdown.complianceHealth}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">
              20% Weight · {company.state} Filings on track
            </span>
          </div>

          {/* 4. Financial Separation */}
          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Clean Books</span>
              <span className="font-mono text-white font-semibold">{breakdown.financialSeparation}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${breakdown.financialSeparation >= 80 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${breakdown.financialSeparation}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">
              10% Weight · Zero co-mingling
            </span>
          </div>

          {/* 5. Audit Trail */}
          <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">Audit Record</span>
              <span className="font-mono text-white font-semibold">{breakdown.auditTrail}%</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full ${breakdown.auditTrail >= 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${breakdown.auditTrail}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">
              10% Weight · SHA-256 hashes
            </span>
          </div>
        </div>
      </div>

      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: 42 Apps Portfolio */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Portfolio Scope</span>
            <FileCheck2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {apps.length} Apps
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {assignedApps} assigned · {apps.length - assignedApps} pending transfer
            </div>
          </div>
          <button
            onClick={() => setActiveTab('triage')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 flex items-center gap-1"
          >
            Open 80/20 Triage <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: Monetized ARR / MRR */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Portfolio Run Rate</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              ${totalMrr.toLocaleString()} <span className="text-xs font-normal text-slate-400">MRR</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              ${(totalMrr * 12).toLocaleString()} ARR · {monetizedApps}/{apps.length} monetized
            </div>
          </div>
          <button
            onClick={() => setActiveTab('monetization')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 flex items-center gap-1"
          >
            Add Paywall Codes <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: Financial Cleanliness */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Corporate Veil Defense</span>
            <Lock className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {breakdown.financialSeparation}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {transactions.filter((t) => t.flag && !t.flag.resolved).length} co-mingling flags active
            </div>
          </div>
          <button
            onClick={() => setActiveTab('finances')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 flex items-center gap-1"
          >
            Audit Transactions <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: Next Compliance Deadline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>State Compliance</span>
            <CalendarCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-white truncate">
              {company.state} Franchise Tax
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Due June 1 ($300) · Registered Agent Active
            </div>
          </div>
          <button
            onClick={() => setActiveTab('compliance')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 flex items-center gap-1"
          >
            View Calendar <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Software Archive Vault & Scanner Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Software Zip Archive Vault & Codebase Scanner</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload software zip files to organized folders, run static AST security & secret leak audits, and batch download archives.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('software')}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
        >
          <span>Open Software Scanner</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Corporate Audit Log Trail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Corporate Record Book & Cryptographic Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only immutable record verifying timestamped legal events and SHA-256 hashes for acquirers.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {auditLog.length} Recorded Entries
          </span>
        </div>

        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <div className="divide-y divide-slate-800/80 max-h-64 overflow-y-auto">
            {auditLog.map((log) => (
              <div key={log.id} className="p-3 bg-slate-950/40 hover:bg-slate-950/70 flex items-start justify-between gap-4 text-xs transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{log.action}</span>
                    <span className="text-slate-400">by</span>
                    <span className="text-slate-300">{log.actor}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5 text-xs truncate">
                    {log.details}
                  </p>
                </div>
                {log.sha256_hash && (
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 block">
                      SHA: {log.sha256_hash.substring(0, 14)}...
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
