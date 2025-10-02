import { CollectedFields } from "../config/fields";

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
 */
export async function submitToSharePoint(
  teamId: string,
  fields: Partial<CollectedFields>
): Promise<SharePointSubmissionResult> {
  console.log(`[SharePoint] Submitting demand request to team: ${teamId}`);
  console.log(`[SharePoint] Fields:`, JSON.stringify(fields, null, 2));

  // Map team ID to team name
  const teamNameMap: Record<string, string> = {
    ops_change: "Ops Change",
    io_change: "IO Change",
    hyperautomation: "Hyperautomation",
  };

  const teamName = teamNameMap[teamId] || teamId;

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
