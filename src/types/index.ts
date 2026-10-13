/**
 * LegalStack Architect / Founder Legal Stack (FLS)
 * Core Domain Types
 */

export type EntityType = 'LLC' | 'C-Corp' | 'S-Corp' | 'Sole Prop';

export interface Company {
  id: string;
  legal_name: string;
  dba_name?: string;
  entity_type: EntityType;
  state: string;
  ein: string;
  formed_date: string;
  registered_agent: string;
  principal_address: string;
  fiscal_year_end: string;
}

export interface Member {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  ownership_pct: number;
  role: string;
  is_self: boolean;
}

export type TriageCategory = 'champion' | 'bundle' | 'scale' | 'shelve' | 'kill';

export interface AppPortfolioItem {
  id: string;
  company_id: string;
  name: string;
  description: string;
  niche: string;
  problem_solved: string;
  monthly_users: number;
  mrr: number;
  has_paywall: boolean;
  pricing_model: 'free' | 'freemium' | 'subscription' | 'one-time' | 'usage';
  problem_clarity: number; // 1 - 5
  audience_spend: number;  // 1 - 5 ("does this niche pay?")
  build_maturity: number;  // 1 - 5 ("how production-ready is it?")
  competition: number;     // 1 - 5 (5 = blue ocean, 1 = saturated)
  score: number;           // 0 - 100 calculated
  triage_status: TriageCategory;
  ip_assigned: boolean;
  assigned_doc_id?: string;
  created_date: string;
  repo_url?: string;
  ai_studio_url?: string;
}

export type DocumentType =
  | 'ip_assignment'
  | 'operating_agreement'
  | 'oa_amendment'
  | 'member_consent'
  | 'nda'
  | 'resolution'
  | 'clean_books_cert'
  | 'due_diligence_pack';

export type DocumentStatus =
  | 'draft'
  | 'generated'
  | 'sent_for_sig'
  | 'signed'
  | 'filed'
  | 'superseded';

export interface VaultDocument {
  id: string;
  company_id: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  version: number;
  generated_at: string;
  signed_date?: string;
  sha256_hash: string;
  file_url?: string;
  assigned_apps?: string[]; // IDs of assigned apps
  signatory_name?: string;
  signatory_role?: string;
  content_preview?: string;
  notes?: string;
}

export type AccountType = 'business' | 'personal';

export interface Transaction {
  id: string;
  company_id: string;
  account_type: AccountType;
  account_name: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  is_deductible: boolean;
  tax_category?: string; // IRS Schedule C category
  flag?: {
    severity: 'high' | 'medium' | 'low';
    reason: string;
    resolved: boolean;
  };
}

export interface ComplianceEvent {
  id: string;
  company_id: string;
  type: 'state_filing' | 'tax_payment' | 'internal_governance' | 'custom';
  title: string;
  description: string;
  due_date: string;
  recurrence?: 'annual' | 'quarterly' | 'biennial' | 'one-time';
  completed: boolean;
  completed_date?: string;
  filing_url?: string;
  estimated_cost?: number;
  penalty_warning?: string;
}

export interface AuditLogEntry {
  id: string;
  company_id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  sha256_hash?: string;
}

export interface ReadinessScoreResult {
  total: number;
  grade: 'Investment Ready' | 'Acquisition Ready' | 'Getting There' | 'High Exposure Risk';
  gradeTone: 'green' | 'amber' | 'red';
  breakdown: {
    ipCoverage: number;       // 40%
    legalDocs: number;        // 20%
    complianceHealth: number; // 20%
    financialSeparation: number; // 10%
    auditTrail: number;       // 10%
  };
  reasons: {
    component: string;
    delta: number;
    message: string;
    actionTab: string;
  }[];
}

// -------------------------------------------------------------
// Software Vault, Zip Extraction & Analysis Scanner Types
// -------------------------------------------------------------

export interface SoftwareFolder {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface ScannedFileMeta {
  path: string;
  name: string;
  size: number;
  extension: string;
  linesOfCode?: number;
  content?: string;
}

export interface SoftwareScanResult {
  appName: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  hasLicenseFile: boolean;
  frameworks: string[];
  languages: { name: string; percentage: number; fileCount: number; loc: number }[];
  totalFiles: number;
  totalLOC: number;
  totalSize: number;
  dependencies: {
    production: string[];
    development: string[];
    detectedServices: string[];
  };
  securityAudit: {
    leakedSecrets: { file: string; type: string; sample: string; severity: 'high' | 'critical' | 'medium' }[];
    hasEnvFile: boolean;
    riskScore: number; // 0 to 100, 100 = clean
  };
  legalAudit: {
    licenseCompliance: string;
    ipOwnershipReady: boolean;
    recommendations: string[];
  };
  monetizationAudit: {
    hasStripe: boolean;
    hasPaywallCode: boolean;
    maturity: 'No Paywall Found' | 'Stripe SDK Detected' | 'Complete Webhook & Checkout';
  };
  filesSample: ScannedFileMeta[];
}

export interface UploadedSoftwarePackage {
  id: string;
  folderId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  sha256Hash: string;
  scanStatus: 'scanning' | 'completed' | 'failed';
  scanResult?: SoftwareScanResult;
  isAssignedToLLC: boolean;
  linkedAppId?: string;
  rawZipBase64?: string;
}
