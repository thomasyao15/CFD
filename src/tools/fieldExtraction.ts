import { z } from "zod";
import { CollectedFields, UNIVERSAL_FIELDS } from "../config/fields";

/**
 * Zod schema for field extraction with structured output
 * Used by LLM to extract field values from user messages
 *
 * Note: OpenAI's structured output API requirements:
 * - Doesn't support z.record() with dynamic keys (must use explicit object properties)
 * - Doesn't support .optional() without .nullable() (all fields must be required or nullable)
 */
export const FieldExtractionSchema = z.object({
  /** Fields that were successfully extracted with values */
  updates: z
    .object({
      title: z.string().nullable(),
      detailed_description: z.string().nullable(),
      criticality: z.enum(["nice to have", "important to have", "necessary to have", "mission-critical to have"]).nullable(),
      dependencies: z.string().nullable(), // Comma-separated string
      strategic_alignment: z.string().nullable(), // Comma-separated string
      benefits: z.string().nullable(),
      demand_sponsor: z.string().nullable(),
      risk: z.enum(["Risk to a Single Team", "Risk to Multiple Teams", "Risk to Whole of Fund"]).nullable(),
      other_details: z.string().nullable(),
    })
    .describe(
      "Field values extracted from user's message. Set to null if not mentioned. For criticality and risk: ONLY extract if user explicitly provides exact enum value. For dependencies and strategic_alignment: store as comma-separated strings."
    ),

  /** Fields that user explicitly said they don't know */
  marked_unknown: z
    .array(
      z.enum([
        "title",
        "detailed_description",
        "criticality",
        "dependencies",
        "strategic_alignment",
        "benefits",
        "demand_sponsor",
        "risk",
        "other_details",
      ])
    )
    .describe(
      "Field names that the user explicitly said they don't know or can't provide"
    ),

  /** Overall confidence in the extraction (0-100) */
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Your confidence level in the accuracy of the extracted information"
    ),

  /** Brief explanation of what was extracted */
  reasoning: z
    .string()
    .describe(
      "Brief explanation of what information was extracted and from where"
    ),

  /** Conversational follow-up response to the user */
  followup_response: z
    .string()
    .describe(
      "Natural conversational response that: (1) Acknowledges what the user shared, (2) Summarizes what's been collected so far, (3) Asks for remaining missing fields naturally without mentioning technical field names. Be warm, professional, and helpful. For multi-select fields like strategic alignment or dependencies, ask naturally about business outcomes or blockers."
    ),
});

export type FieldExtraction = z.infer<typeof FieldExtractionSchema>;

/**
 * Check if a field value is valid (not empty, null, or invalid)
 * Handles all the edge cases of "empty" values the LLM might return
 */
export function isValidFieldValue(value: any): boolean {
  // Check for all types of empty/invalid values
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === "\u0000"
  ) {
    return false;
  }
  // Check for whitespace-only strings
  if (typeof value === "string" && value.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Get list of missing required fields
 */
export function getMissingRequiredFields(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): string[] {
  const requiredFieldNames = UNIVERSAL_FIELDS.filter((f) => f.required).map(
    (f) => f.name
  );

  return requiredFieldNames.filter((fieldName) => {
    const value = collectedFields[fieldName as keyof CollectedFields];
    const hasValue = isValidFieldValue(value);
    const markedUnknown = fieldsMarkedUnknown.includes(fieldName);
    return !hasValue && !markedUnknown;
  });
}

/**
 * Get list of all missing fields (required + optional)
 */
export function getAllMissingFields(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): string[] {
  return UNIVERSAL_FIELDS.map((f) => f.name).filter((fieldName) => {
    const value = collectedFields[fieldName as keyof CollectedFields];
    const hasValue = isValidFieldValue(value);
    const markedUnknown = fieldsMarkedUnknown.includes(fieldName);
    return !hasValue && !markedUnknown;
  });
}

/**
 * Format remaining uncollected fields with snake_case names for LLM
 * Used in system prompt to show what still needs to be collected
 */
export function formatRemainingFields(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): string {
  const missingFields = getAllMissingFields(
    collectedFields,
    fieldsMarkedUnknown
  );

  if (missingFields.length === 0) {
    return "(all fields collected)";
  }

  const lines: string[] = [];

  for (const fieldName of missingFields) {
    const field = UNIVERSAL_FIELDS.find((f) => f.name === fieldName);
    if (field) {
      const requiredTag = field.required ? " (required)" : " (optional)";
      lines.push(`- ${field.name} ${requiredTag}: ${field.description} - ${field.prompt}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format collected fields summary with snake_case field names for LLM
 * Used in system prompt so LLM knows what's been collected
 */
export function formatCollectedFieldsSummary(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): string {
  const lines: string[] = [];

  for (const field of UNIVERSAL_FIELDS) {
    const value = collectedFields[field.name as keyof CollectedFields];
    const markedUnknown = fieldsMarkedUnknown.includes(field.name);

    if (isValidFieldValue(value)) {
      lines.push(`- ${field.name}: "${value}"`);
    } else if (markedUnknown) {
      lines.push(`- ${field.name}: (user doesn't know)`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(none yet)";
}

/**
 * Format collected fields for user-friendly display
 * Uses field labels instead of snake_case names
 */
export function formatCollectedFieldsForUser(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): string {
  const lines: string[] = [];

  for (const field of UNIVERSAL_FIELDS) {
    const value = collectedFields[field.name as keyof CollectedFields];
    const markedUnknown = fieldsMarkedUnknown.includes(field.name);

    if (isValidFieldValue(value)) {
      lines.push(`- **${field.label}:** ${value}`);
    } else if (markedUnknown) {
      lines.push(`- **${field.label}:** (not provided)`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(none yet)";
}

/**
 * Check if all required fields are complete
 */
export function areAllRequiredFieldsComplete(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): boolean {
  const missingRequired = getMissingRequiredFields(
    collectedFields,
    fieldsMarkedUnknown
  );
  return missingRequired.length === 0;
}

/**
 * Calculate completion percentage
 */
export function calculateCompletionPercentage(
  collectedFields: Partial<CollectedFields>,
  fieldsMarkedUnknown: string[]
): number {
  const totalFields = UNIVERSAL_FIELDS.length;
  const completedFields = UNIVERSAL_FIELDS.filter((field) => {
    const value = collectedFields[field.name as keyof CollectedFields];
    const hasValue = isValidFieldValue(value);
    const markedUnknown = fieldsMarkedUnknown.includes(field.name);
    return hasValue || markedUnknown;
  }).length;

  return Math.round((completedFields / totalFields) * 100);
}
