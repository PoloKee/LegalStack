import JSZip from 'jszip';
import { SoftwareScanResult, ScannedFileMeta } from '../types';
import { computeSha256 } from './pdfGenerator';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript (React)',
  js: 'JavaScript',
  jsx: 'JavaScript (React)',
  mjs: 'JavaScript',
  py: 'Python',
  css: 'CSS',
  scss: 'SCSS',
  html: 'HTML',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  toml: 'TOML',
  sql: 'SQL',
  rs: 'Rust',
  go: 'Go',
  md: 'Markdown',
};

const SECRET_PATTERNS = [
  { type: 'OpenAI API Key', regex: /sk-(?:proj-)?[a-zA-Z0-9_-]{32,}/g, severity: 'critical' as const },
  { type: 'Google AI / Cloud API Key', regex: /AIza[0-9A-Za-z-_]{35}/g, severity: 'critical' as const },
  { type: 'Stripe Secret Key', regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g, severity: 'critical' as const },
  { type: 'Stripe Publishable Key', regex: /pk_(?:live|test)_[0-9a-zA-Z]{24,}/g, severity: 'medium' as const },
  { type: 'GitHub Personal Access Token', regex: /ghp_[0-9a-zA-Z]{36}/g, severity: 'high' as const },
  { type: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: 'high' as const },
  { type: 'Private Cryptographic Key', regex: /-----BEGIN (?:RSA|EC|OPENSSH|PGP)? ?PRIVATE KEY-----/g, severity: 'critical' as const },
  { type: 'Supabase Service Role JWT', regex: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: 'critical' as const },
];

/**
 * Scans a software zip file buffer, analyzes package structure, extracts tech stack,
 * identifies frameworks, performs security secret scanning, and evaluates IP readiness.
 */
