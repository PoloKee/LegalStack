export interface StateRule {
  id: string;
  state: string;
  title: string;
  description: string;
  dueRule: string;
  estimatedCost: number;
  filingUrl: string;
  penaltyWarning: string;
  recurrence: 'annual' | 'biennial' | 'one-time';
}

export const US_STATE_RULES: Record<string, StateRule[]> = {
  DE: [
    {
      id: 'de-franchise-llc',
      state: 'DE',
      title: 'Delaware Annual Franchise Tax (LLC)',
      description: 'Flat $300 tax due annually by June 1 for all Delaware LLCs.',
      dueRule: 'June 1 annually',
      estimatedCost: 300,
      filingUrl: 'https://corp.delaware.gov/paytaxes/',
      penaltyWarning: '$200 late penalty + 1.5% interest per month on total tax and penalty.',
      recurrence: 'annual',
    },
    {
      id: 'de-registered-agent',
      state: 'DE',
      title: 'Delaware Registered Agent Service Renewal',
      description: 'Annual fee paid to maintain physical registered office representation.',
      dueRule: 'Anniversary of formation',
      estimatedCost: 125,
      filingUrl: 'https://corp.delaware.gov/',
      penaltyWarning: 'Loss of registered agent leads to administrative forfeiture of good standing within 30 days.',
      recurrence: 'annual',
    },
  ],
  CA: [
    {
      id: 'ca-min-tax',
      state: 'CA',
      title: 'California $800 Minimum Franchise Tax',
      description: 'Annual tax owed by every LLC registered or doing business in California.',
      dueRule: 'April 15 (15th day of 4th month of tax year)',
      estimatedCost: 800,
      filingUrl: 'https://www.ftb.ca.gov/pay/index.html',
      penaltyWarning: '5% monthly penalty up to 25%, plus interest.',
      recurrence: 'annual',
    },
    {
      id: 'ca-soi',
      state: 'CA',
      title: 'California Statement of Information (Form LLC-12)',
      description: 'Biennial filing disclosing managers, members, and principal office address.',
      dueRule: 'Every 2 years by end of anniversary month',
      estimatedCost: 20,
      filingUrl: 'https://bizfileonline.sos.ca.gov/',
      penaltyWarning: '$250 late filing penalty assessed by Franchise Tax Board.',
      recurrence: 'biennial',
    },
  ],
  WY: [
    {
      id: 'wy-annual-report',
      state: 'WY',
      title: 'Wyoming Annual Report & License Tax',
      description: 'Annual report with $60 minimum license tax based on Wyoming assets.',
      dueRule: 'First day of formation anniversary month',
      estimatedCost: 60,
      filingUrl: 'https://wyobiz.wyo.gov/',
      penaltyWarning: '$50 late penalty; administrative dissolution after 60 days.',
      recurrence: 'annual',
    },
  ],
  TX: [
    {
      id: 'tx-franchise',
      state: 'TX',
      title: 'Texas Franchise Tax Report / No Tax Due Information',
      description: 'Annual report; businesses under $2.47M revenue file No Tax Due form.',
      dueRule: 'May 15 annually',
      estimatedCost: 0,
      filingUrl: 'https://comptroller.texas.gov/taxes/franchise/',
      penaltyWarning: '$50 late fee plus 5-10% penalties on any tax assessed.',
      recurrence: 'annual',
    },
  ],
  FL: [
    {
      id: 'fl-annual-report',
      state: 'FL',
      title: 'Florida LLC Annual Report',
      description: 'Annual report required to maintain active status with the Division of Corporations.',
      dueRule: 'May 1 annually (between Jan 1 and May 1)',
      estimatedCost: 138.75,
      filingUrl: 'https://sunbiz.org/annual_report.html',
      penaltyWarning: '$400 non-negotiable late fee; administrative dissolution in September.',
      recurrence: 'annual',
    },
  ],
  NY: [
    {
      id: 'ny-biennial',
      state: 'NY',
      title: 'New York Biennial Statement',
      description: 'Report filed every two years with the Department of State.',
      dueRule: 'Every 2 years during formation month',
      estimatedCost: 9,
      filingUrl: 'https://dos.ny.gov/biennial-statements-business-corporations-and-limited-liability-companies',
      penaltyWarning: 'Past-due status reflected on public corporate registry.',
      recurrence: 'biennial',
    },
  ],
  WA: [
    {
      id: 'wa-annual-report',
      state: 'WA',
      title: 'Washington State Annual Report',
      description: 'Annual report filed with the Secretary of State.',
      dueRule: 'End of formation anniversary month',
      estimatedCost: 60,
      filingUrl: 'https://ccfs.sos.wa.gov/',
      penaltyWarning: '$25 penalty; administrative dissolution if delinquent.',
      recurrence: 'annual',
    },
  ],
};

export function getStateRules(state: string): StateRule[] {
  return US_STATE_RULES[state.toUpperCase()] || [
    {
      id: `${state.toLowerCase()}-generic`,
      state: state.toUpperCase(),
      title: `${state.toUpperCase()} Annual Corporate Report`,
      description: `Mandatory annual or biennial registration report with ${state.toUpperCase()} Secretary of State.`,
      dueRule: 'Annual anniversary',
      estimatedCost: 100,
      filingUrl: 'https://www.google.com/search?q=' + encodeURIComponent(`${state} Secretary of State annual report`),
      penaltyWarning: 'Loss of good standing and late reinstatement fees.',
      recurrence: 'annual',
    },
  ];
}
