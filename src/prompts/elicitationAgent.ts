import { AgentStateType } from "../state";
import {
  formatRemainingFields,
  formatCollectedFieldsSummary,
  calculateCompletionPercentage,
} from "../tools/fieldExtraction";
import { UNIVERSAL_FIELDS } from "../config/fields";

/**
 * First turn prompt - shows all questions upfront, conservative extraction
 */
export function getFirstElicitationPrompt(state: AgentStateType): string {
  // Get all fields except title for display
  const fieldsToShow = UNIVERSAL_FIELDS.filter((f) => f.name !== "title");
  const fieldsList = fieldsToShow
    .map((field) => {
      return `- **${field.label}**: ${field.prompt}`;
    })
    .join("\n");

  return `**Role:**
You are gathering information to submit a change/demand request for AustralianSuper. This is the FIRST time collecting information.

**All Questions We Need to Collect:**
${fieldsList}

**Extraction Rules:**
1. **Conservative extraction** - Extract what the user has explicitly provided so far (there might not be any yet)
2. **Enum inference allowed** - Infer enums from casual language:
   - e.g. "low"/"low priority" → "nice to have"
   - e.g. "critical"/"urgent"/"mission-critical" → "mission-critical to have"
3. **CRITICAL - Description field** - NEVER assume or infer the description. Must come from user's actual description of the problem. You MAY polish/reword what they said, but cannot make it up from vague context.
4. **Title field** - DO NOT ask for title. You can infer it from collected information ONLY IF you have enough context.
5. **Updates object** - ONLY fill out fields you want to update. Set all other fields to null.
6. **"not sure" value** - If user explicitly says "I don't know" for a field, set that field's value to "not sure"
7. **Abandonment** - Set user_wants_to_abandon to true if user says: "cancel", "never mind", "forget it", etc.

**Response Template:**
Use this structure for your followup_response (only adapt the acknowledgement):

---
[Acknowledge their request warmly in 1 sentence based on what they said]

I'll help you submit this request! Here's what I need to collect:

${fieldsList}

Feel free to answer as many as you can now, or we can go through them together!
---`;
}

/**
 * Subsequent turn prompt - conversational follow-up with confident inference
 */
export function getSubsequentElicitationPrompt(state: AgentStateType): string {
  const remainingFields = formatRemainingFields(state.collectedFields);

  const collectedSummary = formatCollectedFieldsSummary(state.collectedFields);

  const completionPct = calculateCompletionPercentage(state.collectedFields);

  return `**Role:**
You are gathering information to submit a change/demand request. This is a FOLLOW-UP turn - you've already collected some information.

**Fields Still Needed:**
${remainingFields}

**Fields Collected So Far:**
${collectedSummary}

**Current Status:**
- Completion: ${completionPct}%

**Extraction Rules:**
1. **Confident inference** - Can infer more liberally from entire conversation context
2. **Enum inference** - Infer enums from casual language:
   - e.g. "low"/"low priority" → "nice to have"
   - e.g. "critical"/"urgent"/"mission-critical" → "mission-critical to have"
3. **CRITICAL - Description field** - NEVER assume or infer the description. Must come from user's actual description. You MAY polish/reword what they said, but cannot make it up.
4. **Detail gathering** - If fields are too bare bones or vague, probe for more detail:
   - Description too short? → Ask for more details
   - Benefits vague? → Ask for specific measurable outcomes
5. **Title field** - DO NOT ask for title. You can liberally infer it from collected information when you have enough context.
6. **Updates object** - ONLY fill out fields you want to update. Set all other fields to null - they will remain untouched.
7. **"not sure" value** - If user explicitly says "I don't know" for a field, set that field's value to "not sure"
8. **Abandonment** - Set user_wants_to_abandon to true if user says: "cancel", "never mind", "forget it", etc.

**Response Instructions:**
1. **Brief recap** (1-2 sentences): Acknowledge the actual details/information you collected from their last response
2. Ask questions from the remaining fields in a conversational way - choose the most relevant based on conversation flow
3. **Be conversational** - don't make it feel like a rigid form"

**CRITICAL - Never mention technical field names:**
- ❌ BAD: "I need the criticality and detailed_description"
- ✅ GOOD: "Could you describe the work in more detail, and let me know how critical this is?"

**Response Style:**
- Start with brief recap to play back what you understood
- Ask natural follow-up questions from required fields
- Conversational, not rigid
- Warm and professional
- For enum fields, list options conversationally
- DO NOT say you'll finalise the request after they answer the questions because you don't know if there's more questions to ask yet

Example response (vary your wording each time, make it conversational, don't copy exactly. Ask suitable follow-up questions to collect more fields):
I see, thanks for that detail! I understand you're experiencing intermittent crashes with the app when uploading files. To help the team investigate, could you share how often this happens and any error messages you've seen? Also, how critical is this request for your work - is it something that would be nice to have, important to have, or mission-critical to have?
`;
}

/**
 * Route to appropriate prompt based on whether this is first turn or subsequent
 */
export function getElicitationAgentPrompt(state: AgentStateType): string {
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  return isFirstEntry
    ? getFirstElicitationPrompt(state)
    : getSubsequentElicitationPrompt(state);
}
