import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  Upload,
  ArrowRight,
  Sparkles,
  Zap,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { AppPortfolioItem, TriageCategory } from '../../types';
import { scoreApp } from '../../lib/scoring';

interface TriageViewProps {
  apps: AppPortfolioItem[];
  onUpdateApps: (apps: AppPortfolioItem[]) => void;
  onNavigateToMonetization: (appId?: string) => void;
  onNavigateToVault: () => void;
}

export const TriageView: React.FC<TriageViewProps> = ({
  apps,
  onUpdateApps,
  onNavigateToMonetization,
  onNavigateToVault,
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paywallFilter, setPaywallFilter] = useState<'all' | 'monetized' | 'free'>('all');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  // Add App state
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppNiche, setNewAppNiche] = useState('Developer Tools');
  const [newAppUsers, setNewAppUsers] = useState<number>(500);
  const [newAppMrr, setNewAppMrr] = useState<number>(0);
  const [newAppPaywall, setNewAppPaywall] = useState(false);
  const [newAppClarity, setNewAppClarity] = useState(4);
  const [newAppSpend, setNewAppSpend] = useState(4);
  const [newAppMaturity, setNewAppMaturity] = useState(4);
  const [newAppCompetition, setNewAppCompetition] = useState(3);

  // Re-score apps dynamically & sort descending
  const scoredApps = useMemo(() => {
    return apps
      .map((app) => ({
        ...app,
        score: scoreApp(app),
      }))
      .sort((a, b) => b.score - a.score);
  }, [apps]);

  // Identify Champion App (Top scoring app with paywall and users)
  const championApp = useMemo(() => {
    return scoredApps[0] || null;
  }, [scoredApps]);

  // Filtered apps
  const filteredApps = useMemo(() => {
    return scoredApps.filter((app) => {
      if (filterCategory !== 'all' && app.triage_status !== filterCategory) return false;
      if (paywallFilter === 'monetized' && !app.has_paywall) return false;
      if (paywallFilter === 'free' && app.has_paywall) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = app.name.toLowerCase().includes(q);
        const matchNiche = app.niche.toLowerCase().includes(q);
        const matchDesc = app.description.toLowerCase().includes(q);
        if (!matchName && !matchNiche && !matchDesc) return false;
      }
      return true;
    });
  }, [scoredApps, filterCategory, paywallFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: scoredApps.length,
      champion: 0,
      bundle: 0,
      scale: 0,
      shelve: 0,
      kill: 0,
    };
    scoredApps.forEach((a) => {
      counts[a.triage_status] = (counts[a.triage_status] || 0) + 1;
    });
    return counts;
  }, [scoredApps]);

  // Toggle paywall handler
  const handleTogglePaywall = (appId: string) => {
    const updated = apps.map((a) => {
      if (a.id === appId) {
        const nextPaywall = !a.has_paywall;
        return {
          ...a,
          has_paywall: nextPaywall,
          mrr: nextPaywall && a.mrr === 0 ? 150 : a.mrr,
        };
      }
      return a;
    });
    onUpdateApps(updated);
  };

  // Change triage category
  const handleChangeTriage = (appId: string, status: TriageCategory) => {
    const updated = apps.map((a) => (a.id === appId ? { ...a, triage_status: status } : a));
    onUpdateApps(updated);
  };

  // Bulk import parser
  const handleBulkImport = () => {
    const lines = bulkInput.split('\n').filter((l) => l.trim().length > 0);
    const parsed: AppPortfolioItem[] = lines.map((line, idx) => {
      const parts = line.split('|').map((p) => p.trim());
      const name = parts[0] || `Imported App ${idx + 1}`;
      const description = parts[1] || 'Imported AI Studio prototype application.';
      const users = parts[2] ? parseInt(parts[2], 10) || 100 : 250;
      const mrr = parts[3] ? parseInt(parts[3], 10) || 0 : 0;
      const niche = parts[4] || 'Micro-SaaS';

      const appItem: AppPortfolioItem = {
        id: `app_imp_${Date.now()}_${idx}`,
        company_id: 'comp_01',
        name,
        description,
        niche,
        problem_solved: description,
        monthly_users: users,
        mrr,
        has_paywall: mrr > 0,
        pricing_model: mrr > 0 ? 'subscription' : 'free',
        problem_clarity: 4,
        audience_spend: 3,
        build_maturity: 3,
        competition: 3,
        score: 60,
        triage_status: mrr > 0 ? 'bundle' : 'shelve',
        ip_assigned: false,
        created_date: new Date().toISOString().slice(0, 10),
      };
      appItem.score = scoreApp(appItem);
      return appItem;
    });

    onUpdateApps([...apps, ...parsed]);
    setBulkInput('');
    setIsBulkModalOpen(false);
  };

  // Add individual app
  const handleAddApp = () => {
    if (!newAppName.trim()) return;

    const newApp: AppPortfolioItem = {
      id: `app_custom_${Date.now()}`,
      company_id: 'comp_01',
      name: newAppName.trim(),
      description: newAppDesc.trim() || 'AI Studio Application',
      niche: newAppNiche,
      problem_solved: newAppDesc.trim(),
      monthly_users: newAppUsers,
      mrr: newAppMrr,
      has_paywall: newAppPaywall,
      pricing_model: newAppPaywall ? 'subscription' : 'free',
      problem_clarity: newAppClarity,
      audience_spend: newAppSpend,
      build_maturity: newAppMaturity,
      competition: newAppCompetition,
      score: 70,
      triage_status: newAppMrr > 0 ? 'bundle' : 'shelve',
      ip_assigned: false,
      created_date: new Date().toISOString().slice(0, 10),
    };
    newApp.score = scoreApp(newApp);

    onUpdateApps([newApp, ...apps]);
    setIsAddModalOpen(false);
    setNewAppName('');
    setNewAppDesc('');
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Portfolio Triage & 80/20 Monetization Engine
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Analyzing {apps.length} applications across audience willingness to pay, user density, and ARR leverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add App</span>
          </button>
        </div>
      </div>

      {/* Champion App Hero Callout */}
      {championApp && (
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  Portfolio Champion App (80/20 Winner)
                </span>
                <span className="text-xs font-mono text-indigo-400">
                  Score {championApp.score}/100
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight">
                {championApp.name}
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                {championApp.description}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                <span><strong>Niche:</strong> {championApp.niche}</span>
                <span>·</span>
                <span><strong>Users:</strong> {championApp.monthly_users.toLocaleString()}/mo</span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold font-mono">
                  ${championApp.mrr.toLocaleString()} MRR (${(championApp.mrr * 12).toLocaleString()} ARR)
                </span>
                <span>·</span>
                <span>
                  <strong>IP Status:</strong>{' '}
                  {championApp.ip_assigned ? (
                    <span className="text-emerald-400 font-medium">Assigned to LLC</span>
                  ) : (
                    <span className="text-amber-400 font-medium">Assignment Pending</span>
                  )}
                </span>
              </div>
            </div>

            {/* Champion Action Box */}
            <div className="lg:w-80 shrink-0 bg-slate-950/80 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Next 7-Day Scaling Directive</span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Deploy automated Stripe paywall upgrade hooks</li>
                <li>Launch 7-Day Founder Content Sprint targeting engineers</li>
                <li>Bundle top complementary apps as premium add-ons</li>
              </ul>
              <div className="pt-1">
                <button
                  onClick={() => onNavigateToMonetization(championApp.id)}
                  className="w-full py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Generate Paywall Code & Bundle Page</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All 42 Apps', count: categoryCounts.all },
            { id: 'champion', label: 'Champion', count: categoryCounts.champion },
            { id: 'bundle', label: 'Bundle', count: categoryCounts.bundle },
            { id: 'scale', label: 'Scale Up', count: categoryCounts.scale },
            { id: 'shelve', label: 'Shelve', count: categoryCounts.shelve },
            { id: 'kill', label: 'Kill / Retire', count: categoryCounts.kill },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterCategory === tab.id
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800/80'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 font-mono text-[10px] text-slate-400">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search & Paywall Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search apps by name, description, or niche..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Paywall:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded border border-slate-800 text-xs">
              <button
                onClick={() => setPaywallFilter('all')}
                className={`px-2 py-0.5 rounded text-[11px] ${paywallFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                All
              </button>
              <button
                onClick={() => setPaywallFilter('monetized')}
                className={`px-2 py-0.5 rounded text-[11px] ${paywallFilter === 'monetized' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400'}`}
              >
                Monetized
              </button>
              <button
                onClick={() => setPaywallFilter('free')}
                className={`px-2 py-0.5 rounded text-[11px] ${paywallFilter === 'free' ? 'bg-slate-800 text-slate-200' : 'text-slate-400'}`}
              >
                Free Only
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* High-Density Apps Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">App Title & Niche</th>
                <th className="py-3 px-4 font-semibold text-center">80/20 Score</th>
                <th className="py-3 px-4 font-semibold text-right">Users / Mo</th>
                <th className="py-3 px-4 font-semibold text-right">MRR</th>
                <th className="py-3 px-4 font-semibold text-center">Paywall</th>
                <th className="py-3 px-4 font-semibold text-center">IP Assigned</th>
                <th className="py-3 px-4 font-semibold text-center">Triage Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-850 transition-colors">
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-white text-xs">{app.name}</div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {app.description}
                    </div>
                    <span className="inline-block text-[10px] text-indigo-400/90 font-mono mt-1">
                      {app.niche}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center justify-center font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-white">
                      {app.score}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-300">
                    {app.monthly_users.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                    {app.mrr > 0 ? `$${app.mrr.toLocaleString()}` : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleTogglePaywall(app.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        app.has_paywall
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      }`}
                    >
                      {app.has_paywall ? 'Active' : '+ Add'}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {app.ip_assigned ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                      </span>
                    ) : (
                      <button
                        onClick={onNavigateToVault}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:underline"
                      >
                        Assign
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <select
                      value={app.triage_status}
                      onChange={(e) => handleChangeTriage(app.id, e.target.value as TriageCategory)}
                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="champion">Champion</option>
                      <option value="bundle">Bundle</option>
                      <option value="scale">Scale Up</option>
                      <option value="shelve">Shelve</option>
                      <option value="kill">Kill / Retire</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Bulk Import Applications</h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste your app list (one per line). Format: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400">Name | Description | Users | MRR | Niche</code>
            </p>
            <textarea
              rows={8}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={`FastChangelog | Generates release notes from git commits | 1200 | 450 | DevTools\nLeadScrape AI | Prospect finder | 500 | 290 | Sales\nFocusTimer | Pomodoro sound generator | 800 | 0 | Productivity`}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
              >
                Import Apps
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Single App Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Add Application to Portfolio</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">App Name</label>
                <input
                  type="text"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. PromptAudit AI"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="What does it solve?"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Monthly Users</label>
                  <input
                    type="number"
                    value={newAppUsers}
                    onChange={(e) => setNewAppUsers(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Current MRR ($)</label>
                  <input
                    type="number"
                    value={newAppMrr}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setNewAppMrr(val);
                      if (val > 0) setNewAppPaywall(true);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="paywall_check"
                  checked={newAppPaywall}
                  onChange={(e) => setNewAppPaywall(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600"
                />
                <label htmlFor="paywall_check" className="text-slate-300 cursor-pointer">
                  Has active payment processing / paywall installed
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddApp}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
              >
                Save App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
