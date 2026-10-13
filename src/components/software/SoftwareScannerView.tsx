import React, { useState, useRef } from 'react';
import {
  Upload,
  FolderArchive,
  FolderPlus,
  Folder,
  Download,
  ShieldCheck,
  ShieldAlert,
  FileCode,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileText,
  KeyRound,
  DollarSign,
  ArrowRight,
  ExternalLink,
  Trash2,
  Check,
  Info,
  Clock,
  FileSpreadsheet,
  ChevronRight,
  Copy,
  Terminal,
  Cpu,
  Package,
  Boxes,
} from 'lucide-react';
import {
  Company,
  SoftwareFolder,
  UploadedSoftwarePackage,
  SoftwareScanResult,
  AppPortfolioItem,
  VaultDocument,
  AuditLogEntry,
  ScannedFileMeta,
} from '../../types';
import { scanSoftwareZip, createDemoSoftwareZip } from '../../lib/softwareScanner';
import {
  downloadSoftwareBatchZip,
  downloadSinglePackageZip,
  downloadAuditMarkdownReport,
} from '../../lib/batchDownloader';
import confetti from 'canvas-confetti';

interface SoftwareScannerViewProps {
  company: Company;
  folders: SoftwareFolder[];
  softwarePackages: UploadedSoftwarePackage[];
  apps: AppPortfolioItem[];
  onUpdateFolders: (folders: SoftwareFolder[]) => void;
  onUpdateSoftwarePackages: (packages: UploadedSoftwarePackage[]) => void;
  onUpdateApps: (apps: AppPortfolioItem[]) => void;
  onAddAuditLog: (entry: AuditLogEntry) => void;
  onAddDocument: (doc: VaultDocument) => void;
}

