import React, { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { Transaction, Company, AuditLogEntry } from '../../types';
import { computeCleanBooksScore } from '../../lib/scoring';
import { downloadLegalPdf, computeSha256 } from '../../lib/pdfGenerator';
import confetti from 'canvas-confetti';

interface FinancesViewProps {
  company: Company;
  transactions: Transaction[];
  onUpdateTransactions: (txns: Transaction[]) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  company,
  transactions,
  onUpdateTransactions,
  onAddAuditLog,
}) => {
  const [activeAccountFilter, setActiveAccountFilter] = useState<'all' | 'business' | 'personal'>('all');
  const [filterOnlyFlagged, setFilterOnlyFlagged] = useState(false);
  const [resolvingTxn, setResolvingTxn] = useState<Transaction | null>(null);
  const [isAddTxnOpen, setIsAddTxnOpen] = useState(false);

  // New Transaction Form state
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState<number>(50);
  const [newAccountType, setNewAccountType] = useState<'business' | 'personal'>('business');
  const [newAccountName, setNewAccountName] = useState('Mercury Business Checking');
  const [newCategory, setNewCategory] = useState('Software');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const { score, flaggedCount, highSeverityCount } = computeCleanBooksScore(transactions);

  // Filtered transactions
  const filteredTxns = transactions.filter((t) => {
    if (activeAccountFilter !== 'all' && t.account_type !== activeAccountFilter) return false;
    if (filterOnlyFlagged && (!t.flag || t.flag.resolved)) return false;
    return true;
  });

  // Automated Co-Mingling Scan pattern for new additions
  const scanForCoMingling = (desc: string, accountType: 'business' | 'personal', amount: number) => {
    const isBiz = accountType === 'business';
    const looksBiz = /stripe|vercel|supabase|openai|aws|domain|ads|github|linear|notion|google|api/i.test(desc);
    const looksPersonal = /groceries|netflix|rent|gym|personal|coffee|uber|doordash|whole foods|dining/i.test(desc);

    if (isBiz && looksPersonal) {
      return {
        severity: 'high' as const,
        reason: 'Personal expense paid from business account (pierces corporate veil)',
        resolved: false,
      };
    }
    if (!isBiz && looksBiz) {
      return {
        severity: 'high' as const,
        reason: 'Business operating expense paid with personal funds (requires formal reimbursement)',
        resolved: false,
      };
    }
    if (!isBiz && amount > 1000 && /deposit|transfer|client/i.test(desc)) {
      return {
        severity: 'medium' as const,
        reason: 'Large customer/client deposit received into personal account',
        resolved: false,
      };
    }
    return undefined;
  };

  // Add transaction
  const handleAddTransaction = () => {
    if (!newDesc.trim()) return;

    const flag = scanForCoMingling(newDesc, newAccountType, Math.abs(newAmount));

    const newTxn: Transaction = {
      id: `txn_${Date.now()}`,
      company_id: company.id,
      account_type: newAccountType,
      account_name: newAccountName,
      date: newDate,
      description: newDesc.trim(),
      amount: newAmount,
      category: newCategory,
      is_deductible: newAccountType === 'business' && !flag,
      flag,
    };

    onUpdateTransactions([newTxn, ...transactions]);
    setIsAddTxnOpen(false);
    setNewDesc('');
  };

  // Resolve Co-Mingling Flag
  const handleResolveFlag = (txn: Transaction, resolutionType: 'reimbursement' | 'draw') => {
    const updated = transactions.map((t) => {
      if (t.id === txn.id && t.flag) {
        return {
          ...t,
          flag: {
            ...t.flag,
            resolved: true,
            reason: `${t.flag.reason} [RESOLVED: ${resolutionType === 'reimbursement' ? 'Formal Member Reimbursement Voucher Recorded' : 'Member Capital Distribution Recorded'}]`,
          },
        };
      }
      return t;
    });

    onUpdateTransactions(updated);

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'finance.flag_resolved',
      actor: 'Alex Mercer',
      details: `Resolved co-mingling flag on "${txn.description}" ($${Math.abs(txn.amount)}) via ${resolutionType}.`,
    });

    setResolvingTxn(null);
    confetti({ particleCount: 50, spread: 50 });
  };

  // Export Tax-Time Schedule C Deductible CSV
  const handleExportTaxCsv = () => {
    const deductibleTxns = transactions.filter((t) => t.account_type === 'business' && t.amount < 0 && (!t.flag || t.flag.resolved));
    const header = 'Date,Description,Category,IRS Schedule C Line,Amount\n';
    const rows = deductibleTxns
      .map((t) => `"${t.date}","${t.description.replace(/"/g, '""')}","${t.category}","${t.tax_category || 'Other Expenses'}",${Math.abs(t.amount).toFixed(2)}`)
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `schedule_c_deductions_${company.legal_name.toLowerCase().replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export Monthly Clean Books Certificate PDF
  const handleExportCleanBooksPdf = async () => {
    const totalDeductible = transactions
      .filter((t) => t.amount < 0 && t.account_type === 'business' && (!t.flag || t.flag.resolved))
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const reportContent = `MONTHLY FINANCIAL SEPARATION CERTIFICATION & CLEAN BOOKS AUDIT
COMPANY: ${company.legal_name} (${company.state} ${company.entity_type})
EIN: ${company.ein}
DATE OF REPORT: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

I. CERTIFICATION OF FINANCIAL INDEPENDENCE
The undersigned Managing Member hereby certifies under penalty of perjury that:
1. The Company maintains dedicated commercial bank accounts strictly in the name of ${company.legal_name}.
2. All revenues generated from the Company's 42 software applications are received directly into Company accounts.
3. Personal expenditures paid through Company facilities are audited and recorded as documented Member Capital Draws or reimbursed pursuant to written reimbursement vouchers.
4. The corporate veil has been continuously respected in accordance with ${company.state} LLC jurisprudence.

II. FINANCIAL RECONCILIATION SUMMARY
Total Transactions Audited: ${transactions.length}
Clean Books Health Score: ${score}/100
Unresolved Co-Mingling Invariants: ${flaggedCount}
Total Legitimate Business Deductions: $${totalDeductible.toLocaleString(undefined, { minimumFractionDigits: 2 })}

III. AUDIT VERIFICATION OF INVARIANTS
All transactions flagged by LegalStack automated co-mingling detectors have been reviewed and resolved to prevent alter-ego liability.

CERTIFIED & EXECUTED:
___________________________________________________
Alex Mercer, Managing Member & Founder
${company.legal_name}`;

    const hash = await computeSha256(reportContent);
    downloadLegalPdf('clean_books_certificate', 'Clean Books Certification', reportContent, hash);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Financial Separation & Corporate Veil Defense
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time co-mingling detection preventing alter-ego lawsuits from piercing your LLC protection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportTaxCsv}
            className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Schedule C CSV</span>
          </button>
          <button
            onClick={handleExportCleanBooksPdf}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Clean Books PDF</span>
          </button>
        </div>
      </div>

      {/* Top Cards: Score & Flags Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Clean Books Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Clean Books Score
            </span>
            <span className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
              score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              score >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {score >= 80 ? 'Protected' : 'Risk Detected'}
            </span>
          </div>
          <div>
            <div className="text-3xl font-extrabold font-mono text-white">
              {score}/100
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Calculated from {transactions.length} business & personal ledger entries
            </div>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full ${score >= 80 ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Co-Mingling Flags Count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Co-Mingling Detector
            </span>
            {flaggedCount > 0 ? (
              <span className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                {flaggedCount} Active Flags
              </span>
            ) : (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Zero Flags
              </span>
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-white">
              {highSeverityCount} High Severity Veils Risks
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {highSeverityCount > 0
                ? 'Personal expenses paid from company accounts jeopardize liability protection.'
                : 'All business expenditures are cleanly segregated.'}
            </div>
          </div>
          {flaggedCount > 0 && (
            <button
              onClick={() => setFilterOnlyFlagged(true)}
              className="text-xs text-amber-400 hover:underline font-medium mt-3 text-left"
            >
              Filter {flaggedCount} unresolved flags →
            </button>
          )}
        </div>

        {/* Deductible Tax Schedule Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Schedule C Deductions
            </span>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Tax Ready
            </span>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ${transactions
                .filter((t) => t.amount < 0 && t.account_type === 'business' && (!t.flag || t.flag.resolved))
                .reduce((acc, t) => acc + Math.abs(t.amount), 0)
                .toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Deductible SaaS, hosting, domains & devtools tracked
            </div>
          </div>
          <button
            onClick={handleExportTaxCsv}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 text-left flex items-center gap-1"
          >
            Download CSV Schedule →
          </button>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Account Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveAccountFilter('all')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                activeAccountFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              All Accounts ({transactions.length})
            </button>
            <button
              onClick={() => setActiveAccountFilter('business')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                activeAccountFilter === 'business' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              Business (Mercury)
            </button>
            <button
              onClick={() => setActiveAccountFilter('personal')}
              className={`px-3 py-1 rounded text-xs font-medium ${
                activeAccountFilter === 'personal' ? 'bg-slate-800 text-white' : 'text-slate-400'
              }`}
            >
              Personal (Chase)
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOnlyFlagged}
                onChange={(e) => setFilterOnlyFlagged(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-indigo-600"
              />
              <span>Only Show Co-Mingling Flags</span>
            </label>
            <button
              onClick={() => setIsAddTxnOpen(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Account</th>
                <th className="py-3 px-4 font-semibold">Description & Co-Mingling Flag</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredTxns.map((txn) => {
                const hasUnresolvedFlag = txn.flag && !txn.flag.resolved;
                return (
                  <tr
                    key={txn.id}
                    className={`transition-colors ${
                      hasUnresolvedFlag ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-slate-850'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {txn.date}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        txn.account_type === 'business'
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {txn.account_name}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{txn.description}</div>
                      {txn.flag && (
                        <div className={`mt-1 text-[11px] leading-tight flex items-start gap-1.5 ${
                          txn.flag.resolved ? 'text-emerald-400/90' : 'text-red-400'
                        }`}>
                          {txn.flag.resolved ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                          )}
                          <span>{txn.flag.reason}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {txn.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium whitespace-nowrap">
                      <span className={txn.amount > 0 ? 'text-emerald-400' : 'text-slate-200'}>
                        {txn.amount > 0 ? `+$${txn.amount.toFixed(2)}` : `-$${Math.abs(txn.amount).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {hasUnresolvedFlag ? (
                        <button
                          onClick={() => setResolvingTxn(txn)}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded transition-colors"
                        >
                          Resolve Flag
                        </button>
                      ) : txn.flag?.resolved ? (
                        <span className="text-[11px] text-emerald-400 font-mono">Resolved</span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Clean</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flag Resolution Modal */}
      {resolvingTxn && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Resolve Co-Mingling Flag</span>
              </h3>
              <button onClick={() => setResolvingTxn(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-300 space-y-1">
              <div><strong>Transaction:</strong> {resolvingTxn.description}</div>
              <div><strong>Amount:</strong> ${Math.abs(resolvingTxn.amount).toFixed(2)}</div>
              <div><strong>Account:</strong> {resolvingTxn.account_name}</div>
              <div className="text-red-400"><strong>Flag:</strong> {resolvingTxn.flag?.reason}</div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              To defend your corporate veil against creditor scrutiny, choose the legal accounting treatment to reclassify this item:
            </p>

            <div className="space-y-2 pt-1">
              {resolvingTxn.account_type === 'personal' ? (
                <button
                  onClick={() => handleResolveFlag(resolvingTxn, 'reimbursement')}
                  className="w-full text-left p-3 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors"
                >
                  <div className="font-semibold text-white text-xs">Execute Member Expense Reimbursement</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Generate an official accountable plan reimbursement voucher transferring ${Math.abs(resolvingTxn.amount).toFixed(2)} from LLC checking to founder.
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => handleResolveFlag(resolvingTxn, 'draw')}
                  className="w-full text-left p-3 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 transition-colors"
                >
                  <div className="font-semibold text-white text-xs">Classify as Member Capital Distribution (Draw)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Reclassifies personal expenditure as non-deductible owner withdrawal under IRS regulations.
                  </div>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setResolvingTxn(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddTxnOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Log Bank Transaction</h3>
              <button onClick={() => setIsAddTxnOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description / Merchant</label>
                <input
                  type="text"
                  placeholder="e.g. OpenAI API or Whole Foods"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Amount ($ - negative for expense)</label>
                  <input
                    type="number"
                    value={newAmount}
                    onChange={(e) => setNewAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Account Type</label>
                  <select
                    value={newAccountType}
                    onChange={(e) => {
                      const val = e.target.value as 'business' | 'personal';
                      setNewAccountType(val);
                      setNewAccountName(val === 'business' ? 'Mercury Business Checking' : 'Chase Personal Checking');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  >
                    <option value="business">Business Account</option>
                    <option value="personal">Personal Account</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAddTxnOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTransaction}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded"
              >
                Record Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
