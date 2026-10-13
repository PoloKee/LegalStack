import JSZip from 'jszip';
import { UploadedSoftwarePackage, Company } from '../types';

/**
 * Packages multiple uploaded software packages, their original .zip codebases,
 * and comprehensive due diligence analysis reports into a single batch archive.
 */
export async function downloadSoftwareBatchZip(
  packages: UploadedSoftwarePackage[],
  company: Company,
  batchName = 'software_portfolio_bundle'
): Promise<void> {
  const masterZip = new JSZip();

  // 1. Create a folder for codebases inside the zip
  const codebasesFolder = masterZip.folder('software_archives');
  const reportsFolder = masterZip.folder('code_audit_reports');

  // Summary statistics for master manifest
  let totalLOC = 0;
  let totalFiles = 0;
  const frameworkSet = new Set<string>();

  for (const pkg of packages) {
    const safeName = (pkg.scanResult?.appName || pkg.fileName.replace(/\.zip$/i, '')).replace(/[^a-zA-Z0-9_-]/g, '_');

    // Add original zip if base64 exists, or synthesize complete archive from scan
    if (codebasesFolder) {
      if (pkg.rawZipBase64) {
        codebasesFolder.file(`${safeName}.zip`, pkg.rawZipBase64, { base64: true });
      } else if (pkg.scanResult) {
        const subZip = new JSZip();
        if (pkg.scanResult.filesSample && pkg.scanResult.filesSample.length > 0) {
          for (const f of pkg.scanResult.filesSample) {
            subZip.file(f.path, f.content || `// ${f.name}\n// Lines of code: ${f.linesOfCode || 20}\n// Scanned for ${company.legal_name}`);
          }
        } else {
          subZip.file('README.md', `# ${pkg.scanResult.appName}\n${pkg.scanResult.description}\n\nEntity: ${company.legal_name}\n`);
          subZip.file('package.json', JSON.stringify({ name: pkg.scanResult.appName, version: pkg.scanResult.version, license: pkg.scanResult.license }, null, 2));
        }
        const subZipB64 = await subZip.generateAsync({ type: 'base64' });
        codebasesFolder.file(`${safeName}.zip`, subZipB64, { base64: true });
      }
    }

    if (pkg.scanResult) {
      totalLOC += pkg.scanResult.totalLOC;
      totalFiles += pkg.scanResult.totalFiles;
      pkg.scanResult.frameworks.forEach((f) => frameworkSet.add(f));

      // Generate individual markdown audit report
      const reportMd = `# CODE AUDIT & IP DISCLOSURE REPORT
PROJECT: ${pkg.scanResult.appName} (v${pkg.scanResult.version})
ENTITY: ${company.legal_name}
ORIGINAL FILE: ${pkg.fileName} (${(pkg.fileSize / 1024).toFixed(1)} KB)
SHA-256 HASH: ${pkg.sha256Hash}
SCANNED AT: ${pkg.uploadedAt}

## 1. ARCHITECTURE & TECH STACK
- Frameworks: ${pkg.scanResult.frameworks.join(', ') || 'Vanilla / Library'}
- Total Files: ${pkg.scanResult.totalFiles}
- Total Lines of Code (LOC): ${pkg.scanResult.totalLOC.toLocaleString()}
- Detected External Services: ${pkg.scanResult.dependencies.detectedServices.join(', ') || 'None'}

### Language Breakdown:
${pkg.scanResult.languages.map((l) => `- ${l.name}: ${l.percentage}% (${l.loc.toLocaleString()} lines across ${l.fileCount} files)`).join('\n')}

## 2. SECURITY & SECRETS AUDIT
- Security Health Score: ${pkg.scanResult.securityAudit.riskScore}/100
- Active .env Files Included: ${pkg.scanResult.securityAudit.hasEnvFile ? 'YES (Warning)' : 'No'}
- Leaked Secrets Found: ${pkg.scanResult.securityAudit.leakedSecrets.length}

${pkg.scanResult.securityAudit.leakedSecrets.length > 0 ? pkg.scanResult.securityAudit.leakedSecrets.map((s, i) => `${i + 1}. [${s.severity.toUpperCase()}] ${s.type} in \`${s.file}\` (${s.sample})`).join('\n') : 'No hardcoded credentials detected.'}

## 3. INTELLECTUAL PROPERTY & LEGAL CHAIN OF TITLE
- Declared License: ${pkg.scanResult.license || 'Proprietary'}
- License File Present: ${pkg.scanResult.hasLicenseFile ? 'Yes' : 'No'}
- LLC IP Assignment Status: ${pkg.isAssignedToLLC ? 'ASSIGNED TO LLC' : 'PENDING ASSIGNMENT'}
- Primary Author: ${pkg.scanResult.author || 'Individual Founder'}

### Legal Recommendations:
${pkg.scanResult.legalAudit.recommendations.map((r) => `* ${r}`).join('\n')}

## 4. MONETIZATION READINESS
- Payment Gateway (Stripe): ${pkg.scanResult.monetizationAudit.hasStripe ? 'Detected' : 'Not Integrated'}
- Paywall Status: ${pkg.scanResult.monetizationAudit.maturity}
`;
      if (reportsFolder) {
        reportsFolder.file(`AUDIT_${safeName}.md`, reportMd);
      }
    }
  }

  // Master Executive Summary
  const masterSummary = `# DUE DILIGENCE SOFTWARE BATCH AUDIT
COMPANY: ${company.legal_name} (${company.state} ${company.entity_type})
BATCH ARCHIVE: ${batchName}
GENERATED: ${new Date().toISOString()}

================================================================================
EXECUTIVE SUMMARY
================================================================================
Total Software Packages Bundled: ${packages.length}
Total Analyzed Lines of Code (LOC): ${totalLOC.toLocaleString()}
Total Files Audited: ${totalFiles.toLocaleString()}
Primary Framework Ecosystem: ${Array.from(frameworkSet).join(', ') || 'Mixed'}

PACKAGES INCLUDED IN THIS ARCHIVE:
${packages.map((p, i) => `${i + 1}. ${p.scanResult?.appName || p.fileName}
   - Size: ${(p.fileSize / 1024).toFixed(1)} KB | LOC: ${p.scanResult?.totalLOC.toLocaleString() || 'N/A'}
   - SHA-256: ${p.sha256Hash}
   - LLC Assignment: ${p.isAssignedToLLC ? 'CONFIRMED' : 'PENDING'}`).join('\n\n')}

All included packages have been inspected and cryptographically fingerprinted for institutional due diligence.
`;

  masterZip.file('DUE_DILIGENCE_BATCH_SUMMARY.md', masterSummary);

  // Manifest JSON
  const manifest = {
    company: company.legal_name,
    ein: company.ein,
    exported_at: new Date().toISOString(),
    packages_count: packages.length,
    packages: packages.map((p) => ({
      id: p.id,
      name: p.scanResult?.appName || p.fileName,
      sha256: p.sha256Hash,
      loc: p.scanResult?.totalLOC,
      frameworks: p.scanResult?.frameworks,
      securityScore: p.scanResult?.securityAudit.riskScore,
    })),
  };
  masterZip.file('manifest.json', JSON.stringify(manifest, null, 2));

  // Generate and trigger download
  const blob = await masterZip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${batchName}_${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a single software package zip file safely
 */
export async function downloadSinglePackageZip(pkg: UploadedSoftwarePackage, companyLegalName = 'Hyperstack Software LLC'): Promise<void> {
  let blob: Blob;

  if (pkg.rawZipBase64) {
    const byteCharacters = atob(pkg.rawZipBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    blob = new Blob([byteArray], { type: 'application/zip' });
  } else {
    // Reconstruct zip from scan results
    const zip = new JSZip();
    if (pkg.scanResult?.filesSample && pkg.scanResult.filesSample.length > 0) {
      for (const f of pkg.scanResult.filesSample) {
        zip.file(f.path, f.content || `// ${f.name}\n// Scanned for ${companyLegalName}`);
      }
    } else {
      zip.file('README.md', `# ${pkg.scanResult?.appName || pkg.fileName}\n${pkg.scanResult?.description || ''}\n`);
      zip.file('package.json', JSON.stringify({ name: pkg.scanResult?.appName || pkg.fileName, version: pkg.scanResult?.version || '1.0.0' }, null, 2));
    }
    blob = await zip.generateAsync({ type: 'blob' });
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = pkg.fileName.endsWith('.zip') ? pkg.fileName : `${pkg.fileName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Downloads individual markdown audit report
 */
export function downloadAuditMarkdownReport(pkg: UploadedSoftwarePackage, company: Company): void {
  if (!pkg.scanResult) return;
  const safeName = (pkg.scanResult.appName || pkg.fileName.replace(/\.zip$/i, '')).replace(/[^a-zA-Z0-9_-]/g, '_');

  const reportMd = `# CODE AUDIT & IP DISCLOSURE REPORT
