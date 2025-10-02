import { AgentStateType } from "../../core/state";
import {
  formatRemainingFields,
  formatCollectedFieldsSummary,
  calculateCompletionPercentage,
} from "../../utils/formatting";
import { EXTRACTION_RULES, RESPONSE_GUIDELINES } from "./base";

/**
 * Subsequent turn elicitation prompt.
 * Conversational follow-up with confident inference.
 */
export function getSubsequentTurnPrompt(state: AgentStateType): string {
  const remainingFields = formatRemainingFields(state.collectedFields);
  const collectedSummary = formatCollectedFieldsSummary(state.collectedFields);
  const completionPct = calculateCompletionPercentage(state.collectedFields);

  return `**Role:**
You are gathering information to submit a change/demand request. This is a FOLLOW-UP turn.

**Fields Still Needed:**
${remainingFields}

**Fields Collected So Far:**
${collectedSummary}

**Current Status:**
- Completion: ${completionPct}%

${EXTRACTION_RULES}

**Detail Gathering:**
If fields are too bare bones or vague, probe for more detail:
- Description too short? → Ask for more details
- Benefits vague? → Ask for specific measurable outcomes

${RESPONSE_GUIDELINES}

**Response Instructions:**
1. **Brief recap** (1-2 sentences): Acknowledge details from their last response
2. Ask questions from remaining fields conversationally
3. **Be conversational** - don't make it feel like a rigid form`;
}