export const SoftwareScannerView: React.FC<SoftwareScannerViewProps> = ({
  company,
  folders,
  softwarePackages,
  apps,
  onUpdateFolders,
  onUpdateSoftwarePackages,
  onUpdateApps,
  onAddAuditLog,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'clean' | 'flagged' | 'assigned' | 'unassigned'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressText, setScanProgressText] = useState('');
  const [inspectingPackage, setInspectingPackage] = useState<UploadedSoftwarePackage | null>(null);
  const [inspectTab, setInspectTab] = useState<'overview' | 'security' | 'legal' | 'monetization' | 'files'>('overview');
  const [inspectActiveFile, setInspectActiveFile] = useState<ScannedFileMeta | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Drag and Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(null);

  // New Folder Modal
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  // Move Folder Modal
  const [movingPackageId, setMovingPackageId] = useState<string | null>(null);

  // Target folder for new upload
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>(folders[0]?.id || 'folder_01');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current active folder object
  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  // Filter packages based on folder, search query, and status
  const filteredPackages = softwarePackages.filter((pkg) => {
    if (selectedFolderId !== 'all' && pkg.folderId !== selectedFolderId) return false;

    if (statusFilter === 'clean') {
      const leaks = pkg.scanResult?.securityAudit.leakedSecrets.length || 0;
      if (leaks > 0) return false;
    } else if (statusFilter === 'flagged') {
      const leaks = pkg.scanResult?.securityAudit.leakedSecrets.length || 0;
      if (leaks === 0) return false;
    } else if (statusFilter === 'assigned') {
      if (!pkg.isAssignedToLLC) return false;
    } else if (statusFilter === 'unassigned') {
      if (pkg.isAssignedToLLC) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (pkg.scanResult?.appName || pkg.fileName).toLowerCase().includes(q);
      const matchFile = pkg.fileName.toLowerCase().includes(q);
      const matchDesc = (pkg.scanResult?.description || '').toLowerCase().includes(q);
      const matchFw = (pkg.scanResult?.frameworks || []).some((f) => f.toLowerCase().includes(q));
      if (!matchName && !matchFile && !matchDesc && !matchFw) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalLOC = filteredPackages.reduce((acc, p) => acc + (p.scanResult?.totalLOC || 0), 0);
  const totalSizeKB = filteredPackages.reduce((acc, p) => acc + p.fileSize, 0) / 1024;
  const packagesWithAlerts = filteredPackages.filter(
    (p) => p.scanResult?.securityAudit.leakedSecrets && p.scanResult.securityAudit.leakedSecrets.length > 0
  ).length;
  const assignedCount = filteredPackages.filter((p) => p.isAssignedToLLC).length;

  // Handler: Handle real zip file upload
  const handleFileUpload = async (files: FileList | null, overrideFolderId?: string) => {
    if (!files || files.length === 0) return;

    const targetFolder = overrideFolderId || uploadTargetFolderId || folders[0]?.id || 'folder_01';
    setIsScanning(true);
    const newPackages: UploadedSoftwarePackage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.toLowerCase().endsWith('.zip')) {
        alert(`File "${file.name}" is not a .zip archive. Please upload software .zip files.`);
        continue;
      }

      setScanProgressText(`Unpacking and scanning ${file.name} (${i + 1}/${files.length})...`);

      try {
        const { scanResult, sha256Hash, base64Data } = await scanSoftwareZip(file);

        const newPkg: UploadedSoftwarePackage = {
          id: `pkg_${Date.now()}_${i}`,
          folderId: targetFolder,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          sha256Hash,
          scanStatus: 'completed',
          scanResult,
          isAssignedToLLC: false,
          rawZipBase64: base64Data,
        };

        newPackages.push(newPkg);

        onAddAuditLog({
          id: `aud_${Date.now()}_${i}`,
          company_id: company.id,
          timestamp: new Date().toISOString(),
          action: 'software.scanned',
          actor: 'Alex Mercer',
          details: `Uploaded & audited software package "${file.name}" to folder "${folders.find(f => f.id === targetFolder)?.name || 'Default'}" (${(file.size / 1024).toFixed(1)} KB, ${scanResult.totalLOC.toLocaleString()} LOC).`,
          sha256_hash: sha256Hash,
        });
      } catch (err: any) {
        console.error('Scan error:', err);
        alert(`Failed to scan ${file.name}: ${err.message}`);
      }
    }

    if (newPackages.length > 0) {
      onUpdateSoftwarePackages([...newPackages, ...softwarePackages]);
      confetti({ particleCount: 70, spread: 70 });
    }

    setIsScanning(false);
    setScanProgressText('');
  };

  // Handler: Test Demo Zip
  const handleTryDemoZip = async () => {
    setIsScanning(true);
    setScanProgressText('Synthesizing and auditing demo AI Studio software package (prompt-eval-copilot.zip)...');

    try {
      const demoBlob = await createDemoSoftwareZip();
      const { scanResult, sha256Hash, base64Data } = await scanSoftwareZip(demoBlob);

      const targetFolder = selectedFolderId !== 'all' ? selectedFolderId : (uploadTargetFolderId || folders[0]?.id || 'folder_01');

      const demoPkg: UploadedSoftwarePackage = {
        id: `pkg_demo_${Date.now()}`,
        folderId: targetFolder,
        fileName: 'prompt-eval-copilot.zip',
        fileSize: demoBlob.size,
        uploadedAt: new Date().toISOString(),
        sha256Hash,
        scanStatus: 'completed',
        scanResult,
        isAssignedToLLC: false,
        rawZipBase64: base64Data,
      };

      onUpdateSoftwarePackages([demoPkg, ...softwarePackages]);

      onAddAuditLog({
        id: `aud_${Date.now()}`,
        company_id: company.id,
        timestamp: new Date().toISOString(),
        action: 'software.demo_scanned',
        actor: 'Alex Mercer',
        details: `Loaded & analyzed demo software package "prompt-eval-copilot.zip" (React 19 + Gemini + Stripe).`,
        sha256_hash: sha256Hash,
      });

      confetti({ particleCount: 70, spread: 70 });
    } catch (err: any) {
      alert(`Demo creation failed: ${err.message}`);
    } finally {
      setIsScanning(false);
      setScanProgressText('');
    }
  };

  // Handler: Drag and drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    setDragTargetFolderId(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleFileUpload(files, folderId);
    }
  };

  // Handler: Batch Download Selected Packages
  const handleBatchDownload = async (customPackages?: UploadedSoftwarePackage[], customName?: string) => {
    const packagesToDownload = customPackages || softwarePackages.filter((p) => selectedPackageIds.includes(p.id));
    if (packagesToDownload.length === 0) {
      alert('Please select at least one software package to download.');
      return;
    }

    try {
      const folderObj = folders.find((f) => f.id === selectedFolderId);
      const batchName = customName || (folderObj ? folderObj.name.toLowerCase().replace(/\s+/g, '_') : 'software_portfolio_batch');

      await downloadSoftwareBatchZip(packagesToDownload, company, batchName);

      onAddAuditLog({
        id: `aud_${Date.now()}`,
        company_id: company.id,
        timestamp: new Date().toISOString(),
        action: 'software.batch_download',
        actor: 'Alex Mercer',
        details: `Generated batch archive containing ${packagesToDownload.length} software packages with full code audit reports.`,
      });
      confetti({ particleCount: 80, spread: 80 });
    } catch (err: any) {
      alert(`Batch download failed: ${err.message}`);
    }
  };

  // Handler: Download individual package zip
  const handleDownloadSingle = async (pkg: UploadedSoftwarePackage) => {
    try {
      await downloadSinglePackageZip(pkg, company.legal_name);
    } catch (err: any) {
      alert(`Failed to download package: ${err.message}`);
    }
  };

  // Handler: Download individual markdown audit
  const handleDownloadReport = (pkg: UploadedSoftwarePackage) => {
    downloadAuditMarkdownReport(pkg, company);
  };

  // Handler: Create new folder
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;

    const newFolder: SoftwareFolder = {
      id: `folder_${Date.now()}`,
      name: newFolderName.trim(),
      description: newFolderDesc.trim() || 'Software repository folder for code archives.',
      created_at: new Date().toISOString(),
    };

    onUpdateFolders([...folders, newFolder]);
    setSelectedFolderId(newFolder.id);
    setUploadTargetFolderId(newFolder.id);
    setNewFolderName('');
    setNewFolderDesc('');
    setIsNewFolderOpen(false);

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'software.folder_created',
      actor: 'Alex Mercer',
      details: `Created new software repository folder "${newFolder.name}".`,
    });
  };

  // Handler: Move package to folder
  const handleMovePackage = (pkgId: string, newFolderId: string) => {
    const updated = softwarePackages.map((p) => (p.id === pkgId ? { ...p, folderId: newFolderId } : p));
    onUpdateSoftwarePackages(updated);
    setMovingPackageId(null);
  };

  // Handler: Delete package
  const handleDeletePackage = (pkgId: string, pkgName: string) => {
    if (confirm(`Remove software archive "${pkgName}" from vault?`)) {
      onUpdateSoftwarePackages(softwarePackages.filter((p) => p.id !== pkgId));
      setSelectedPackageIds(selectedPackageIds.filter((id) => id !== pkgId));
    }
  };

  // Handler: Batch assign to LLC
  const handleBatchAssignToLLC = () => {
    if (selectedPackageIds.length === 0) {
      alert('Please select at least one software package.');
      return;
    }

    const updated = softwarePackages.map((p) => {
      if (selectedPackageIds.includes(p.id)) {
        return { ...p, isAssignedToLLC: true };
      }
      return p;
    });

    onUpdateSoftwarePackages(updated);

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'software.batch_assigned',
      actor: 'Alex Mercer',
      details: `Formally marked ${selectedPackageIds.length} uploaded software packages as transferred to ${company.legal_name}.`,
    });

    confetti({ particleCount: 60, spread: 60 });
  };

  // Handler: Single assign to LLC
  const handleAssignSingleToLLC = (pkgId: string) => {
    const updated = softwarePackages.map((p) => (p.id === pkgId ? { ...p, isAssignedToLLC: true } : p));
    onUpdateSoftwarePackages(updated);

    if (inspectingPackage && inspectingPackage.id === pkgId) {
      setInspectingPackage({ ...inspectingPackage, isAssignedToLLC: true });
    }

    onAddAuditLog({
      id: `aud_${Date.now()}`,
      company_id: company.id,
      timestamp: new Date().toISOString(),
      action: 'software.assigned_to_llc',
      actor: 'Alex Mercer',
      details: `Transferred ownership of package title to ${company.legal_name}.`,
    });
  };

  // Handler: Link / Add to 42-App Portfolio
  const handleLinkToPortfolio = (pkg: UploadedSoftwarePackage) => {
    const existing = apps.find((a) => a.name.toLowerCase() === (pkg.scanResult?.appName || '').toLowerCase());
    if (existing) {
      alert(`App "${existing.name}" is already linked in your portfolio.`);
      return;
    }

    const newApp: AppPortfolioItem = {
      id: `app_from_zip_${Date.now()}`,
      company_id: company.id,
      name: pkg.scanResult?.appName || pkg.fileName.replace(/\.zip$/i, ''),
      description: pkg.scanResult?.description || 'Imported from scanned software zip archive.',
      niche: pkg.scanResult?.frameworks[0] ? `${pkg.scanResult.frameworks[0]} Application` : 'Micro-SaaS',
      problem_solved: pkg.scanResult?.description || 'Scanned codebase solution',
      monthly_users: 350,
      mrr: pkg.scanResult?.monetizationAudit.hasStripe ? 120 : 0,
      has_paywall: Boolean(pkg.scanResult?.monetizationAudit.hasStripe),
      pricing_model: pkg.scanResult?.monetizationAudit.hasStripe ? 'subscription' : 'free',
      problem_clarity: 4,
      audience_spend: 4,
      build_maturity: 4,
      competition: 3,
      score: 75,
      triage_status: pkg.scanResult?.monetizationAudit.hasStripe ? 'bundle' : 'scale',
      ip_assigned: pkg.isAssignedToLLC,
      created_date: new Date().toISOString().slice(0, 10),
    };

    onUpdateApps([newApp, ...apps]);

    // Mark package as linked
    const updated = softwarePackages.map((p) => (p.id === pkg.id ? { ...p, linkedAppId: newApp.id } : p));
    onUpdateSoftwarePackages(updated);

    alert(`Successfully registered "${newApp.name}" in your 42-App Portfolio triage board!`);
  };

  // Inspect Modal: open specific file content preview
  const handleOpenFilePreview = (f: ScannedFileMeta) => {
    setInspectActiveFile(f);
  };

  const handleCopyFileContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* 1. Header with SVG Graphics & Direct Actions */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              {/* Custom SVG Graphic: Software Package Box */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Software Archive Vault & Codebase Scanner
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload software .zip files directly into repository folders, scan code for dependencies, secrets, & IP, and batch download.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTryDemoZip}
            disabled={isScanning}
            className="px-3 py-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 rounded-md border border-indigo-500/30 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Try Demo Software Zip</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md transition-colors flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Software Zip</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files)}
            accept=".zip"
            multiple
            className="hidden"
          />
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. Drag & Drop Upload Zone with Rich SVG Graphics */}
      {/* ============================================================== */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, uploadTargetFolderId)}
        className={`relative rounded-xl border-2 border-dashed transition-all p-6 text-center ${
          isDraggingOver
            ? 'border-indigo-400 bg-indigo-950/40 ring-4 ring-indigo-500/20'
            : 'border-slate-800 hover:border-slate-700 bg-gradient-to-b from-slate-900/80 to-slate-950'
        }`}
      >
        <div className="max-w-xl mx-auto flex flex-col items-center justify-center space-y-3">
          {/* Stylized SVG Cloud Upload & Zip Graphic */}
          <div className="relative w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner group">
            <svg className="w-8 h-8 text-indigo-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 12v9" strokeLinecap="round" />
              <path d="m8 16 4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-1 text-white shadow">
              <FolderArchive className="w-3 h-3" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Drag & Drop Software .Zip Files Here to Scan
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Drop exports from Google AI Studio, Vite/Next.js projects, or GitHub repositories. Extracts AST manifests, checks dependencies, scans for leaked API keys, and evaluates IP title.
            </p>
          </div>

          {/* Folder Target Selector in Dropzone */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Target Destination:</span>
            <div className="inline-flex items-center bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1">
              <Folder className="w-3.5 h-3.5 text-indigo-400 mr-1.5 shrink-0" />
              <select
                value={uploadTargetFolderId}
                onChange={(e) => setUploadTargetFolderId(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-2"
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 ml-1"
            >
              or Browse Files
            </button>
          </div>
        </div>

        {/* Live scanning progress bar */}
        {isScanning && (
          <div className="mt-4 pt-4 border-t border-indigo-500/30 text-left">
            <div className="flex items-center justify-between text-xs font-semibold text-indigo-300 mb-2">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Scanning Software Archive...
              </span>
              <span className="font-mono text-[11px] text-indigo-400">Extracting AST & Secret Patterns</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full w-2/3 animate-pulse rounded-full" />
            </div>
            <p className="text-xs text-slate-300 font-mono mt-1.5">{scanProgressText}</p>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 3. High-Fidelity Stats Cards with SVG Radial Gauges */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Software Archives */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Packages Scanned</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {filteredPackages.length} <span className="text-xs text-slate-400 font-normal">archives</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              In {selectedFolderId === 'all' ? `${folders.length} folders` : currentFolder?.name}
            </span>
          </div>
          {/* Custom SVG Icon */}
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: Lines of Code */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Source Volume</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {totalLOC.toLocaleString()} <span className="text-xs text-slate-400 font-normal">LOC</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              {totalSizeKB.toFixed(1)} KB analyzed source code
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Code2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Security & Leak Health Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">Security & Secrets</span>
            <div className="text-2xl font-bold font-mono mt-1 flex items-center gap-2">
              <span className={packagesWithAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                {packagesWithAlerts === 0 ? 'All Clean' : `${packagesWithAlerts} Alerts`}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Scanned for tokens & unignored .env
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: LLC Title Assignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">LLC IP Assignment</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {assignedCount}/{filteredPackages.length}
            </div>
            <span className="text-[11px] text-emerald-400 mt-0.5 block">
              {assignedCount === filteredPackages.length && filteredPackages.length > 0
                ? '100% Chain of Title'
                : 'Assignments Pending'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. Two-Column Workspace: Folder Tree & Package Matrix */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Repository Folders Manager (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <FolderArchive className="w-3.5 h-3.5 text-indigo-400" />
              <span>Folders</span>
            </span>
            <button
              onClick={() => setIsNewFolderOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>New Folder</span>
            </button>
          </div>

          {/* Folder Buttons List with Drop Targets */}
          <div className="space-y-1.5">
            <button
              onClick={() => setSelectedFolderId('all')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                selectedFolderId === 'all'
                  ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <FolderArchive className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">All Software Packages</span>
              </div>
              <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                {softwarePackages.length}
              </span>
            </button>

            {folders.map((folder) => {
              const count = softwarePackages.filter((p) => p.folderId === folder.id).length;
              const isSelected = selectedFolderId === folder.id;
              const isDragTarget = dragTargetFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragTargetFolderId(folder.id);
                  }}
                  onDragLeave={() => setDragTargetFolderId(null)}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={`group relative rounded-lg border transition-all ${
                    isDragTarget
                      ? 'border-indigo-400 bg-indigo-950/60 ring-2 ring-indigo-500/40'
                      : isSelected
                      ? 'border-indigo-500/30 bg-indigo-600/15 text-indigo-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedFolderId(folder.id);
                      setUploadTargetFolderId(folder.id);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                      <div className="truncate">
                        <span className="truncate block font-semibold">{folder.name}</span>
                        {folder.description && (
                          <span className="text-[10px] text-slate-400 truncate block">
                            {folder.description}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-400 ml-2">
                      {count}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Folder Quick Actions */}
          {selectedFolderId !== 'all' && currentFolder && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-[11px] text-slate-400 uppercase font-mono font-medium block">
                Folder Actions ({currentFolder.name})
              </span>
              <button
                onClick={() => {
                  const pkgs = softwarePackages.filter((p) => p.folderId === currentFolder.id);
                  handleBatchDownload(pkgs, currentFolder.name.toLowerCase().replace(/\s+/g, '_'));
                }}
                disabled={softwarePackages.filter((p) => p.folderId === currentFolder.id).length === 0}
                className="w-full px-2.5 py-1.5 text-xs text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 rounded border border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Entire Folder (.zip)</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Software Packages Matrix & Batch Downloader Toolbar (9 cols) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Batch Actions & Filter Toolbar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Select All Checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedPackageIds.length === filteredPackages.length && filteredPackages.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPackageIds(filteredPackages.map((p) => p.id));
                    } else {
                      setSelectedPackageIds([]);
                    }
                  }}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-medium">
                  {selectedPackageIds.length > 0 ? `${selectedPackageIds.length} Selected` : 'Select All'}
                </span>
              </label>

              {/* Batch Action Buttons */}
              {selectedPackageIds.length > 0 && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                  <button
                    onClick={() => handleBatchDownload()}
                    className="px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Batch Download ({selectedPackageIds.length})</span>
                  </button>

                  <button
                    onClick={handleBatchAssignToLLC}
                    className="px-3 py-1 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Assign to LLC</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter Pills and Search */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="clean">Security Clean</option>
                <option value="flagged">Security Flagged</option>
                <option value="assigned">Assigned to LLC</option>
                <option value="unassigned">Unassigned Title</option>
              </select>

              {/* Search filter */}
              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search code or tech..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredPackages.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
              {/* Empty state SVG illustration */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
                <FolderArchive className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">No Software Packages Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  No zip archives match the current folder or filter criteria. Upload code zip archives or load the demo package.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={handleTryDemoZip}
                  className="px-4 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-md font-medium cursor-pointer shadow-sm"
                >
                  Load Demo Package
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-md border border-slate-700 cursor-pointer"
                >
                  Upload Local .Zip
                </button>
              </div>
            </div>
          ) : (
            /* Packages List Cards */
            <div className="space-y-3">
              {filteredPackages.map((pkg) => {
                const isSelected = selectedPackageIds.includes(pkg.id);
                const folder = folders.find((f) => f.id === pkg.folderId);
                const hasSecrets = (pkg.scanResult?.securityAudit.leakedSecrets || []).length > 0;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                      isSelected
                        ? 'border-indigo-500/60 ring-1 ring-indigo-500/30 bg-slate-900/90'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left: Checkbox & Name & Metadata */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPackageIds([...selectedPackageIds, pkg.id]);
                            } else {
                              setSelectedPackageIds(selectedPackageIds.filter((id) => id !== pkg.id));
                            }
                          }}
                          className="mt-1 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-0 cursor-pointer"
                        />

                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-white text-sm">
                              {pkg.scanResult?.appName || pkg.fileName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              v{pkg.scanResult?.version || '1.0.0'}
                            </span>
                            <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30">
                              📁 {folder?.name || 'Folder'}
                            </span>
                            {pkg.isAssignedToLLC ? (
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Assigned to LLC</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleAssignSingleToLLC(pkg.id)}
                                className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 font-medium transition-colors cursor-pointer"
                                title="Click to assign title to LLC"
                              >
                                Pending Assignment
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-slate-300 line-clamp-2">
                            {pkg.scanResult?.description || 'Codebase archive ready for analysis and due diligence.'}
                          </p>

                          {/* Tech Framework Badges & Metrics */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {(pkg.scanResult?.frameworks || []).map((fw) => (
                              <span
                                key={fw}
                                className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/30"
                              >
                                {fw}
                              </span>
                            ))}
                            {(pkg.scanResult?.dependencies.detectedServices || []).map((srv) => (
                              <span
                                key={srv}
                                className="text-[10px] font-mono text-violet-300 bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30"
                              >
                                {srv}
                              </span>
                            ))}
                            <span className="text-[10px] font-mono text-slate-400 ml-1">
                              {(pkg.fileSize / 1024).toFixed(1)} KB · {pkg.scanResult?.totalLOC.toLocaleString()} LOC · {pkg.scanResult?.totalFiles} files
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Security Status & Action Buttons */}
                      <div className="shrink-0 flex flex-col md:items-end gap-2">
                        {/* Security Flag Status */}
                        {hasSecrets ? (
                          <div className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            <span>{pkg.scanResult?.securityAudit.leakedSecrets.length} Security Alerts</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Clean Security Audit</span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {/* Move to Folder Dropdown button */}
                          <div className="relative">
                            <select
                              value={pkg.folderId}
                              onChange={(e) => handleMovePackage(pkg.id, e.target.value)}
                              className="bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] rounded px-2 py-1 focus:outline-none cursor-pointer"
                              title="Move to another folder"
                            >
                              {folders.map((f) => (
                                <option key={f.id} value={f.id}>
                                  📁 {f.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Detailed Code Inspection Analysis */}
                          <button
                            onClick={() => {
                              setInspectingPackage(pkg);
                              setInspectTab('overview');
                              setInspectActiveFile(pkg.scanResult?.filesSample[0] || null);
                            }}
                            className="px-2.5 py-1 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Analyze</span>
                          </button>

                          {/* Download Zip */}
                          <button
                            onClick={() => handleDownloadSingle(pkg)}
                            className="px-2.5 py-1 text-xs text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                            title="Download software zip archive"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Zip</span>
                          </button>

                          {/* Download Markdown Audit Report */}
                          <button
                            onClick={() => handleDownloadReport(pkg)}
                            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 transition-colors cursor-pointer"
                            title="Download Markdown Audit Report"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-300" />
                          </button>

                          {/* Link to Portfolio */}
                          {!pkg.linkedAppId && (
                            <button
                              onClick={() => handleLinkToPortfolio(pkg)}
                              className="px-2.5 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title="Add to 42-App Portfolio Triage"
                            >
                              <span>+ Portfolio</span>
                            </button>
                          )}

                          {/* Delete archive */}
                          <button
                            onClick={() => handleDeletePackage(pkg.id, pkg.scanResult?.appName || pkg.fileName)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete archive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 5. Deep Analysis Modal with Code Viewer & File Browser */}
      {/* ============================================================== */}
      {inspectingPackage && inspectingPackage.scanResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    {inspectingPackage.scanResult.appName} (v{inspectingPackage.scanResult.version})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {inspectingPackage.fileName}
                  </span>
                  {inspectingPackage.isAssignedToLLC ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                      Assigned to LLC
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAssignSingleToLLC(inspectingPackage.id)}
                      className="text-[10px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/20 font-medium cursor-pointer"
                    >
                      Assign to LLC Now
                    </button>
                  )}
                </div>
                <div className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                  SHA-256: {inspectingPackage.sha256Hash}
                </div>
              </div>

              <button
                onClick={() => setInspectingPackage(null)}
                className="text-slate-400 hover:text-white p-1 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Inspection Tabs */}
            <div className="flex items-center gap-1 px-5 border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
              {[
                { id: 'overview', label: 'Tech Stack & LOC' },
                { id: 'security', label: `Security & Secrets (${inspectingPackage.scanResult.securityAudit.leakedSecrets.length})` },
                { id: 'legal', label: 'IP & Legal Chain' },
                { id: 'monetization', label: 'Monetization Readiness' },
                { id: 'files', label: `Files & Code Viewer (${inspectingPackage.scanResult.totalFiles})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setInspectTab(tab.id as any)}
                  className={`py-3 px-3 font-medium transition-colors border-b-2 whitespace-nowrap cursor-pointer ${
                    inspectTab === tab.id
                      ? 'border-indigo-500 text-indigo-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* TAB 1: Overview & Tech Stack */}
              {inspectTab === 'overview' && (
                <div className="space-y-6">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Total Code Volume</span>
                      <div className="text-lg font-bold font-mono text-white mt-1">
                        {inspectingPackage.scanResult.totalLOC.toLocaleString()} <span className="text-xs font-normal">lines</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">File Count</span>
                      <div className="text-lg font-bold font-mono text-white mt-1">
                        {inspectingPackage.scanResult.totalFiles} <span className="text-xs font-normal">files</span>
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Security Score</span>
                      <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                        {inspectingPackage.scanResult.securityAudit.riskScore}/100
                      </div>
                    </div>
                    <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">Archive Size</span>
                      <div className="text-lg font-bold font-mono text-white mt-1">
                        {(inspectingPackage.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>

                  {/* Languages LOC Bar Breakdown */}
                  <div className="space-y-3 bg-slate-950/50 p-4 rounded-lg border border-slate-800">
                    <h4 className="font-semibold text-white">Language Breakdown by Lines of Code</h4>
                    <div className="space-y-2">
                      {inspectingPackage.scanResult.languages.map((lang) => (
                        <div key={lang.name} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 font-medium">{lang.name}</span>
                            <span className="font-mono text-slate-400">
                              {lang.percentage}% · {lang.loc.toLocaleString()} lines ({lang.fileCount} files)
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${lang.percentage}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Frameworks & External Services */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-2">
                      <h4 className="font-semibold text-white">Detected Frameworks & Tools</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectingPackage.scanResult.frameworks.map((fw) => (
                          <span key={fw} className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]">
                            {fw}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-2">
                      <h4 className="font-semibold text-white">Integrated Cloud Services & APIs</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectingPackage.scanResult.dependencies.detectedServices.length > 0 ? (
                          inspectingPackage.scanResult.dependencies.detectedServices.map((srv) => (
                            <span key={srv} className="px-2 py-0.5 rounded bg-violet-950/60 border border-violet-500/30 text-violet-300 font-mono text-[11px]">
                              {srv}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">No external cloud SDKs detected.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Security & Secrets */}
              {inspectTab === 'security' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                    <div>
                      <h4 className="font-semibold text-white">Static Security & Leak Audit</h4>
                      <p className="text-slate-400 mt-0.5">
                        Scans code files and configuration manifests for accidental API tokens, secret keys, or exposed `.env` files.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-xl font-bold text-white">
                        {inspectingPackage.scanResult.securityAudit.riskScore}/100
                      </span>
                    </div>
                  </div>

                  {inspectingPackage.scanResult.securityAudit.leakedSecrets.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-lg space-y-2">
                      <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                      <h4 className="font-semibold text-white">Zero Hardcoded Secrets Detected</h4>
                      <p className="text-slate-400 max-w-md mx-auto">
                        Archive does not contain unmasked OpenAI tokens, Stripe secret keys, private SSH keys, or unignored production `.env` credentials.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Security Invariants Flagged ({inspectingPackage.scanResult.securityAudit.leakedSecrets.length})</span>
                      </h4>
                      <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
                        {inspectingPackage.scanResult.securityAudit.leakedSecrets.map((sec, i) => (
                          <div key={i} className="p-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{sec.type}</span>
                              <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                {sec.severity}
                              </span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-400">
                              File: <span className="text-slate-200">{sec.file}</span>
                            </div>
                            <div className="font-mono text-[11px] text-slate-500">
                              Sample: {sec.sample}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: IP & Legal Chain */}
              {inspectTab === 'legal' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-white">Chain of Title & Intellectual Property Status</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Declared Package License:</span>
                        <span className="font-mono text-white font-medium">
                          {inspectingPackage.scanResult.license || 'Proprietary'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">License File Present:</span>
                        <span className="font-medium text-white">
                          {inspectingPackage.scanResult.hasLicenseFile ? 'Yes (LICENSE file present)' : 'None found'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Primary Author in Manifest:</span>
                        <span className="font-medium text-white">
                          {inspectingPackage.scanResult.author || 'Individual Founder'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">LLC Legal Assignment:</span>
                        <span className="font-medium text-emerald-400">
                          {inspectingPackage.isAssignedToLLC ? `Assigned to ${company.legal_name}` : 'Pending Formal Assignment'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-2">
                    <h4 className="font-semibold text-white">LegalStack Compliance Directives</h4>
                    <ul className="list-disc list-inside space-y-1.5 text-slate-300">
                      {inspectingPackage.scanResult.legalAudit.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* TAB 4: Monetization Readiness */}
              {inspectTab === 'monetization' && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 space-y-3">
                    <h4 className="font-semibold text-white">Paywall & Payment Gateway Detection</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Stripe Gateway:</span>
                        <span className="font-medium text-white">
                          {inspectingPackage.scanResult.monetizationAudit.hasStripe ? 'Integrated in codebase' : 'Not detected'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Paywall Maturity:</span>
                        <span className="font-medium text-indigo-400 font-mono">
                          {inspectingPackage.scanResult.monetizationAudit.maturity}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: File Explorer & Interactive Code Viewer */}
              {inspectTab === 'files' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Left: Files List (4 cols) */}
                  <div className="md:col-span-4 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/50">
                    <div className="p-2.5 bg-slate-900 border-b border-slate-800 text-[11px] font-semibold text-slate-300">
                      Files Inside Archive ({inspectingPackage.scanResult.filesSample.length})
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 font-mono text-[11px]">
                      {inspectingPackage.scanResult.filesSample.map((f, i) => {
                        const isSelectedFile = inspectActiveFile?.path === f.path;
                        return (
                          <button
                            key={i}
                            onClick={() => handleOpenFilePreview(f)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                              isSelectedFile ? 'bg-indigo-600/20 text-indigo-300 font-semibold' : 'text-slate-300 hover:bg-slate-900/60'
                            }`}
                          >
                            <span className="truncate pr-2">{f.path}</span>
                            <span className="text-slate-500 shrink-0 text-[10px]">{(f.size / 1024).toFixed(1)}k</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Code Viewer (8 cols) */}
                  <div className="md:col-span-8 border border-slate-800 rounded-lg overflow-hidden bg-slate-950 flex flex-col">
                    <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="font-mono text-slate-200 truncate">
                        {inspectActiveFile?.path || 'Select a file to inspect'}
                      </span>
                      {inspectActiveFile?.content && (
                        <button
                          onClick={() => handleCopyFileContent(inspectActiveFile.content!)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>

                    <div className="p-4 max-h-80 overflow-y-auto font-mono text-[11px] text-slate-300 bg-slate-950/80 leading-relaxed whitespace-pre-wrap">
                      {inspectActiveFile?.content ? (
                        inspectActiveFile.content
                      ) : (
                        <div className="text-slate-500 italic p-6 text-center">
                          {inspectActiveFile ? 'Binary or non-text file preview unavailable.' : 'Click any file on the left to view contents.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900">
              <span className="text-xs text-slate-400">
                Archive SHA-256 verified and fingerprinted for institutional due diligence.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadReport(inspectingPackage)}
                  className="px-3 py-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Audit Report (.md)</span>
                </button>
                <button
                  onClick={() => handleDownloadSingle(inspectingPackage)}
                  className="px-3 py-1.5 text-xs text-slate-200 hover:text-white bg-slate-800 rounded border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Zip</span>
                </button>
                <button
                  onClick={() => setInspectingPackage(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. New Folder Modal */}
      {/* ============================================================== */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-indigo-400" />
                <span>Create Software Repository Folder</span>
              </h3>
              <button onClick={() => setIsNewFolderOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Folder Name</label>
                <input
                  type="text"
                  placeholder="e.g. AI Studio Prototypes, Client Apps, V2 Candidates"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Production micro-SaaS with active Stripe webhooks"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsNewFolderOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded disabled:opacity-40 cursor-pointer"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
