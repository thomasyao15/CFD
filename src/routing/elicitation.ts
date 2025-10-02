import { AgentStateType } from "../core/state";
import {
  areAllRequiredFieldsComplete,
  getMissingRequiredFields,
} from "../utils/validation";

/**
 * Determines next step after elicitation agent runs.
 * Returns "teamMatching" if complete, END if more info needed.
 */
export function elicitationRouter(state: AgentStateType): string {
  const complete = areAllRequiredFieldsComplete(state.collectedFields);

  if (complete) {
    console.log("[ElicitationRouter] All required fields complete → team matching");
    return "teamMatching";
  }

  const missing = getMissingRequiredFields(state.collectedFields);
  console.log(`[ElicitationRouter] Missing ${missing.length} fields:`, missing);
  return "elicitationAgent";
}
