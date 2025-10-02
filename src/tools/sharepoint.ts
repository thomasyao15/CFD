import { CollectedFields } from "../config/fields";

/**
 * SharePoint submission result
 */
export interface SharePointSubmissionResult {
  success: boolean;
  item_url?: string;
  item_id?: string;
  error?: string;
}

/**
 * Submit demand/change request to team's SharePoint list
 *
 * STUB: Returns mock success for testing
 * TODO: Implement real SharePoint API integration with proper authentication
 *
 * Field Mappings (to be implemented):
 * - Requested_by: Auto-populated from authenticated user context (user.email)
 * - Requested_department: Auto-populated from authenticated user context (user.department)
 * - Title → title (Single line of text)
 * - Detailed_description → detailed_description (Multiple lines of text)
 * - Criticality → criticality (Choice field)
 * - Dependencies → dependencies (Multiple lines of text or Choice with multiple selections)
 * - Strategic_alignment → strategic_alignment (Multiple lines of text or Choice with multiple selections)
 * - Benefits → benefits (Multiple lines of text)
 * - Demand_sponsor → demand_sponsor (Single line of text)
 * - Risk → risk (Choice field)
 * - Other_details → other_details (Multiple lines of text)
 * - Team_name → Determined from teamId, values: "Ops Change", "IO Change", "Hyperautomation"
 */
export async function submitToSharePoint(
  teamId: string,
  fields: Partial<CollectedFields>
): Promise<SharePointSubmissionResult> {
  console.log(`[SharePoint] Submitting demand request to team: ${teamId}`);
  console.log(`[SharePoint] Fields:`, JSON.stringify(fields, null, 2));

  // TODO: Add authenticated user context
  // const userEmail = context.user.email;
  // const userDepartment = context.user.department;

  // Map team ID to team name
  const teamNameMap: Record<string, string> = {
    ops_change: "Ops Change",
    io_change: "IO Change",
    hyperautomation: "Hyperautomation",
  };

  const teamName = teamNameMap[teamId] || teamId;

  // TODO: Real SharePoint submission would look like:
  // const spItem = {
  //   Title: fields.title,
  //   Requested_by: userEmail,
  //   Requested_department: userDepartment,
  //   Detailed_description: fields.detailed_description,
  //   Criticality: fields.criticality,
  //   Dependencies: fields.dependencies, // Comma-separated or multi-select
  //   Strategic_alignment: fields.strategic_alignment, // Comma-separated or multi-select
  //   Benefits: fields.benefits,
  //   Demand_sponsor: fields.demand_sponsor,
  //   Risk: fields.risk,
  //   Other_details: fields.other_details,
  //   Team_name: teamName,
  // };
  // const result = await sp.web.lists.getByTitle("Demand Requests").items.add(spItem);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock successful submission
  const mockItemId = Math.floor(Math.random() * 10000);
  const mockUrl = `https://australiansuper.sharepoint.com/sites/${teamId}/Lists/DemandRequests/Item/${mockItemId}`;

  console.log(`[SharePoint] ✅ Mock submission successful: ${mockUrl}`);
  console.log(`[SharePoint] Team: ${teamName}`);

  return {
    success: true,
    item_url: mockUrl,
    item_id: mockItemId.toString(),
  };
}
