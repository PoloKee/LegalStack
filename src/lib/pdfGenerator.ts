import { jsPDF } from 'jspdf';
import { Company, Member, AppPortfolioItem, VaultDocument } from '../types';

/**
 * Computes cryptographically real SHA-256 digest in hexadecimal format
 */
export async function computeSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the full Master IP Assignment Agreement text
 */
export function buildIpAssignmentText(params: {
  company: Company;
  assignor: Member;
  apps: AppPortfolioItem[];
  effectiveDate: string;
}): string {
  const { company, assignor, apps, effectiveDate } = params;

  return `INTELLECTUAL PROPERTY ASSIGNMENT AGREEMENT

This Intellectual Property Assignment Agreement (the "Agreement") is made and entered into effective as of ${effectiveDate} (the "Effective Date"), by and between:

ASSIGNOR:
${assignor.full_name} (the "Assignor"), an individual residing in the United States, having ownership and authorship of the software works and assets described herein;

AND

ASSIGNEE:
${company.legal_name} (the "Company"), a ${company.state} ${company.entity_type}, having its principal business address at ${company.principal_address}.

RECITALS

WHEREAS, Assignor has created, authored, invented, and developed certain software applications, algorithms, systems, user interfaces, documentation, and associated digital intellectual property (collectively, the "Works");

WHEREAS, Assignor formed the Company for the express commercial purpose of holding, maintaining, scaling, monetizing, and defending said Works; and

WHEREAS, Assignor desires to irrevocably convey, assign, and transfer all right, title, and interest in and to the Works to the Company, and Company desires to accept such conveyance;

NOW, THEREFORE, for good and valuable consideration, including Assignor's equity interest in the Company and other valuable consideration the receipt and adequacy of which are hereby acknowledged, the parties agree as follows:

1. ASSIGNMENT OF WORKS
Assignor hereby unconditionally and irrevocably sells, assigns, grants, and transfers to the Company, its successors, and assigns, all of Assignor's worldwide right, title, and interest in and to:
(a) The software applications, codebases, repositories, and projects identified on Schedule A attached hereto (the "Assigned Applications");
(b) All proprietary inventions, source code, object code, algorithms, visual designs, database schemas, trademarks, domain names, APIs, and trade secrets related thereto;
(c) All patent rights, copyright registrations, and common-law protections; and
(d) All claims, causes of action, and accrued rights of enforcement for past, present, or future infringement thereof.

2. WAIVER OF MORAL RIGHTS
To the maximum extent permitted by applicable law, Assignor hereby forever waives and agrees never to assert any "moral rights" (droit moral), rights of paternity, integrity, disclosure, or withdrawal against the Company or its transferees with respect to the Assigned Works.

3. REPRESENTATIONS AND WARRANTIES
Assignor represents and warrants that:
(a) Assignor is the sole author and undisputed legal owner of all Assigned Works;
(b) The Works are free and clear of all liens, encumbrances, security interests, or adverse third-party claims;
(c) The Works do not infringe or misappropriate any patent, copyright, trademark, or trade secret of any former employer, contractor, or third party; and
(d) Assignor has not granted any exclusive licenses to any third party regarding the Assigned Works.

4. FURTHER ASSURANCES
Assignor covenants and agrees to execute and deliver all such further instruments, oaths, declarations, and patent/trademark filings as the Company may reasonably request from time to time to perfect and enforce the Company's sole legal title.

5. GOVERNING LAW & SEVERABILITY
This Agreement shall be governed by and construed in accordance with the laws of the State of ${company.state}, without regard to its conflict of law principles.

SCHEDULE A — ASSIGNED INTELLECTUAL PROPERTY & APPLICATIONS
${apps.map((app, index) => `${index + 1}. ${app.name} (${app.niche})
   Description: ${app.description}
   Status: Created ${app.created_date} | Monthly Users: ${app.monthly_users.toLocaleString()} | Assigned: Yes`).join('\n\n')}

IN WITNESS WHEREOF, the parties hereto have executed this Agreement as of the Effective Date written above.

ASSIGNOR:
_____________________________________________
Name: ${assignor.full_name}
Date: ${effectiveDate}

ASSIGNEE (${company.legal_name}):
_____________________________________________
By: ${assignor.full_name}
Title: ${assignor.role}
Date: ${effectiveDate}
`;
}

/**
 * Generates the full Operating Agreement text with Article IV IP Ownership
 */
