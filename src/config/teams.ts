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
 * These teams represent different specializations that handle specific types of requests
 */
export const TEAMS: TeamDefinition[] = [
  {
    id: "identity_access_team",
    name: "Identity & Access Management Team",
    description:
      "Handles all authentication, authorization, and identity-related issues. " +
      "Specializes in login problems, password resets, multi-factor authentication (MFA), " +
      "single sign-on (SSO), access provisioning, account lockouts, permission issues, " +
      "security tokens, and user credential management. Also handles access requests for " +
      "systems, applications, and resources requiring identity verification.",
    keywords: [
      "login",
      "password",
      "authentication",
      "access",
      "permission",
      "sso",
      "mfa",
      "2fa",
      "account",
      "locked out",
      "sign in",
      "credentials",
      "token",
      "authorize",
      "unlock",
    ],
    sharepoint_site_url: "https://contoso.sharepoint.com/sites/IdentityTeam",
    sharepoint_list_title: "Access Requests",
  },
  {
    id: "performance_engineering_team",
    name: "Performance Engineering Team",
    description:
      "Handles all application and system performance issues. Specializes in slow loading times, " +
      "latency problems, timeouts, application crashes, high resource usage, memory leaks, " +
      "CPU bottlenecks, network delays, database query optimization, caching issues, and " +
      "overall system responsiveness. Also handles capacity planning and scalability concerns.",
    keywords: [
      "slow",
      "performance",
      "latency",
      "timeout",
      "crash",
      "freeze",
      "lag",
      "delay",
      "loading",
      "hanging",
      "unresponsive",
      "speed",
      "fast",
      "optimization",
      "memory",
      "cpu",
    ],
    sharepoint_site_url: "https://contoso.sharepoint.com/sites/PerfTeam",
    sharepoint_list_title: "Performance Incidents",
  },
  {
    id: "data_analytics_team",
    name: "Data & Analytics Team",
    description:
      "Handles all data access, reporting, analytics, and business intelligence requests. " +
      "Specializes in report generation, dashboard creation, data exports, database queries, " +
      "data visualization, analytics tools, BI platform access, data warehouse issues, " +
      "ETL processes, data quality concerns, and custom analytics requirements. Also handles " +
      "requests for new data sources, metric definitions, and analytical insights.",
    keywords: [
      "data",
      "report",
      "dashboard",
      "analytics",
      "query",
      "export",
      "database",
      "bi",
      "business intelligence",
      "metrics",
      "visualization",
      "chart",
      "graph",
      "statistics",
      "insights",
      "analysis",
    ],
    sharepoint_site_url: "https://contoso.sharepoint.com/sites/DataTeam",
    sharepoint_list_title: "Data Requests",
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