PROJECT: ${pkg.scanResult.appName} (v${pkg.scanResult.version})
ENTITY: ${company.legal_name}
ORIGINAL FILE: ${pkg.fileName} (${(pkg.fileSize / 1024).toFixed(1)} KB)
SHA-256 HASH: ${pkg.sha256Hash}
SCANNED AT: ${pkg.uploadedAt}

## 1. ARCHITECTURE & TECH STACK
- Frameworks: ${pkg.scanResult.frameworks.join(', ') || 'Vanilla / Library'}
- Total Files: ${pkg.scanResult.totalFiles}
- Total Lines of Code (LOC): ${pkg.scanResult.totalLOC.toLocaleString()}
- Detected External Services: ${pkg.scanResult.dependencies.detectedServices.join(', ') || 'None'}

### Language Breakdown:
${pkg.scanResult.languages.map((l) => `- ${l.name}: ${l.percentage}% (${l.loc.toLocaleString()} lines across ${l.fileCount} files)`).join('\n')}

## 2. SECURITY & SECRETS AUDIT
- Security Health Score: ${pkg.scanResult.securityAudit.riskScore}/100
- Active .env Files Included: ${pkg.scanResult.securityAudit.hasEnvFile ? 'YES (Warning)' : 'No'}
- Leaked Secrets Found: ${pkg.scanResult.securityAudit.leakedSecrets.length}

