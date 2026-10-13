import { AppPortfolioItem, VaultDocument, ComplianceEvent, Transaction, AuditLogEntry, ReadinessScoreResult } from '../types';

/**
 * 80/20 Portfolio Triage Scoring Algorithm
 */
export function scoreApp(app: Partial<AppPortfolioItem>): number {
  const hasPaywallScore = app.has_paywall ? 15 : 0;
  
  // Users: 0 to 20 points (caps smoothly at 2,000 monthly users)
  const usersScore = Math.min(((app.monthly_users || 0) / 2000) * 20, 20);
  
  // Problem clarity: 1-5 -> up to 20 points
  const clarityScore = (((app.problem_clarity || 3) / 5) * 20);
  
  // Audience spend: 1-5 -> up to 25 points (the biggest leverage factor)
  const spendScore = (((app.audience_spend || 3) / 5) * 25);
  
  // Build maturity: 1-5 -> up to 10 points
  const maturityScore = (((app.build_maturity || 3) / 5) * 10);
  
  // Competition (Blue Ocean): 1-5 -> up to 10 points
  const competitionScore = (((app.competition || 3) / 5) * 10);

  const raw = hasPaywallScore + usersScore + clarityScore + spendScore + maturityScore + competitionScore;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * Compute the Clean Books financial separation score
 */
export function computeCleanBooksScore(transactions: Transaction[]): { score: number; flaggedCount: number; highSeverityCount: number } {
  if (!transactions.length) return { score: 100, flaggedCount: 0, highSeverityCount: 0 };
  
  let highSeverityCount = 0;
  let mediumSeverityCount = 0;

  for (const t of transactions) {
    if (t.flag && !t.flag.resolved) {
      if (t.flag.severity === 'high') highSeverityCount++;
      else if (t.flag.severity === 'medium') mediumSeverityCount++;
    }
  }

  const flaggedCount = highSeverityCount + mediumSeverityCount;
  // Penalty: 18 pts per unresolved high flag (piercing corporate veil is fatal), 8 pts per medium flag
  const penalty = (highSeverityCount * 18) + (mediumSeverityCount * 8);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return { score, flaggedCount, highSeverityCount };
}

/**
 * Due Diligence Readiness Score Calculator (0 - 100)
 */
export function computeReadiness(data: {
  apps: AppPortfolioItem[];
  documents: VaultDocument[];
  complianceEvents: ComplianceEvent[];
  transactions: Transaction[];
  auditLog: AuditLogEntry[];
}): ReadinessScoreResult {
  const { apps, documents, complianceEvents, transactions, auditLog } = data;

  // 1. IP Coverage (40% Weight)
  const totalApps = apps.length;
  const assignedApps = apps.filter((a) => a.ip_assigned).length;
  const ipCoverage = totalApps > 0 ? Math.round((assignedApps / totalApps) * 100) : 0;

  // 2. Legal Documents (20% Weight)
  // Required: signed Operating Agreement and signed IP Assignment covering apps
  const hasSignedOA = documents.some((d) => d.type === 'operating_agreement' && d.status === 'signed');
  const hasSignedIP = documents.some((d) => d.type === 'ip_assignment' && d.status === 'signed');
  const hasResolution = documents.some((d) => (d.type === 'resolution' || d.type === 'member_consent') && d.status === 'signed');
  
  let legalDocsCount = 0;
  if (hasSignedOA) legalDocsCount += 50;
  if (hasSignedIP) legalDocsCount += 35;
  if (hasResolution) legalDocsCount += 15;
  const legalDocs = Math.min(100, legalDocsCount);

  // 3. Compliance Health (20% Weight)
  const now = new Date().getTime();
  let complianceHealth = 100;
  if (complianceEvents.length > 0) {
    const overdueEvents = complianceEvents.filter(
      (e) => !e.completed && new Date(e.due_date).getTime() < now
    );
    const penalty = overdueEvents.length * 35;
    const completedPct = (complianceEvents.filter((e) => e.completed).length / complianceEvents.length) * 40;
    complianceHealth = Math.max(0, Math.min(100, Math.round(60 + completedPct - penalty)));
  }

  // 4. Financial Separation (10% Weight)
  const { score: financialSeparation } = computeCleanBooksScore(transactions);

  // 5. Audit Trail Health (10% Weight)
  // Has company formed, doc creation, signature events with SHA-256 hashes
  const hashedEntries = auditLog.filter((a) => Boolean(a.sha256_hash)).length;
  const auditTrail = Math.min(100, Math.round((Math.min(auditLog.length, 5) / 5) * 60 + (Math.min(hashedEntries, 3) / 3) * 40));

  // Weighted rollup
  const total = Math.round(
    ipCoverage * 0.40 +
    legalDocs * 0.20 +
    complianceHealth * 0.20 +
    financialSeparation * 0.10 +
    auditTrail * 0.10
  );

  let grade: ReadinessScoreResult['grade'] = 'High Exposure Risk';
  let gradeTone: ReadinessScoreResult['gradeTone'] = 'red';

  if (total >= 90) {
    grade = 'Investment Ready';
    gradeTone = 'green';
  } else if (total >= 80) {
    grade = 'Acquisition Ready';
    gradeTone = 'green';
  } else if (total >= 60) {
    grade = 'Getting There';
    gradeTone = 'amber';
  }

  // Action reasons queue
  const reasons: ReadinessScoreResult['reasons'] = [];

  const unassignedCount = totalApps - assignedApps;
  if (unassignedCount > 0) {
    reasons.push({
      component: 'IP Coverage',
      delta: Math.round((unassignedCount / Math.max(totalApps, 1)) * 40),
      message: `${unassignedCount} app${unassignedCount === 1 ? '' : 's'} lack formal signed IP assignment to the LLC.`,
      actionTab: 'vault',
    });
  }

  if (!hasSignedOA) {
    reasons.push({
      component: 'Operating Agreement',
      delta: 10,
      message: 'Operating Agreement is unsigned or missing Article IV IP vesting clauses.',
      actionTab: 'vault',
    });
  }

  const { flaggedCount } = computeCleanBooksScore(transactions);
  if (flaggedCount > 0) {
    reasons.push({
      component: 'Financial Separation',
      delta: Math.round((100 - financialSeparation) * 0.1),
      message: `${flaggedCount} co-mingled transaction${flaggedCount === 1 ? '' : 's'} detected piercing the corporate veil.`,
      actionTab: 'finances',
    });
  }

  const overdue = complianceEvents.filter((e) => !e.completed && new Date(e.due_date).getTime() < now);
  if (overdue.length > 0) {
    reasons.push({
      component: 'Compliance',
      delta: overdue.length * 7,
      message: `${overdue.length} state filing or corporate deadline${overdue.length === 1 ? '' : 's'} overdue.`,
      actionTab: 'compliance',
    });
  }

  const freeAppsCount = apps.filter((a) => !a.has_paywall && a.monthly_users > 300).length;
  if (freeAppsCount > 0) {
    reasons.push({
      component: 'Monetization',
      delta: 5,
      message: `${freeAppsCount} apps have active users but zero payment infrastructure installed.`,
      actionTab: 'triage',
    });
  }

  return {
    total,
    grade,
    gradeTone,
    breakdown: {
      ipCoverage,
      legalDocs,
      complianceHealth,
      financialSeparation,
      auditTrail,
    },
    reasons: reasons.sort((a, b) => b.delta - a.delta),
  };
}
