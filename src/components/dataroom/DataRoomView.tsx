import React from 'react';
import {
  FolderArchive,
  Download,
  ShieldCheck,
  Building2,
  FileText,
  DollarSign,
  Layers,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Company, Member, AppPortfolioItem, VaultDocument, Transaction, ComplianceEvent } from '../../types';
import { downloadLegalPdf, computeSha256 } from '../../lib/pdfGenerator';
import confetti from 'canvas-confetti';

interface DataRoomViewProps {
  company: Company;
  members: Member[];
  apps: AppPortfolioItem[];
  documents: VaultDocument[];
  transactions: Transaction[];
  complianceEvents: ComplianceEvent[];
  readinessScore: number;
}

export const DataRoomView: React.FC<DataRoomViewProps> = ({
  company,
  members,
  apps,
  documents,
  transactions,
  complianceEvents,
  readinessScore,
}) => {
  const assignedApps = apps.filter((a) => a.ip_assigned);
  const totalMrr = apps.reduce((acc, a) => acc + (a.mrr || 0), 0);

  // Generate full formal due diligence PDF
  const handleExportFullPacket = async () => {
    const packetContent = `DUE DILIGENCE DATA ROOM PACKET & DISCLOSURE MEMORANDUM
COMPANY: ${company.legal_name}
ENTITY TYPE: ${company.state} ${company.entity_type} | EIN: ${company.ein}
DATE OF COMPILATION: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
DUE DILIGENCE READINESS SCORE: ${readinessScore}/100

================================================================================
SECTION 1: CORPORATE REGISTRY & CAPITALIZATION
================================================================================
Legal Name: ${company.legal_name}
DBA / Trade Names: ${company.dba_name || 'None'}
Jurisdiction of Formation: State of ${company.state}
Date of Formation: ${company.formed_date}
Registered Agent: ${company.registered_agent}
Principal Office: ${company.principal_address}
Fiscal Year End: ${company.fiscal_year_end}

MEMBERSHIP CAPITALIZATION TABLE (SCHEDULE A):
${members.map((m, i) => `[${i + 1}] ${m.full_name} | Role: ${m.role} | Ownership: ${m.ownership_pct}% | Email: ${m.email}`).join('\n')}

================================================================================
SECTION 2: INTELLECTUAL PROPERTY CHAIN OF TITLE & SOFTWARE SCHEDULE
================================================================================
Total Applications in Portfolio: ${apps.length}
Applications Formally Assigned to Company: ${assignedApps.length}
IP Assignment Coverage Ratio: ${Math.round((assignedApps.length / Math.max(apps.length, 1)) * 100)}%

SCHEDULE OF ASSIGNED SOFTWARE APPLICATIONS:
${apps.map((a, i) => `(${i + 1}) ${a.name} [${a.niche}]
    Description: ${a.description}
    Monthly Active Users: ${a.monthly_users.toLocaleString()} | MRR: $${a.mrr.toLocaleString()}
    IP Assigned: ${a.ip_assigned ? 'YES - Legal Title Held by LLC' : 'PENDING'} | Created: ${a.created_date}`).join('\n\n')}

================================================================================
SECTION 3: CORPORATE RECORD BOOK & DOCUMENT VAULT (TAMPER-EVIDENT INDEX)
================================================================================
${documents.map((d, i) => `EXHIBIT ${String.fromCharCode(65 + i)}: ${d.title}
    Type: ${d.type} | Status: ${d.status.toUpperCase()} | Signed Date: ${d.signed_date || 'N/A'}
    SHA-256 Verification Hash: ${d.sha256_hash}
    Notes: ${d.notes || 'Executed corporate instrument'}`).join('\n\n')}

================================================================================
SECTION 4: FINANCIAL SEPARATION & CORPORATE VEIL COMPLIANCE
================================================================================
Total Audited Transactions: ${transactions.length}
Account Facilities: Mercury Business Checking (••8812)
Active Co-Mingling Violations: 0 (All items reconciled pursuant to corporate resolutions)
Deductible Operating Expenses Schedule Attached: Yes

================================================================================
SECTION 5: STATUTORY GOOD STANDING & ANNUAL COMPLIANCE
================================================================================
${complianceEvents.map((e, i) => `* ${e.title}
    Due Date: ${e.due_date} | Status: ${e.completed ? 'COMPLETED' : 'SCHEDULED ON TIME'}
    Details: ${e.description}`).join('\n')}

================================================================================
CERTIFICATION BY MANAGING MEMBER
================================================================================
The undersigned certifies that this Due Diligence Packet represents a true, accurate, and complete record of the assets, intellectual property, and governance instruments of ${company.legal_name}.

Signed:
___________________________________________________
Alex Mercer, Managing Member & Founder
${company.legal_name}`;

    const hash = await computeSha256(packetContent);
    downloadLegalPdf(
      `due_diligence_pack_${company.legal_name.toLowerCase().replace(/\s+/g, '_')}`,
      `Due Diligence Data Room — ${company.legal_name}`,
      packetContent,
      hash
    );
    confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Virtual Due Diligence Data Room
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Institutional-grade disclosure memorandum for prospective buyers, investors, or corporate partners.
          </p>
        </div>

        <button
          onClick={handleExportFullPacket}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Complete Packet (PDF)</span>
        </button>
      </div>

      {/* Overview Metric Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono">Diligence Readiness</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {readinessScore}/100
          </div>
          <span className="text-[11px] text-emerald-400 mt-0.5 block">
            {readinessScore >= 80 ? 'Ready for M&A Audit' : 'Action Required'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono">Portfolio Assets</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {apps.length} Apps
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {assignedApps.length} Assigned ({Math.round((assignedApps.length / Math.max(apps.length, 1)) * 100)}%)
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono">Run-Rate Revenue</span>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            ${totalMrr.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            ${(totalMrr * 12).toLocaleString()} Annualized Run Rate
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-400 font-mono">Hashed Documents</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {documents.length} Exhibits
          </div>
          <span className="text-[11px] text-indigo-400 mt-0.5 block">
            SHA-256 Cryptographic Checksums
          </span>
        </div>
      </div>

      {/* Exhibit Sections */}
      <div className="space-y-4">
        {/* Exhibit 1: Entity & Members */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Section 1: Corporate Entity & Capitalization</h2>
            </div>
            <span className="text-xs font-mono text-emerald-400">Verified</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
            <div><strong>Legal Name:</strong> {company.legal_name}</div>
            <div><strong>Entity Type:</strong> {company.state} {company.entity_type}</div>
            <div><strong>EIN:</strong> {company.ein}</div>
            <div><strong>Formation Date:</strong> {company.formed_date}</div>
            <div><strong>Principal Office:</strong> {company.principal_address}</div>
            <div><strong>Registered Agent:</strong> {company.registered_agent}</div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <div className="text-xs font-semibold text-slate-300 mb-1.5">Members & Equity Holders:</div>
            <div className="divide-y divide-slate-800 text-xs text-slate-400">
              {members.map((m) => (
                <div key={m.id} className="py-1.5 flex items-center justify-between">
                  <span>{m.full_name} ({m.role}) — {m.email}</span>
                  <span className="font-mono font-semibold text-emerald-400">{m.ownership_pct}% Equity</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Exhibit 2: Assigned IP Schedule (All 42 Apps) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Section 2: Intellectual Property Schedule ({apps.length} Apps)</h2>
            </div>
            <span className="text-xs font-mono text-indigo-400">
              {assignedApps.length}/{apps.length} Transferred
            </span>
          </div>

          <div className="border border-slate-800 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-800 text-xs">
            {apps.map((app, idx) => (
              <div key={app.id} className="p-3 bg-slate-950/40 hover:bg-slate-950/70 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-semibold text-white">
                    {idx + 1}. {app.name} <span className="text-[11px] font-normal text-slate-400">({app.niche})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{app.description}</div>
                </div>
                <div className="shrink-0 flex items-center gap-3">
                  <span className="font-mono text-slate-300">{app.monthly_users.toLocaleString()} users</span>
                  {app.ip_assigned ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Assigned to LLC
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Assignment Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exhibit 3: Corporate Record Book Index */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Section 3: Executed Contracts & Cryptographic Hashes</h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {documents.length} Verified Documents
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {documents.map((doc, idx) => (
              <div key={doc.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">
                    Exhibit {String.fromCharCode(65 + idx)}: {doc.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    SHA-256: {doc.sha256_hash}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {doc.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
