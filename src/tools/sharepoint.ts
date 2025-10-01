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
 * Submit request to team's SharePoint list
 *
 * PHASE 5 STUB: Returns mock success for testing
 * Phase 6 will implement real SharePoint API integration
 */
export async function submitToSharePoint(
  teamId: string,
  fields: Partial<CollectedFields>
): Promise<SharePointSubmissionResult> {
  console.log(`[SharePoint] Submitting request to team: ${teamId}`);
  console.log(`[SharePoint] Fields:`, JSON.stringify(fields, null, 2));

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock successful submission
  const mockItemId = Math.floor(Math.random() * 10000);
  const mockUrl = `https://contoso.sharepoint.com/sites/${teamId}/Lists/Requests/Item/${mockItemId}`;

  console.log(`[SharePoint] ✅ Mock submission successful: ${mockUrl}`);

  return {
    success: true,
    item_url: mockUrl,
    item_id: mockItemId.toString(),
  };
}
