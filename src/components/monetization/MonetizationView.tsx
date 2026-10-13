import React, { useState } from 'react';
import {
  Zap,
  Code2,
  Calendar,
  Copy,
  Check,
  Eye,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Layers,
} from 'lucide-react';
import { AppPortfolioItem, Company } from '../../types';

interface MonetizationViewProps {
  company: Company;
  apps: AppPortfolioItem[];
  selectedAppId?: string;
}

export const MonetizationView: React.FC<MonetizationViewProps> = ({
  company,
  apps,
  selectedAppId,
}) => {
  const [activeTab, setActiveTab] = useState<'snippets' | 'landing_page' | 'sprint'>('snippets');
  const [snippetPlatform, setSnippetPlatform] = useState<'nextjs' | 'express_vite'>('nextjs');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Landing page generator state
  const champion = apps.find((a) => a.id === selectedAppId) || apps.find((a) => a.triage_status === 'champion') || apps[0];
  const [lpTitle, setLpTitle] = useState(champion ? champion.name : 'PromptVault Pro');
  const [lpHeadline, setLpHeadline] = useState('Stop Prompt Drift In Production LLM Pipelines');
  const [lpPrice, setLpPrice] = useState('29');
  const [lpBundlePrice, setLpBundlePrice] = useState('79');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Code Snippet 1: Stripe Checkout API Route
  const checkoutCodeNext = `// app/api/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const { userId, priceId, returnUrl } = await req.json();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: \`\${returnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true\`,
      cancel_url: \`\${returnUrl}?canceled=true\`,
      metadata: {
        userId,
        company: '${company.legal_name}',
        product: '${lpTitle}',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}`;

  // Code Snippet 2: Stripe Webhook Route (Supabase Access Sync)
  const webhookCode = `// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return new Response(\`Webhook signature failed: \${err.message}\`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    // Grant paid subscription access in Supabase
    await supabase.from('profiles').update({
      is_premium: true,
      stripe_customer_id: session.customer,
      plan_tier: 'pro_monthly',
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
  }

  return NextResponse.json({ received: true });
}`;

  // Code Snippet 3: React Client-Side Paywall Guard Component
  const guardCode = `// components/PaywallGuard.tsx
import React from 'react';

export function PaywallGuard({ isPremium, children, onUpgrade }: {
  isPremium: boolean;
  children: React.ReactNode;
  onUpgrade: () => void;
}) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <div className="relative border border-slate-800 rounded-xl p-8 text-center bg-slate-900/90 overflow-hidden">
      <div className="filter blur-sm opacity-20 pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/70 backdrop-blur-xs">
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
          🔒
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Upgrade To Pro</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Unlock unlimited runs, production API keys, and team exports.
        </p>
        <button
          onClick={onUpgrade}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm"
        >
          Unlock for $${lpPrice}/mo
        </button>
      </div>
    </div>
  );
}`;

  // 7-Day Founder Content Sprint
  const CONTENT_SPRINT = [
    {
      day: 1,
      theme: 'The Origin Story & Vulnerable Hook',
      platform: 'Twitter / X + LinkedIn',
      hook: `I spent the last 12 months building 42 apps on AI Studio as a solo founder with $0 budget. Here is the brutal truth of what worked, what died, and the 1 app generating 80% of my revenue 🧵👇`,
      details: 'Show a screenshot of your 42 app portfolio dashboard. List your total expenses (domain names, API costs) and highlight the transition from hobby developer to Delaware LLC.',
      cta: 'Link to free trial of Champion App in reply.',
    },
    {
      day: 2,
      theme: 'The Architecture Breakdown',
      platform: 'Hacker News Show HN / Reddit r/SaaS',
      hook: `How I ship and maintain 42 micro-apps without burning out: My modular tech stack, shared auth, and automated prompt evals.`,
      details: 'Technical deep-dive on Vite + Supabase + Stripe. Include actual code snippets and explain how LegalStack protects your IP chain of title.',
      cta: 'Ask for feedback on prompt drift issues.',
    },
    {
      day: 3,
      theme: 'The 80/20 Revenue Pareto',
      platform: 'Twitter / X + LinkedIn',
      hook: `Why 35 of my 42 apps made under $100, but 1 app is scaling to $2.5k MRR. The 3 filters that separate toy apps from enterprise tools:`,
      details: 'Break down Audience Spend, Problem Clarity, and Blue Ocean Competition. Contrast a generic Pomodoro app with an LLM prompt evaluation suite.',
      cta: 'Offer free prompt eval audit for first 10 DMs.',
    },
    {
      day: 4,
      theme: 'Interactive Screen Recording / Loom Demo',
      platform: 'LinkedIn + YouTube Shorts / TikTok',
      hook: `Watch me catch a breaking system prompt regression in 45 seconds using ${champion ? champion.name : 'PromptVault Pro'}.`,
      details: 'Short 60-second video demonstrating the pain point in production and the instant solution.',
      cta: 'Direct link to test live mock environment.',
    },
    {
      day: 5,
      theme: 'Case Study & ROI Proof',
      platform: 'Twitter / X + Substack Newsletter',
      hook: `How one indie team saved 14 engineering hours per sprint by version-controlling their AI prompts like git commits.`,
      details: 'Before vs. after metrics: Zero unexplained production hallucinations; seamless staging-to-prod prompt sync.',
      cta: 'Early access coupon code for monthly plan.',
    },
    {
      day: 6,
      theme: 'The All-Access Founder Bundle Pitch',
      platform: 'Twitter / X + Product Hunt Discussion',
      hook: `Instead of charging $29/mo for each of our 42 dev tools, I am opening a Lifetime Founder Bundle pass for 72 hours.`,
      details: 'Package your top 7 complementary apps (PromptVault, DocuClause, API MockCraft, Changelog Generator, LeadScrape) into an irresistible bundle offer.',
      cta: 'Link to bundle landing page with live countdown.',
    },
    {
      day: 7,
      theme: 'The Scarcity Close & Post-Mortem',
      platform: 'Twitter / X + LinkedIn',
      hook: `Last 6 hours before the Founder Lifetime Bundle price increases. Here are the numbers from this 7-day launch:`,
      details: 'Transparency recap: New MRR added, conversion rate, customer feedback, and lessons learned about pricing confidence.',
      cta: 'Final call to lock in founding member pricing.',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Monetization Infrastructure & Founder Content Sprint
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Turn your 42 applications into revenue with turnkey Stripe paywalls, high-converting bundle landing pages, and distribution schedules.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('snippets')}
            className={`px-3 py-1 rounded font-medium ${activeTab === 'snippets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Stripe Code Snippets
          </button>
          <button
            onClick={() => setActiveTab('landing_page')}
            className={`px-3 py-1 rounded font-medium ${activeTab === 'landing_page' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Landing Page Generator
          </button>
          <button
            onClick={() => setActiveTab('sprint')}
            className={`px-3 py-1 rounded font-medium ${activeTab === 'sprint' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            7-Day Content Sprint
          </button>
        </div>
      </div>

      {/* TAB 1: Stripe & Supabase Paywall Code Snippets */}
      {activeTab === 'snippets' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  1. Stripe Checkout Session Creator
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Server-side route that generates a hosted Stripe Checkout URL for subscriptions.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(checkoutCodeNext, 'checkout')}
                className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
              >
                {copiedCode === 'checkout' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'checkout' ? 'Copied' : 'Copy API Code'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {checkoutCodeNext}
            </pre>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  2. Stripe Webhook Handler (Supabase Entitlements)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Listens for checkout completions and flips <code className="text-indigo-400">is_premium = true</code> in your user database.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(webhookCode, 'webhook')}
                className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
              >
                {copiedCode === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'webhook' ? 'Copied' : 'Copy Webhook Code'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {webhookCode}
            </pre>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">
                  3. Client-Side PaywallGuard Component
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Drop-in React component that blurs premium features for non-paying users.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(guardCode, 'guard')}
                className="px-3 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 flex items-center gap-1"
              >
                {copiedCode === 'guard' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode === 'guard' ? 'Copied' : 'Copy Guard Component'}</span>
              </button>
            </div>
            <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              {guardCode}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: Landing Page Generator */}
      {activeTab === 'landing_page' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white tracking-tight">
              High-Converting App & Bundle Landing Page Generator
            </h2>
            <p className="text-xs text-slate-400">
              Configure your product copy and pricing, preview live, and copy clean JSX to drop into your deployment.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-lg border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Product Title</label>
                <input
                  type="text"
                  value={lpTitle}
                  onChange={(e) => setLpTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Headline Hook</label>
                <input
                  type="text"
                  value={lpHeadline}
                  onChange={(e) => setLpHeadline(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Solo App Price ($/mo)</label>
                <input
                  type="number"
                  value={lpPrice}
                  onChange={(e) => setLpPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">42-App Bundle Pass ($)</label>
                <input
                  type="number"
                  value={lpBundlePrice}
                  onChange={(e) => setLpBundlePrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Live Visual Preview */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 p-8 space-y-12">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
              <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 uppercase tracking-wider">
                Production-Ready AI Micro-SaaS
              </span>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {lpHeadline}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Built and maintained by {company.legal_name}. Trusted by developers, solo founders, and product teams across the world.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button className="px-6 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-lg shadow-sm">
                  Start Free Trial
                </button>
                <button className="px-6 py-2.5 bg-slate-800 text-slate-200 font-semibold text-xs rounded-lg border border-slate-700">
                  View Live Demo
                </button>
              </div>
            </div>

            {/* Pricing Tiers Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Tier 1: Single App Pro */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
                <div className="text-xs font-semibold text-slate-400 uppercase font-mono">Solo Pro Plan</div>
                <div className="text-2xl font-bold text-white font-mono">
                  ${lpPrice} <span className="text-xs font-normal text-slate-400">/ month</span>
                </div>
                <p className="text-xs text-slate-400">
                  Full standalone access to {lpTitle} with automated sync and priority inference.
                </p>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">✓ Unlimited production runs</li>
                  <li className="flex items-center gap-2">✓ Automated daily regression test suite</li>
                  <li className="flex items-center gap-2">✓ Instant webhook notifications</li>
                </ul>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs font-semibold text-white">
                  Get Solo Pro
                </button>
              </div>

              {/* Tier 2: All 42 Apps Bundle */}
              <div className="p-6 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-4 relative overflow-hidden">
                <div className="absolute top-2 right-2 text-[10px] font-mono text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                  Best Value
                </div>
                <div className="text-xs font-semibold text-indigo-400 uppercase font-mono">Founder Bundle Pass</div>
                <div className="text-2xl font-bold text-white font-mono">
                  ${lpBundlePrice} <span className="text-xs font-normal text-slate-400">/ one-time lifetime</span>
                </div>
                <p className="text-xs text-slate-400">
                  Access every current and future app in the {company.legal_name} portfolio (42 tools).
                </p>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">✓ All 42 AI Studio micro-apps unlocked</li>
                  <li className="flex items-center gap-2">✓ PromptVault + DocuClause + API MockCraft</li>
                  <li className="flex items-center gap-2">✓ Commercial license for client work</li>
                </ul>
                <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-xs font-semibold text-white shadow-sm">
                  Get All-Access Bundle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 7-Day Founder Content Sprint */}
      {activeTab === 'sprint' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-white tracking-tight">
              7-Day Founder Content Sprint Calendar ($0 Budget Distribution)
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Tactical day-by-day distribution sequence to take your Champion App from zero sales to cashflow using storytelling, technical breakdowns, and transparent metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {CONTENT_SPRINT.map((day) => (
              <div key={day.day} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      D{day.day}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{day.theme}</h3>
                      <span className="text-[11px] text-slate-400 font-mono">{day.platform}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(day.hook, `day_${day.day}`)}
                    className="text-xs text-slate-300 hover:text-white flex items-center gap-1 px-2.5 py-1 bg-slate-800 rounded border border-slate-700"
                  >
                    {copiedCode === `day_${day.day}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode === `day_${day.day}` ? 'Copied' : 'Copy Hook'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200 font-mono leading-relaxed">
                  "{day.hook}"
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 pt-1">
                  <div>
                    <strong className="text-slate-300 block mb-0.5">Execution Details:</strong>
                    {day.details}
                  </div>
                  <div>
                    <strong className="text-slate-300 block mb-0.5">Call to Action (CTA):</strong>
                    {day.cta}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
