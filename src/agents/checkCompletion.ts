import { AgentStateType } from "../state";
import {
  areAllRequiredFieldsComplete,
  getMissingRequiredFields,
} from "../tools/fieldExtraction";

/**
 * Check if elicitation is complete and ready for team matching
 * Returns true if all required fields are filled (including "not sure" values)
 */
export function isElicitationComplete(state: AgentStateType): boolean {
  return areAllRequiredFieldsComplete(state.collectedFields);
}

/**
 * Determine next step after elicitation agent runs
 * Returns "teamMatching" if complete, "elicitationAgent" if more info needed
 */
export function routeAfterElicitation(state: AgentStateType): string {
  const complete = isElicitationComplete(state);

  if (complete) {
    console.log("[CompletionChecker] All required fields complete → routing to team matching");
    return "teamMatching";
  }

  const missing = getMissingRequiredFields(state.collectedFields);

  console.log(`[CompletionChecker] Still missing ${missing.length} required fields:`, missing);
  return "elicitationAgent";
}