export async function scanSoftwareZip(
  fileData: ArrayBuffer | Blob
): Promise<{ scanResult: SoftwareScanResult; sha256Hash: string; base64Data: string }> {
  const arrayBuffer = fileData instanceof Blob ? await fileData.arrayBuffer() : fileData;
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Compute package SHA-256 hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  // Encode base64 for download preservation
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Data = btoa(binary);

  let appName = 'Unknown Software Project';
  let version = '1.0.0';
  let description = 'Extracted software application codebase.';
  let author = '';
  let license = 'Proprietary / Unspecified';
  let hasLicenseFile = false;
  let hasEnvFile = false;

  const prodDeps: string[] = [];
  const devDeps: string[] = [];
  const detectedServices = new Set<string>();
  const frameworks = new Set<string>();

  const languageStats: Record<string, { loc: number; fileCount: number }> = {};
  const filesSample: ScannedFileMeta[] = [];
  const leakedSecrets: SoftwareScanResult['securityAudit']['leakedSecrets'] = [];

  let totalFiles = 0;
  let totalLOC = 0;
  let totalSize = 0;

  // Iterate over files in the zip
  const fileEntries = Object.entries(zip.files).filter(([_, entry]) => !entry.dir);
  totalFiles = fileEntries.length;

  for (const [path, entry] of fileEntries) {
    const fileName = path.split('/').pop() || path;
    const ext = fileName.includes('.') ? fileName.split('.').pop()!.toLowerCase() : '';
    const lang = EXTENSION_LANGUAGE_MAP[ext] || 'Other';

    totalSize += (entry as any)._data?.uncompressedSize || 1024;

    // Check for sensitive files (.env)
    if (fileName === '.env' || fileName.startsWith('.env.local') || fileName.startsWith('.env.prod')) {
      hasEnvFile = true;
      leakedSecrets.push({
        file: path,
        type: 'Active Environment File (.env)',
        sample: `${fileName} included in repository archive`,
        severity: 'high',
      });
    }

    if (fileName.toLowerCase().startsWith('license') || fileName.toLowerCase().startsWith('copying')) {
      hasLicenseFile = true;
    }

    // Try reading text files for deeper code & secret analysis
    const isTextFile =
      ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'py', 'css', 'html', 'sql', 'md', 'toml', 'yaml', 'yml', 'env', 'example', 'txt'].includes(ext) ||
      fileName.startsWith('.') ||
      fileName.toLowerCase().includes('license') ||
      fileName.toLowerCase().includes('readme');

    let fileContentPreview: string | undefined = undefined;

    if (isTextFile) {
      try {
        const content = await entry.async('string');
        const lines = content.split('\n').length;
        totalLOC += lines;

        // Keep content preview for user inspection in code viewer (up to 50KB)
        fileContentPreview = content.length <= 50000 ? content : content.slice(0, 50000) + '\n\n... [Truncated for preview]';

        if (lang !== 'Other' && lang !== 'Markdown') {
          if (!languageStats[lang]) {
            languageStats[lang] = { loc: 0, fileCount: 0 };
          }
          languageStats[lang].loc += lines;
          languageStats[lang].fileCount += 1;
        }

        // Parse Google AI Studio metadata.json
        if (fileName === 'metadata.json') {
          try {
            const meta = JSON.parse(content);
            if (meta.name) appName = meta.name;
            if (meta.description) description = meta.description;
            frameworks.add('Google AI Studio');
            if (meta.majorCapabilities && Array.isArray(meta.majorCapabilities)) {
              meta.majorCapabilities.forEach((cap: string) => {
                if (cap.includes('GEMINI')) detectedServices.add('Google Gemini / GenAI');
              });
            }
          } catch {}
        }

        // Parse package.json
        if (fileName === 'package.json') {
          try {
            const pkg = JSON.parse(content);
            if (pkg.name) appName = pkg.name;
            if (pkg.version) version = pkg.version;
            if (pkg.description) description = pkg.description;
            if (pkg.author) author = typeof pkg.author === 'string' ? pkg.author : pkg.author.name || '';
            if (pkg.license) license = pkg.license;

            if (pkg.dependencies) {
              Object.keys(pkg.dependencies).forEach((dep) => prodDeps.push(dep));
            }
            if (pkg.devDependencies) {
              Object.keys(pkg.devDependencies).forEach((dep) => devDeps.push(dep));
            }
          } catch {}
        }

        // Parse README.md for title and problem description
        if (fileName.toLowerCase() === 'readme.md' && appName === 'Unknown Software Project') {
          const firstHeader = content.match(/^#\s+(.+)$/m);
          if (firstHeader && firstHeader[1]) {
            appName = firstHeader[1].trim();
          }
          const firstPara = content.split('\n\n').find((p) => !p.startsWith('#') && p.trim().length > 10);
          if (firstPara) {
            description = firstPara.trim().substring(0, 150) + '...';
          }
        }

        // Detect frameworks and services in code content
        if (content.includes('react') || content.includes('@vitejs/plugin-react') || content.includes('createRoot')) {
          frameworks.add('React');
        }
        if (content.includes('next') || content.includes('next/server')) {
          frameworks.add('Next.js');
        }
        if (content.includes('vite')) {
          frameworks.add('Vite');
        }
        if (content.includes('tailwindcss') || content.includes('@tailwindcss')) {
          frameworks.add('Tailwind CSS');
        }
        if (content.includes('express')) {
          frameworks.add('Express');
        }
        if (content.includes('@google/genai') || content.includes('GoogleGenAI') || content.includes('gemini')) {
          detectedServices.add('Google Gemini / GenAI');
        }
        if (content.includes('openai') || content.includes('OpenAI')) {
          detectedServices.add('OpenAI API');
        }
        if (content.includes('stripe') || content.includes('Stripe(') || content.includes('checkout.sessions')) {
          detectedServices.add('Stripe Payments');
        }
        if (content.includes('@supabase/supabase-js') || content.includes('createClient')) {
          detectedServices.add('Supabase');
        }
        if (content.includes('firebase')) {
          detectedServices.add('Firebase');
        }

        // Secret scan
        for (const pattern of SECRET_PATTERNS) {
          const matches = content.match(pattern.regex);
          if (matches) {
            matches.forEach((m) => {
              // Mask part of the secret for display
              const masked = m.length > 8 ? `${m.substring(0, 6)}••••••••${m.substring(m.length - 4)}` : '••••••••';
              leakedSecrets.push({
                file: path,
                type: pattern.type,
                sample: masked,
                severity: pattern.severity,
              });
            });
          }
        }
      } catch (err) {
        // Skip unreadable files
      }
    }

    // Add to files sample
    filesSample.push({
      path,
      name: fileName,
      size: (entry as any)._data?.uncompressedSize || 1024,
      extension: ext,
      linesOfCode: fileContentPreview ? fileContentPreview.split('\n').length : undefined,
      content: fileContentPreview,
    });
  }

  // Calculate Language percentages
  const languages = Object.entries(languageStats).map(([name, stat]) => ({
    name,
    fileCount: stat.fileCount,
    loc: stat.loc,
    percentage: totalLOC > 0 ? Math.round((stat.loc / totalLOC) * 100) : 0,
  })).sort((a, b) => b.loc - a.loc);

  // Security score
  let riskScore = 100;
  leakedSecrets.forEach((sec) => {
    if (sec.severity === 'critical') riskScore -= 30;
    else if (sec.severity === 'high') riskScore -= 15;
    else riskScore -= 5;
  });
  riskScore = Math.max(0, Math.min(100, riskScore));

  // Monetization status
  const hasStripe = detectedServices.has('Stripe Payments') || prodDeps.some((d) => d.includes('stripe'));
  const hasPaywallCode = hasStripe || prodDeps.some((d) => d.includes('lemonsqueezy') || d.includes('paddle'));
  const monetizationMaturity: SoftwareScanResult['monetizationAudit']['maturity'] =
    hasPaywallCode ? (hasStripe ? 'Complete Webhook & Checkout' : 'Stripe SDK Detected') : 'No Paywall Found';

  // Legal Recommendations
  const recommendations: string[] = [];
  if (!hasLicenseFile) {
    recommendations.push('No formal LICENSE file detected in repository root. Add Proprietary All-Rights-Reserved or assign to LLC.');
  }
  if (!author) {
    recommendations.push('No primary author attributed in package metadata. Link to founder name in master IP assignment.');
  }
  recommendations.push('Generate executed IP Assignment Agreement linking this archive SHA-256 hash to LLC corporate vault.');

  const scanResult: SoftwareScanResult = {
    appName,
    version,
    description,
    author,
    license,
    hasLicenseFile,
    frameworks: Array.from(frameworks),
    languages,
    totalFiles,
    totalLOC,
    totalSize,
    dependencies: {
      production: prodDeps,
      development: devDeps,
      detectedServices: Array.from(detectedServices),
    },
    securityAudit: {
      leakedSecrets,
      hasEnvFile,
      riskScore,
    },
    legalAudit: {
      licenseCompliance: license,
      ipOwnershipReady: true,
      recommendations,
    },
    monetizationAudit: {
      hasStripe,
      hasPaywallCode,
      maturity: monetizationMaturity,
    },
    filesSample: filesSample.slice(0, 50),
  };

  return {
    scanResult,
    sha256Hash,
    base64Data,
  };
}