export function buildOperatingAgreementText(params: {
  company: Company;
  members: Member[];
  effectiveDate: string;
}): string {
  const { company, members, effectiveDate } = params;

  return `OPERATING AGREEMENT OF ${company.legal_name.toUpperCase()}
A ${company.state} LIMITED LIABILITY COMPANY

Effective Date: ${effectiveDate}

This Operating Agreement (this "Agreement") is adopted and entered into by and among ${company.legal_name} (the "Company") and the undersigned members (the "Members") pursuant to the Limited Liability Company Act of the State of ${company.state}.

ARTICLE I — ORGANIZATION & FORMATION
1.1 Formation. The Company was formed as a limited liability company under the laws of the State of ${company.state} by filing Certificate/Articles of Organization.
1.2 Name. The name of the Company is ${company.legal_name}.
1.3 Principal Office. The principal office is ${company.principal_address}.
1.4 Registered Agent. The registered agent is ${company.registered_agent}.
1.5 Purpose. The purpose of the Company is to engage in the design, development, licensing, deployment, monetization, and operation of software applications and digital technology products.

ARTICLE II — MEMBERS & CAPITAL CONTRIBUTIONS
2.1 Initial Contributions. Each Member has contributed capital, prior software works, and services as set forth on Schedule A.
2.2 Ownership Percentages. Membership interests and profit allocations are set forth on Schedule A.
2.3 Limited Liability. No Member shall be personally liable for any debt, obligation, or liability of the Company solely by reason of being a Member.

ARTICLE III — MANAGEMENT
3.1 Management. The Company shall be Member-Managed. Managing Members have plenary authority to sign contracts, bind the Company, and open bank accounts.

ARTICLE IV — INTELLECTUAL PROPERTY (COMPANY ASSET LOCK)
4.1 Exclusive Company Ownership. All intellectual property, software codebases, AI models, prompts, algorithms, databases, domain names, customer lists, and inventions created by any Member in connection with the Company's business shall be the sole and exclusive property of the Company.
4.2 Assignment of Prior Works. Each Member hereby unconditionally assigns and transfers to the Company all right, title, and interest in and to any pre-existing software applications or works contributed to or utilized by the Company.
4.3 Moral Rights. To the fullest extent permitted by law, each Member waives all moral rights in any software works created for or assigned to the Company.
4.4 Work Made for Hire. All development work performed by Members for the Company shall be deemed work made for hire under applicable copyright laws.

ARTICLE V — FINANCIAL SEPARATION & CORPORATE VEIL DEFENSE
5.1 Separate Accounts. The Company shall maintain bank accounts strictly in the name of the Company.
5.2 Prohibition on Co-Mingling. Company funds shall never be co-mingled with personal funds of any Member. Personal expenses paid with company assets constitute member draws or loans requiring formal reimbursement.

ARTICLE VI — TRANSFER RESTRICTIONS & DISSOLUTION
6.1 Transfer Limitations. No Member may pledge, transfer, or sell any membership units without the written consent of all other Members.
6.2 IP on Dissolution. In the event of liquidation or dissolution, all Intellectual Property shall remain intact as an asset of the Company and sold or licensed in gross, and shall never be fragmented piecemeal.

ARTICLE VII — MISCELLANEOUS & GOVERNING LAW
7.1 Governing Law. This Agreement is governed by the laws of the State of ${company.state}.

SCHEDULE A — MEMBERSHIP UNITS & OWNERSHIP
${members.map((m, i) => `(${i + 1}) ${m.full_name} | Role: ${m.role} | Ownership: ${m.ownership_pct}% | Capital Contribution: IP & Initial Cash`).join('\n')}

IN WITNESS WHEREOF, the Members have executed this Operating Agreement as of ${effectiveDate}.

${members.map((m) => `MEMBER:
_____________________________________________
${m.full_name} (${m.role})
Date: ${effectiveDate}`).join('\n\n')}
`;
}

/**
 * Downloads a generated legal PDF using jsPDF
 */
export function downloadLegalPdf(filename: string, title: string, content: string, hash: string): void {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 45;
  const maxWidth = pageWidth - margin * 2;

  // Header banner
  doc.setFont('times', 'bold');
  doc.setFontSize(14);
  doc.text(title.toUpperCase(), margin, 50);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Digital Verification Hash (SHA-256): ${hash}`, margin, 64);
  doc.text(`Corporate Document Vault · Generated by LegalStack Architect`, margin, 74);

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 82, pageWidth - margin, 82);

  // Body content
  doc.setFont('times', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(20, 20, 20);

  const lines = doc.splitTextToSize(content, maxWidth);
  let y = 100;
  const lineHeight = 13.5;

  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > pageHeight - 45) {
      // Add page footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(`Page ${doc.getNumberOfPages()} · Confidential & Privileged Corporate Record`, margin, pageHeight - 25);

      doc.addPage();
      y = 50;

      // New page running header
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`${title} · SHA-256: ${hash.substring(0, 16)}...`, margin, y);
      doc.line(margin, y + 6, pageWidth - margin, y + 6);
      y += 24;

      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(20, 20, 20);
    }

    const line = lines[i];
    // Bold section titles
    if (line.startsWith('ARTICLE ') || line.startsWith('SCHEDULE ') || line.startsWith('RECITALS') || line.match(/^[0-9]\. /)) {
      doc.setFont('times', 'bold');
      doc.text(line, margin, y);
      doc.setFont('times', 'normal');
    } else {
      doc.text(line, margin, y);
    }
    y += lineHeight;
  }

  // Final page footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text(`Page ${doc.getNumberOfPages()} · Confidential & Privileged Corporate Record · End of Document`, margin, pageHeight - 25);

  doc.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
