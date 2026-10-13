import { Company, Member, AppPortfolioItem, VaultDocument, Transaction, ComplianceEvent, AuditLogEntry, SoftwareFolder, UploadedSoftwarePackage } from '../types';
import {
  INITIAL_COMPANY,
  INITIAL_MEMBERS,
  INITIAL_APPS,
  INITIAL_DOCUMENTS,
  INITIAL_TRANSACTIONS,
  INITIAL_COMPLIANCE_EVENTS,
  INITIAL_AUDIT_LOG,
  INITIAL_FOLDERS,
  INITIAL_SOFTWARE_PACKAGES,
} from '../data/seedData';

const STORAGE_KEYS = {
  COMPANY: 'fls_company_v1',
  MEMBERS: 'fls_members_v1',
  APPS: 'fls_apps_v1',
  DOCUMENTS: 'fls_documents_v1',
  TRANSACTIONS: 'fls_transactions_v1',
  COMPLIANCE: 'fls_compliance_v1',
  AUDIT: 'fls_audit_v1',
  FOLDERS: 'fls_folders_v1',
  SOFTWARE: 'fls_software_v1',
};

export interface AppState {
  company: Company;
  members: Member[];
  apps: AppPortfolioItem[];
  documents: VaultDocument[];
  transactions: Transaction[];
  complianceEvents: ComplianceEvent[];
  auditLog: AuditLogEntry[];
  folders: SoftwareFolder[];
  softwarePackages: UploadedSoftwarePackage[];
}

export function loadAppState(): AppState {
  try {
    const rawCompany = localStorage.getItem(STORAGE_KEYS.COMPANY);
    const rawMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const rawApps = localStorage.getItem(STORAGE_KEYS.APPS);
    const rawDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const rawTxns = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const rawComp = localStorage.getItem(STORAGE_KEYS.COMPLIANCE);
    const rawAudit = localStorage.getItem(STORAGE_KEYS.AUDIT);
    const rawFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    const rawSoftware = localStorage.getItem(STORAGE_KEYS.SOFTWARE);

    return {
      company: rawCompany ? JSON.parse(rawCompany) : INITIAL_COMPANY,
      members: rawMembers ? JSON.parse(rawMembers) : INITIAL_MEMBERS,
      apps: rawApps ? JSON.parse(rawApps) : INITIAL_APPS,
      documents: rawDocs ? JSON.parse(rawDocs) : INITIAL_DOCUMENTS,
      transactions: rawTxns ? JSON.parse(rawTxns) : INITIAL_TRANSACTIONS,
      complianceEvents: rawComp ? JSON.parse(rawComp) : INITIAL_COMPLIANCE_EVENTS,
      auditLog: rawAudit ? JSON.parse(rawAudit) : INITIAL_AUDIT_LOG,
      folders: rawFolders ? JSON.parse(rawFolders) : INITIAL_FOLDERS,
      softwarePackages: rawSoftware ? JSON.parse(rawSoftware) : INITIAL_SOFTWARE_PACKAGES,
    };
  } catch (e) {
    console.error('Failed to load state from localStorage:', e);
    return {
      company: INITIAL_COMPANY,
      members: INITIAL_MEMBERS,
      apps: INITIAL_APPS,
      documents: INITIAL_DOCUMENTS,
      transactions: INITIAL_TRANSACTIONS,
      complianceEvents: INITIAL_COMPLIANCE_EVENTS,
      auditLog: INITIAL_AUDIT_LOG,
      folders: INITIAL_FOLDERS,
      softwarePackages: INITIAL_SOFTWARE_PACKAGES,
    };
  }
}

export function saveAppState(state: Partial<AppState>): void {
  try {
    if (state.company) localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(state.company));
    if (state.members) localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(state.members));
    if (state.apps) localStorage.setItem(STORAGE_KEYS.APPS, JSON.stringify(state.apps));
    if (state.documents) localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(state.documents));
    if (state.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    if (state.complianceEvents) localStorage.setItem(STORAGE_KEYS.COMPLIANCE, JSON.stringify(state.complianceEvents));
    if (state.auditLog) localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(state.auditLog));
    if (state.folders) localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(state.folders));
    if (state.softwarePackages) localStorage.setItem(STORAGE_KEYS.SOFTWARE, JSON.stringify(state.softwarePackages));
  } catch (e) {
    console.error('Failed to save state to localStorage:', e);
  }
}

export function resetAppState(): AppState {
  localStorage.removeItem(STORAGE_KEYS.COMPANY);
  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.APPS);
  localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
  localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
  localStorage.removeItem(STORAGE_KEYS.COMPLIANCE);
  localStorage.removeItem(STORAGE_KEYS.AUDIT);
  localStorage.removeItem(STORAGE_KEYS.FOLDERS);
  localStorage.removeItem(STORAGE_KEYS.SOFTWARE);

  return {
    company: INITIAL_COMPANY,
    members: INITIAL_MEMBERS,
    apps: INITIAL_APPS,
    documents: INITIAL_DOCUMENTS,
    transactions: INITIAL_TRANSACTIONS,
    complianceEvents: INITIAL_COMPLIANCE_EVENTS,
    auditLog: INITIAL_AUDIT_LOG,
    folders: INITIAL_FOLDERS,
    softwarePackages: INITIAL_SOFTWARE_PACKAGES,
  };
}