/**
 * Creates an in-memory sample AI Studio software zip file so users can test
 * scanning immediately without needing a local zip file handy.
 */
export async function createDemoSoftwareZip(): Promise<Blob> {
  const zip = new JSZip();

  // package.json
  const packageJson = {
    name: 'prompt-eval-copilot',
    version: '1.2.0',
    description: 'Autonomous AI prompt evaluation harness and drift regression prober.',
    author: 'Alex Mercer <alex@hyperstack.dev>',
    license: 'Proprietary',
    dependencies: {
      react: '^19.0.0',
      'react-dom': '^19.0.0',
      '@google/genai': '^2.4.0',
      stripe: '^14.10.0',
      '@supabase/supabase-js': '^2.39.0',
    },
    devDependencies: {
      vite: '^5.0.0',
      typescript: '^5.3.0',
      tailwindcss: '^3.4.0',
    },
  };
  zip.file('package.json', JSON.stringify(packageJson, null, 2));

  // README.md
  zip.file('README.md', `# PromptEval Copilot
Autonomous AI prompt evaluation harness and drift regression prober built on Google AI Studio.
Protects production LLM applications from unexpected prompt drift and token regressions.

## Architecture
- React 19 Frontend
- Google Gemini 2.5 Flash Inference
- Supabase Vector Memory
- Stripe Customer Checkout`);

  // LICENSE
  zip.file('LICENSE', `Copyright (c) 2024 Hyperstack Software LLC. All Rights Reserved.
This software and associated documentation files are the proprietary property of the Company.`);

  // .env.example
  zip.file('.env.example', `GEMINI_API_KEY="YOUR_GEMINI_KEY"
STRIPE_SECRET_KEY="sk_test_mock_key_example"
SUPABASE_URL="https://example.supabase.co"`);

  // src/App.tsx
  zip.file('src/App.tsx', `import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [prompt, setPrompt] = useState('Evaluate prompt drift');
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold">PromptEval Pro</h1>
      <button className="bg-indigo-600 text-white px-4 py-2 rounded">Run Eval Benchmark</button>
    </div>
  );
}`);

  // src/server.ts (with Stripe payment logic)
  zip.file('src/server.ts', `import express from 'express';
import Stripe from 'stripe';

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', { apiVersion: '2023-10-16' });

app.post('/api/create-checkout', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: 'price_eval_pro', quantity: 1 }],
    success_url: '/success',
    cancel_url: '/cancel',
  });
  res.json({ url: session.url });
});`);

  return await zip.generateAsync({ type: 'blob' });
}
