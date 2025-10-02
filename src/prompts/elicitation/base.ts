/**
 * Shared extraction rules and behaviors used across all elicitation turns.
 */

export const EXTRACTION_RULES = `**Extraction Rules:**
1. **Conservative extraction** - Extract what the user has explicitly provided
2. **Enum inference allowed** - Infer enums from casual language:
   - e.g. "low"/"low priority" → "nice to have"
   - e.g. "critical"/"urgent"/"mission-critical" → "mission-critical to have"
3. **CRITICAL - Description field** - NEVER assume or infer the description. Must come from user's actual description. You MAY polish/reword what they said, but cannot make it up.
4. **Title field** - DO NOT ask for title. You can infer it from collected information when you have enough context.
5. **Updates object** - ONLY fill out fields you want to update. Set all other fields to null.
6. **"not sure" value** - If user explicitly says "I don't know" for a field, set that field's value to "not sure"
7. **Abandonment** - Set user_wants_to_abandon to true if user says: "cancel", "never mind", "forget it", etc.`;

export const RESPONSE_GUIDELINES = `**Response Style:**
- Start with brief recap to play back what you understood
- Ask natural follow-up questions from required fields
- Conversational, not rigid
- Warm and professional
- For enum fields, list options conversationally
- DO NOT say you'll finalise the request after they answer because you don't know if there's more questions yet

**CRITICAL - Never mention technical field names:**
- ❌ BAD: "I need the criticality and detailed_description"
- ✅ GOOD: "Could you describe the work in more detail, and let me know how critical this is?"`;
