import React, { useState, useEffect } from 'react';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { VaultView } from './components/vault/VaultView';
import { TriageView } from './components/triage/TriageView';
import { FinancesView } from './components/finances/FinancesView';
import { ComplianceView } from './components/compliance/ComplianceView';
import { MonetizationView } from './components/monetization/MonetizationView';
import { DataRoomView } from './components/dataroom/DataRoomView';
import { SoftwareScannerView } from './components/software/SoftwareScannerView';
import {
  loadAppState,
  saveAppState,
  resetAppState,
  AppState,
} from './lib/storage';
import { computeReadiness, computeCleanBooksScore } from './lib/scoring';
import { AuditLogEntry, AppPortfolioItem, VaultDocument, Transaction, ComplianceEvent, SoftwareFolder, UploadedSoftwarePackage } from './types';

export default function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [vaultInitialMode, setVaultInitialMode] = useState<'table' | 'ip_gen' | 'oa_gen'>('table');
  const [monetizationTargetAppId, setMonetizationTargetAppId] = useState<string | undefined>(undefined);

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  // Compute dynamic Due Diligence Readiness Score
  const readiness = computeReadiness({
    apps: state.apps,
    documents: state.documents,
    complianceEvents: state.complianceEvents,
    transactions: state.transactions,
    auditLog: state.auditLog,
  });

  const { flaggedCount } = computeCleanBooksScore(state.transactions);
  const unassignedAppsCount = state.apps.filter((a) => !a.ip_assigned).length;

  // Handlers for state updates
  const handleUpdateApps = (updatedApps: AppPortfolioItem[]) => {
    setState((prev) => ({ ...prev, apps: updatedApps }));
  };

  const handleUpdateDocuments = (updatedDocs: VaultDocument[]) => {
    setState((prev) => ({ ...prev, documents: updatedDocs }));
  };

  const handleUpdateTransactions = (updatedTxns: Transaction[]) => {
    setState((prev) => ({ ...prev, transactions: updatedTxns }));
  };

  const handleUpdateComplianceEvents = (updatedEvents: ComplianceEvent[]) => {
    setState((prev) => ({ ...prev, complianceEvents: updatedEvents }));
  };

  const handleUpdateFolders = (updatedFolders: SoftwareFolder[]) => {
    setState((prev) => ({ ...prev, folders: updatedFolders }));
  };

  const handleUpdateSoftwarePackages = (updatedPackages: UploadedSoftwarePackage[]) => {
    setState((prev) => ({ ...prev, softwarePackages: updatedPackages }));
  };

  const handleAddAuditLog = (entry: AuditLogEntry) => {
    setState((prev) => ({ ...prev, auditLog: [entry, ...prev.auditLog] }));
  };

  const handleResetData = () => {
    if (confirm('Reset application data back to initial 42-app state?')) {
      const fresh = resetAppState();
      setState(fresh);
      setActiveTab('dashboard');
    }
  };

  const handleOpenIpAssignment = () => {
    setVaultInitialMode('ip_gen');
    setActiveTab('vault');
  };

  const handleOpenOperatingAgreement = () => {
    setVaultInitialMode('oa_gen');
    setActiveTab('vault');
  };

  const handleNavigateToMonetization = (appId?: string) => {
    setMonetizationTargetAppId(appId);
    setActiveTab('monetization');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Bar Contract (Wordmark, Nav links, Action) */}
      <Header
        company={state.company}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onExportDataRoom={() => setActiveTab('dataroom')}
        onResetData={handleResetData}
        readinessScore={readiness.total}
      />

      {/* Main Workspace: Sidebar + Viewport */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'vault') setVaultInitialMode('table');
            setActiveTab(tab);
          }}
          company={state.company}
          unreadFlags={flaggedCount}
          unassignedApps={unassignedAppsCount}
          readinessScore={readiness.total}
          packageCount={state.softwarePackages.length}
        />

        {/* Viewport Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                company={state.company}
                readiness={readiness}
                apps={state.apps}
                documents={state.documents}
                transactions={state.transactions}
                complianceEvents={state.complianceEvents}
                auditLog={state.auditLog}
                setActiveTab={setActiveTab}
                onOpenIpAssignment={handleOpenIpAssignment}
                onOpenOperatingAgreement={handleOpenOperatingAgreement}
              />
            )}

            {activeTab === 'vault' && (
              <VaultView
                company={state.company}
                members={state.members}
                apps={state.apps}
                documents={state.documents}
                onUpdateDocuments={handleUpdateDocuments}
                onUpdateApps={handleUpdateApps}
                onAddAuditLog={handleAddAuditLog}
                initialMode={vaultInitialMode}
              />
            )}

            {activeTab === 'software' && (
              <SoftwareScannerView
                company={state.company}
                folders={state.folders}
                softwarePackages={state.softwarePackages}
                apps={state.apps}
                onUpdateFolders={handleUpdateFolders}
                onUpdateSoftwarePackages={handleUpdateSoftwarePackages}
                onUpdateApps={handleUpdateApps}
                onAddAuditLog={handleAddAuditLog}
                onAddDocument={handleUpdateDocuments ? (d) => handleUpdateDocuments([d, ...state.documents]) : () => {}}
              />
            )}

            {activeTab === 'triage' && (
              <TriageView
                apps={state.apps}
                onUpdateApps={handleUpdateApps}
                onNavigateToMonetization={handleNavigateToMonetization}
                onNavigateToVault={() => {
                  setVaultInitialMode('ip_gen');
                  setActiveTab('vault');
                }}
              />
            )}

            {activeTab === 'finances' && (
              <FinancesView
                company={state.company}
                transactions={state.transactions}
                onUpdateTransactions={handleUpdateTransactions}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'compliance' && (
              <ComplianceView
                company={state.company}
                complianceEvents={state.complianceEvents}
                onUpdateComplianceEvents={handleUpdateComplianceEvents}
                onAddAuditLog={handleAddAuditLog}
              />
            )}

            {activeTab === 'monetization' && (
              <MonetizationView
                company={state.company}
                apps={state.apps}
                selectedAppId={monetizationTargetAppId}
              />
            )}

            {activeTab === 'dataroom' && (
              <DataRoomView
                company={state.company}
                members={state.members}
                apps={state.apps}
                documents={state.documents}
                transactions={state.transactions}
                complianceEvents={state.complianceEvents}
                readinessScore={readiness.total}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
