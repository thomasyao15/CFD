import { CollectedFields, UNIVERSAL_FIELDS } from "../config/fields";

/**
 * Checks if a field value is valid (not empty, null, or invalid).
 */
export function isValidFieldValue(value: any): boolean {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null" ||
    value === ":null" ||
    value === "\u0000"
  ) {
    return false;
  }
  if (typeof value === "string" && value.trim() === "") {
    return false;
  }
  return true;
}

/**
 * Gets list of missing required fields.
 */
export function getMissingRequiredFields(
  collectedFields: Partial<CollectedFields>
): string[] {
  const requiredFieldNames = UNIVERSAL_FIELDS.filter((f) => f.required).map(
    (f) => f.name
  );

  return requiredFieldNames.filter((fieldName) => {
    const value = collectedFields[fieldName as keyof CollectedFields];
    return !isValidFieldValue(value);
  });
}

/**
 * Gets list of all missing fields (required + optional).
 */
export function getAllMissingFields(
  collectedFields: Partial<CollectedFields>
): string[] {
  return UNIVERSAL_FIELDS.map((f) => f.name).filter((fieldName) => {
    const value = collectedFields[fieldName as keyof CollectedFields];
    return !isValidFieldValue(value);
  });
}

/**
 * Checks if all required fields are complete.
 */
export function areAllRequiredFieldsComplete(
  collectedFields: Partial<CollectedFields>
): boolean {
  const missingRequired = getMissingRequiredFields(collectedFields);
  return missingRequired.length === 0;
}