${pkg.scanResult.securityAudit.leakedSecrets.length > 0 ? pkg.scanResult.securityAudit.leakedSecrets.map((s, i) => `${i + 1}. [${s.severity.toUpperCase()}] ${s.type} in \`${s.file}\` (${s.sample})`).join('\n') : 'No hardcoded credentials detected.'}

## 3. INTELLECTUAL PROPERTY & LEGAL CHAIN OF TITLE
- Declared License: ${pkg.scanResult.license || 'Proprietary'}
- License File Present: ${pkg.scanResult.hasLicenseFile ? 'Yes' : 'No'}
- LLC IP Assignment Status: ${pkg.isAssignedToLLC ? 'ASSIGNED TO LLC' : 'PENDING ASSIGNMENT'}
- Primary Author: ${pkg.scanResult.author || 'Individual Founder'}

### Legal Recommendations:
${pkg.scanResult.legalAudit.recommendations.map((r) => `* ${r}`).join('\n')}

## 4. MONETIZATION READINESS
- Payment Gateway (Stripe): ${pkg.scanResult.monetizationAudit.hasStripe ? 'Detected' : 'Not Integrated'}
- Paywall Status: ${pkg.scanResult.monetizationAudit.maturity}
`;

  const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AUDIT_${safeName}_${Date.now()}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
