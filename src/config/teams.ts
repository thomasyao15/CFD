/**
 * Team Directory Configuration
 * Defines all teams that can receive requests through the Consolidated Front Door
 */

/**
 * Definition of a team that can handle requests
 */
export interface TeamDefinition {
  /** Unique team identifier */
  id: string;
  /** Display name of the team */
  name: string;
  /** Detailed description of team capabilities and responsibilities */
  description: string;
  /** Common keywords/terms in requests this team handles */
  keywords: string[];
  /** SharePoint site URL for this team */
  sharepoint_site_url: string;
  /** SharePoint list title where requests are submitted */
  sharepoint_list_title: string;
}

/**
 * All available teams in the organization
 * AustralianSuper Change & Demand teams
 */
export const TEAMS: TeamDefinition[] = [
  {
    id: "ops_change",
    name: "Ops Change",
    description:
      "The Ops Change team delivers end-to-end operational support and innovation across investment performance, risk, and reporting functions. " +
      "They automate reporting workflows, ensure data quality and accurate performance measurement, manage trade processing, reconciliation, corporate actions, and valuation oversight. " +
      "Additionally, they support insurance claims and policy administration, public markets operations, and treasury functions including liquidity and FX/derivatives management.",
    keywords: [
      "reporting automation",
      "powerbi",
      "excel",
      "pearl",
      "attribution",
      "fixed income",
      "accruals",
      "bonds",
      "performance",
      "returns",
      "benchmark",
      "time-weighted",
      "money-weighted",
      "risk reporting",
      "exposure",
      "VaR",
      "stress testing",
      "scenario analysis",
      "trade",
      "settlement",
      "cash",
      "position",
      "reconciliation",
      "nostro",
      "mergers",
      "rights",
      "corporate actions",
      "pricing",
      "valuation",
      "fair value",
      "NAV",
      "oversight",
      "fund accounting",
      "shadow NAV",
      "claims processing",
      "insurance claims",
      "claims management",
      "death benefits",
      "policy administration",
      "underwriting",
      "renewal",
      "policy management",
      "equity",
      "trading operations",
      "maturity",
      "liquidity",
      "cash forecasting",
      "FX",
      "derivatives",
      "swaps",
      "forwards",
      "hedging",
    ],
    sharepoint_site_url: "https://australiansuper.sharepoint.com/sites/OpsChange",
    sharepoint_list_title: "Demand Requests",
  },
  {
    id: "io_change",
    name: "IO Change",
    description:
      "The IO Change team drives transformation across real assets and private credit by modernizing portfolio systems, integrating platforms, and expanding alternative asset capabilities. " +
      "They enhance operational efficiency through automation, data reconciliation, and system integration, while also supporting mid-risk oversight and portfolio management enablement. " +
      "Additionally, they contribute to organizational culture through colleague-focused initiatives and change support.",
    keywords: [
      "PMS",
      "Aladdin",
      "portfolio management system",
      "modernization",
      "mid risk",
      "IANA report",
      "risk issues",
      "unlisted assets",
      "dedicated loans",
      "global locations",
      "WSO",
      "Notice Manager",
      "Calypso",
      "integrations",
      "automation",
      "e2e processes",
      "interfaces",
      "reconciliation",
      "ABOR feed",
      "TAD",
      "DNAV",
      "human resources",
      "recruitment",
      "onboarding",
      "dashboard",
      "historical data",
      "performance benchmarks",
      "real assets",
      "private credit",
      "alternative assets",
      "portfolio",
      "system integration",
    ],
    sharepoint_site_url: "https://australiansuper.sharepoint.com/sites/IOChange",
    sharepoint_list_title: "Demand Requests",
  },
  {
    id: "hyperautomation",
    name: "Hyperautomation",
    description:
      "The Hyperautomation team focuses on streamlining operations by designing and deploying automated workflows, building low-code apps, and integrating scalable solutions. " +
      "They leverage tools like Power Automate and Power Apps to reduce manual tasks and enhance user efficiency. " +
      "Their work enables faster, more reliable processes across business functions through intelligent automation.",
    keywords: [
      "Power Automate",
      "Logic Apps",
      "Function Apps",
      "Power Apps",
      "custom connectors",
      "UI automation",
      "efficiency",
      "manual task reduction",
      "scalability",
      "workflow automation",
      "low-code",
      "no-code",
      "process automation",
      "RPA",
      "robotic process automation",
      "intelligent automation",
      "business process automation",
    ],
    sharepoint_site_url: "https://australiansuper.sharepoint.com/sites/Hyperautomation",
    sharepoint_list_title: "Demand Requests",
  },
];

/**
 * Get team by ID
 */
export function getTeamById(teamId: string): TeamDefinition | undefined {
  return TEAMS.find((team) => team.id === teamId);
}

/**
 * Get all team IDs
 */
export function getAllTeamIds(): string[] {
  return TEAMS.map((team) => team.id);
}
