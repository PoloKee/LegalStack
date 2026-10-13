import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  Download,
  CheckCircle2,
  Copy,
  PenLine,
  FilePlus,
  BookOpen,
  Eye,
  Check,
  Sparkles,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { Company, Member, AppPortfolioItem, VaultDocument, AuditLogEntry } from '../../types';
import {
  buildIpAssignmentText,
  buildOperatingAgreementText,
  computeSha256,
  downloadLegalPdf,
} from '../../lib/pdfGenerator';
import confetti from 'canvas-confetti';

interface VaultViewProps {
  company: Company;
  members: Member[];
  apps: AppPortfolioItem[];
  documents: VaultDocument[];
  onUpdateDocuments: (docs: VaultDocument[]) => void;
  onUpdateApps: (apps: AppPortfolioItem[]) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
  initialMode?: 'table' | 'ip_gen' | 'oa_gen';
}

export const VaultView: React.FC<VaultViewProps> = ({
  company,
  members,
  apps,
  documents,
  onUpdateDocuments,
  onUpdateApps,
  onAddAuditLog,
  initialMode = 'table',
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'ip_generator' | 'oa_generator' | 'clauses'>(
    initialMode === 'ip_gen' ? 'ip_generator' : initialMode === 'oa_gen' ? 'oa_generator' : 'vault'
  );

  // IP Assignment Form State
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>(
    apps.filter((a) => !a.ip_assigned).map((a) => a.id).length > 0
      ? apps.filter((a) => !a.ip_assigned).map((a) => a.id)
      : apps.map((a) => a.id)
  );
  const [ipAssignorName, setIpAssignorName] = useState(members[0]?.full_name || 'Alex Mercer');
  const [ipEffectiveDate, setIpEffectiveDate] = useState(new Date().toISOString().slice(0, 10));

  // Operating Agreement Form State
  const [oaEffectiveDate, setOaEffectiveDate] = useState(company.formed_date || '2024-03-15');
  const [oaManagementType, setOaManagementType] = useState<'member' | 'manager'>('member');

  // Preview / Sign Modal State
  const [previewDoc, setPreviewDoc] = useState<{ title: string; content: string; hash: string } | null>(null);
  const [signingDoc, setSigningDoc] = useState<VaultDocument | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Missing documents calculation
  const hasSignedOA = documents.some((d) => d.type === 'operating_agreement' && d.status === 'signed');
  const totalApps = apps.length;
  const assignedApps = apps.filter((a) => a.ip_assigned).length;
  const allAppsAssigned = totalApps > 0 && assignedApps === totalApps;

  // Clause Library definitions
  const CLAUSE_LIBRARY = [
    {
      id: 'clause_ip_ownership',
      title: 'Article 4.1 — Exclusive Company IP Ownership',
      category: 'Intellectual Property',
      text: `All intellectual property, software codebases, AI models, prompts, algorithms, databases, domain names, customer lists, and inventions created by any Member in connection with the Company's business shall be the sole and exclusive property of the Company.`,
      purpose: 'Prevents co-founders or individual members from claiming personal copyright over apps built while working for the LLC.',
    },
    {
      id: 'clause_prior_works',
      title: 'Article 4.2 — Prior Works Assignment Clause',
      category: 'IP Chain of Title',
      text: `Each Member hereby unconditionally assigns and transfers to the Company all right, title, and interest in and to any pre-existing software applications or works contributed to or utilized by the Company as of the Effective Date.`,
      purpose: 'Crucial for solo founders who built 42+ apps prior to forming their LLC; cleanly transfers ownership retroactively.',
    },
    {
      id: 'clause_moral_rights',
      title: 'Article 4.3 — Moral Rights & Work Made For Hire',
      category: 'Copyright Defense',
      text: `Each Member waives, to the fullest extent permitted by law, any moral rights (droit moral) in the Works, including rights of attribution or integrity, and agrees that all works are deemed work made for hire.`,
      purpose: 'Ensures an acquirer can freely modify, rebrand, or rewrite the codebase without former owner objections.',
    },
    {
      id: 'clause_dissolution_ip',
      title: 'Article 6.2 — Non-Fragmentation on Dissolution',
      category: 'Asset Protection',
      text: `Upon any liquidation, dissolution, or wind-up of the Company, all Company Intellectual Property shall remain intact as an asset of the Company and sold or licensed in gross, and shall never be divided or fragmented piecemeal among Members without unanimous consent.`,
      purpose: 'Prevents business partners from dividing software codebases or splitting trademark rights in a dispute.',
    },
    {
      id: 'clause_transfer_restriction',
      title: 'Article 6.1 — Right of First Refusal & Transfer Restrictions',
      category: 'Corporate Governance',
      text: `No Member may sell, assign, pledge, or transfer any membership units without the prior written consent of all other Members. The Company maintains a 30-day right of first refusal at fair market value.`,
      purpose: 'Prevents outside investors or ex-spouses from acquiring equity without existing member approval.',
    },
  ];

  // Handler: Generate and save IP Assignment
  const handleGenerateIpAssignment = async () => {
    const selectedApps = apps.filter((a) => selectedAppIds.includes(a.id));
    if (!selectedApps.length) {
      alert('Please select at least one app to assign.');
      return;
    }

    const text = buildIpAssignmentText({
      company,
      assignor: members[0] || { full_name: ipAssignorName, role: 'Founder', ownership_pct: 100, is_self: true, id: 'm1', company_id: company.id, email: '' },
      apps: selectedApps,
      effectiveDate: ipEffectiveDate,
    });

    const hash = await computeSha256(text);
    const newDocId = `doc_ip_${Date.now()}`;

    const newDoc: VaultDocument = {
      id: newDocId,
      company_id: company.id,
      type: 'ip_assignment',
      title: `Master IP Assignment Agreement (${selectedApps.length} Apps)`,
      status: 'signed', // Direct execution
      version: 1,
      generated_at: new Date().toISOString(),
      signed_date: ipEffectiveDate,
      sha256_hash: hash,
      signatory_name: ipAssignorName,
      signatory_role: 'Founder & Assignor',
      assigned_apps: selectedApps.map((a) => a.id),
      content_preview: text,
      notes: `Executed assignment transferring all right, title, and interest in ${selectedApps.length} applications to ${company.legal_name}.`,
    };

    // Update documents
    const updatedDocs = [newDoc, ...documents];
    onUpdateDocuments(updatedDocs);

    // Update apps: flip assigned apps to ip_assigned = true
    const updatedApps = apps.map((app) => {
      if (selectedAppIds.includes(app.id)) {
        return { ...app, ip_assigned: true, assigned_doc_id: newDocId };
      }
      return app;
    });
    onUpdateApps(updatedApps);

    // Add Audit Log
    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'document.ip_assigned',
      actor: ipAssignorName,
      details: `Executed Master IP Assignment Agreement transferring ${selectedApps.length} apps to ${company.legal_name}.`,
      sha256_hash: hash,
    });

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    setActiveTab('vault');
  };

  // Handler: Generate Operating Agreement
  const handleGenerateOA = async () => {
    const text = buildOperatingAgreementText({
      company,
      members,
      effectiveDate: oaEffectiveDate,
    });

    const hash = await computeSha256(text);
    const newDocId = `doc_oa_${Date.now()}`;

    const newDoc: VaultDocument = {
      id: newDocId,
      company_id: company.id,
      type: 'operating_agreement',
      title: `Operating Agreement (${company.state} LLC)`,
      status: 'signed',
      version: 1,
      generated_at: new Date().toISOString(),
      signed_date: oaEffectiveDate,
      sha256_hash: hash,
      signatory_name: members[0]?.full_name || 'Alex Mercer',
      signatory_role: 'Managing Member',
      content_preview: text,
      notes: 'Master operating agreement with Article IV Intellectual Property asset protections.',
    };

    const updatedDocs = [newDoc, ...documents.filter((d) => d.type !== 'operating_agreement' || d.status !== 'draft')];
    onUpdateDocuments(updatedDocs);

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'document.oa_executed',
      actor: members[0]?.full_name || 'Alex Mercer',
      details: `Executed Operating Agreement for ${company.legal_name} with strict Article IV IP clauses.`,
      sha256_hash: hash,
    });

    confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    setActiveTab('vault');
  };

  // Handler: Record Signature on existing draft
  const handleRecordSignature = async (docId: string) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updated = documents.map((d) => {
      if (d.id === docId) {
        return {
          ...d,
          status: 'signed' as const,
          signed_date: new Date().toISOString().slice(0, 10),
          signatory_name: members[0]?.full_name || 'Alex Mercer',
        };
      }
      return d;
    });

    onUpdateDocuments(updated);

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'document.signed',
      actor: members[0]?.full_name || 'Alex Mercer',
      details: `Recorded executed signature on ${targetDoc.title}.`,
      sha256_hash: targetDoc.sha256_hash,
    });

    setSigningDoc(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Entity & IP Protection Vault
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Formal chain of title, master assignment agreements, and cryptographic corporate records for {company.legal_name}.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'vault' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Document Vault ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('ip_generator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'ip_generator' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Assign IP (42 Apps)
          </button>
          <button
            onClick={() => setActiveTab('oa_generator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'oa_generator' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Operating Agreement
          </button>
          <button
            onClick={() => setActiveTab('clauses')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'clauses' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Clause Library
          </button>
        </div>
      </div>

      {/* Overview Cards: IP Coverage & Missing Documents */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* IP Coverage Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              IP Chain of Title
            </span>
            {allAppsAssigned ? (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                100% Assigned
              </span>
            ) : (
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {totalApps - assignedApps} Pending
              </span>
            )}
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              {Math.round((assignedApps / Math.max(totalApps, 1)) * 100)}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {assignedApps} of {totalApps} applications assigned to LLC
            </div>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full ${allAppsAssigned ? 'bg-emerald-500' : 'bg-amber-500'}`}
              style={{ width: `${(assignedApps / Math.max(totalApps, 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Operating Agreement Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Operating Agreement
            </span>
            {hasSignedOA ? (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Signed & Active
              </span>
            ) : (
              <span className="text-[11px] font-mono text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                Unsigned Draft
              </span>
            )}
          </div>
          <div>
            <div className="text-base font-semibold text-white">
              {hasSignedOA ? 'Executed with Article IV IP Lock' : 'Action Required: Execution Pending'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Governs member rights, profit splits, and software title.
            </div>
          </div>
          {!hasSignedOA && (
            <button
              onClick={() => setActiveTab('oa_generator')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-3 flex items-center gap-1"
            >
              Execute Operating Agreement →
            </button>
          )}
        </div>

        {/* Tamper-Evident SHA-256 Vault */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Tamper Evidence
            </span>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Web Crypto SHA-256
            </span>
          </div>
          <div>
            <div className="text-base font-semibold text-white">
              {documents.filter((d) => d.status === 'signed').length} Verified Contracts
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Every signed agreement carries a verifiable cryptographic checksum.
            </div>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-3 truncate">
            Latest Hash: {documents[0]?.sha256_hash.substring(0, 18)}...
          </div>
        </div>
      </div>

      {/* TAB 1: Document Vault Table */}
      {activeTab === 'vault' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">
                Corporate Document Vault & Record Book
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official legal agreements, certificates of formation, and assignment instruments on file.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ip_generator')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>New IP Assignment</span>
              </button>
            </div>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Document Title</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Signed Date</th>
                  <th className="py-3 px-4 font-semibold font-mono">SHA-256 Checksum</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white">{doc.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {doc.notes || `${company.legal_name} · v${doc.version}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 uppercase">
                      {doc.type.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      {doc.status === 'signed' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Signed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Draft Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {doc.signed_date || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      <span title={doc.sha256_hash}>
                        {doc.sha256_hash.substring(0, 16)}...
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          const content =
                            doc.content_preview ||
                            (doc.type === 'ip_assignment'
                              ? buildIpAssignmentText({
                                  company,
                                  assignor: members[0],
                                  apps: apps.slice(0, 5),
                                  effectiveDate: doc.signed_date || '2024-04-15',
                                })
                              : buildOperatingAgreementText({
                                  company,
                                  members,
                                  effectiveDate: doc.signed_date || '2024-03-15',
                                }));
                          setPreviewDoc({ title: doc.title, content, hash: doc.sha256_hash });
                        }}
                        className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => {
                          const content =
                            doc.content_preview ||
                            buildOperatingAgreementText({
                              company,
                              members,
                              effectiveDate: doc.signed_date || '2024-03-15',
                            });
                          downloadLegalPdf(`${doc.type}_${company.state}`, doc.title, content, doc.sha256_hash);
                        }}
                        className="px-2.5 py-1 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-xs transition-colors"
                      >
                        PDF
                      </button>
                      {doc.status !== 'signed' && (
                        <button
                          onClick={() => handleRecordSignature(doc.id)}
                          className="px-2.5 py-1 text-white bg-emerald-600 hover:bg-emerald-500 rounded text-xs transition-colors font-medium"
                        >
                          Mark Signed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Master IP Assignment Generator */}
      {activeTab === 'ip_generator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Master Intellectual Property Assignment Generator
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Transfers full legal ownership of software codebases, AI models, and repositories from yourself (the individual author) to {company.legal_name}.
              This ensures an investor or acquirer has an unbroken chain of title.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assignor (Individual Creator)
              </label>
              <input
                type="text"
                value={ipAssignorName}
                onChange={(e) => setIpAssignorName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assignee (Company)
              </label>
              <input
                type="text"
                disabled
                value={`${company.legal_name} (${company.state} ${company.entity_type})`}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={ipEffectiveDate}
                onChange={(e) => setIpEffectiveDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* App Multi-Selector with 1-Click "Select All 42" */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Select Applications to Assign ({selectedAppIds.length} of {apps.length} selected)
              </label>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedAppIds(apps.map((a) => a.id))}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  Select All 42 Apps
                </button>
                <span className="text-slate-600">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedAppIds(apps.filter((a) => !a.ip_assigned).map((a) => a.id))}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  Select Only Unassigned ({apps.filter((a) => !a.ip_assigned).length})
                </button>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg max-h-72 overflow-y-auto divide-y divide-slate-800/80 bg-slate-950/40">
              {apps.map((app) => {
                const isSelected = selectedAppIds.includes(app.id);
                return (
                  <label
                    key={app.id}
                    className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-900 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAppIds([...selectedAppIds, app.id]);
                          } else {
                            setSelectedAppIds(selectedAppIds.filter((id) => id !== app.id));
                          }
                        }}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
                      />
                      <div className="truncate">
                        <span className="font-semibold text-white text-xs mr-2">
                          {app.name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {app.description}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-400">
                        {app.monthly_users.toLocaleString()} users
                      </span>
                      {app.ip_assigned ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Unassigned
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Transferring {selectedAppIds.length} apps irrevocably to {company.legal_name}.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const selectedApps = apps.filter((a) => selectedAppIds.includes(a.id));
                  const text = buildIpAssignmentText({
                    company,
                    assignor: members[0],
                    apps: selectedApps,
                    effectiveDate: ipEffectiveDate,
                  });
                  setPreviewDoc({
                    title: `Master IP Assignment Agreement (${selectedApps.length} Apps)`,
                    content: text,
                    hash: 'preview-hash-pending',
                  });
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
              >
                Preview Legal Text
              </button>
              <button
                type="button"
                onClick={handleGenerateIpAssignment}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Execute & Assign {selectedAppIds.length} Apps</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Operating Agreement Generator */}
      {activeTab === 'oa_generator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Operating Agreement Generator with Article IV IP Lock
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              The fundamental governing document of your {company.state} {company.entity_type}.
              This version embeds explicit covenants preventing founders or contractors from walking away with software codebases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-950/60 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Company Legal Name
              </label>
              <input
                type="text"
                disabled
                value={company.legal_name}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                State & Entity
              </label>
              <input
                type="text"
                disabled
                value={`${company.state} ${company.entity_type}`}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-md px-3 py-1.5 text-xs text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Formation / Effective Date
              </label>
              <input
                type="date"
                value={oaEffectiveDate}
                onChange={(e) => setOaEffectiveDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Members Breakdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Member Ownership Units (Schedule A)
            </label>
            <div className="border border-slate-800 rounded-lg divide-y divide-slate-800 bg-slate-950/40">
              {members.map((member) => (
                <div key={member.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-white">{member.full_name}</span>
                    <span className="text-slate-400 ml-2">({member.role})</span>
                  </div>
                  <div className="font-mono text-emerald-400 font-semibold">
                    {member.ownership_pct}% Equity
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Article IV Clauses Preview */}
          <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Included Article IV IP Asset Lock Provisions:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
              <li><strong className="text-slate-300">Section 4.1:</strong> Exclusive Company IP Ownership of all apps, prompts, models, and code.</li>
              <li><strong className="text-slate-300">Section 4.2:</strong> Retroactive assignment of all pre-existing software created prior to formation.</li>
              <li><strong className="text-slate-300">Section 4.3:</strong> Global moral rights waiver under US & foreign copyright statutes.</li>
              <li><strong className="text-slate-300">Section 5.2:</strong> Strict anti-commingling rule defending the corporate veil.</li>
              <li><strong className="text-slate-300">Section 6.2:</strong> Software IP cannot be fragmented piecemeal upon dissolution.</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Standard Delaware/US LLC multi-page operating agreement.
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const text = buildOperatingAgreementText({
                    company,
                    members,
                    effectiveDate: oaEffectiveDate,
                  });
                  setPreviewDoc({
                    title: `Operating Agreement (${company.state} LLC)`,
                    content: text,
                    hash: 'preview-hash-pending',
                  });
                }}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md border border-slate-700 transition-colors"
              >
                Preview Full Agreement
              </button>
              <button
                type="button"
                onClick={handleGenerateOA}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Execute & Save to Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Clause Library */}
      {activeTab === 'clauses' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Operating Agreement IP Clause Library
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pre-vetted legal clauses you can paste directly into an existing Operating Agreement or founder agreement to protect app ownership.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {CLAUSE_LIBRARY.map((clause) => (
              <div key={clause.id} className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">{clause.title}</span>
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-mono">
                      {clause.category}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(clause.text);
                      setCopiedNotification(true);
                      setTimeout(() => setCopiedNotification(false), 2000);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 rounded border border-slate-800 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Clause</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900/80 rounded border border-slate-800/80 text-xs font-mono text-slate-300 leading-relaxed select-all">
                  "{clause.text}"
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  <strong>Why it matters:</strong> {clause.purpose}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{previewDoc.title}</h3>
                <span className="text-[11px] font-mono text-slate-400">SHA-256: {previewDoc.hash}</span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/70 flex-1">
              {previewDoc.content}
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(previewDoc.content);
                  setCopiedNotification(true);
                  setTimeout(() => setCopiedNotification(false), 2000);
                }}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded border border-slate-700 flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw Text</span>
              </button>
              <button
                onClick={() => {
                  downloadLegalPdf('legal_agreement', previewDoc.title, previewDoc.content, previewDoc.hash);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast Banner */}
      {copiedNotification && (
        <div className="fixed bottom-6 right-6 bg-slate-800 text-white border border-slate-700 text-xs px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Copied to clipboard</span>
        </div>
      )}
    </div>
  );
};
