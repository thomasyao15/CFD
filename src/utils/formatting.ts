import { CollectedFields, UNIVERSAL_FIELDS } from "../config/fields";
import { isValidFieldValue, getAllMissingFields } from "./validation";

/**
 * Formats remaining uncollected fields for LLM prompts.
 * Shows what still needs to be collected.
 */
export function formatRemainingFields(
  collectedFields: Partial<CollectedFields>
): string {
  const missingFields = getAllMissingFields(collectedFields);

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
 * Formats collected fields summary for LLM prompts.
 * Uses snake_case field names.
 */
export function formatCollectedFieldsSummary(
  collectedFields: Partial<CollectedFields>
): string {
  const lines: string[] = [];

  for (const field of UNIVERSAL_FIELDS) {
    const value = collectedFields[field.name as keyof CollectedFields];

    if (isValidFieldValue(value)) {
      lines.push(`- ${field.name}: "${value}"`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(none yet)";
}

/**
 * Formats collected fields for user-friendly display.
 * Uses field labels instead of snake_case names.
 */
export function formatCollectedFieldsForUser(
  collectedFields: Partial<CollectedFields>
): string {
  const lines: string[] = [];

  for (const field of UNIVERSAL_FIELDS) {
    const value = collectedFields[field.name as keyof CollectedFields];

    if (isValidFieldValue(value)) {
      lines.push(`- **${field.label}:** ${value}`);
    }
  }

  return lines.length > 0 ? lines.join("\n") : "(none yet)";
}

/**
 * Calculates completion percentage of collected fields.
 */
export function calculateCompletionPercentage(
  collectedFields: Partial<CollectedFields>
): number {
  const totalFields = UNIVERSAL_FIELDS.length;
  const completedFields = UNIVERSAL_FIELDS.filter((field) => {
    const value = collectedFields[field.name as keyof CollectedFields];
    return isValidFieldValue(value);
  }).length;

  return Math.round((completedFields / totalFields) * 100);
}
