/**
 * Universal Front Door Field Configuration
 * Centralized definition of all required and optional fields for request submission
 */

export type FieldType = "string" | "enum" | "number";
export type UrgencyLevel = "low" | "medium" | "high" | "critical";
export type RequestType = "incident" | "service_request" | "question" | "access_request" | "other";

/**
 * Definition of a single field in the universal front door
 */
export interface FieldDefinition {
  /** Unique field identifier */
  name: string;
  /** Data type of the field */
  type: FieldType;
  /** Whether this field must be collected */
  required: boolean;
  /** Description for internal reference */
  description: string;
  /** Question to ask user when collecting this field */
  prompt: string;
  /** For enum types: valid values */
  enumValues?: string[];
  /** Optional validation function */
  validation?: (value: any) => boolean;
}

/**
 * Universal Front Door Fields
 * These fields are required by all teams for request submission
 */
export const UNIVERSAL_FIELDS: FieldDefinition[] = [
  {
    name: "request_summary",
    type: "string",
    required: true,
    description: "Brief 1-2 sentence description of the request",
    prompt: "What issue are you experiencing or what do you need help with?",
    validation: (value: string) => value && value.length >= 10,
  },
  {
    name: "business_impact",
    type: "string",
    required: true,
    description: "How this affects business operations or user work",
    prompt: "How is this impacting your work or business operations?",
    validation: (value: string) => value && value.length >= 5,
  },
  {
    name: "urgency",
    type: "enum",
    required: true,
    description: "Timeline sensitivity of the request",
    prompt: "How urgent is this? (low, medium, high, or critical)",
    enumValues: ["low", "medium", "high", "critical"],
    validation: (value: string) =>
      ["low", "medium", "high", "critical"].includes(value.toLowerCase()),
  },
  {
    name: "affected_users",
    type: "string",
    required: false,
    description: "Who else is impacted by this issue",
    prompt: "Who else (individuals or teams) is affected by this issue?",
  },
  {
    name: "request_type",
    type: "enum",
    required: true,
    description: "Type of request being submitted",
    prompt: "What type of request is this? (incident, service_request, question, access_request, or other)",
    enumValues: ["incident", "service_request", "question", "access_request", "other"],
    validation: (value: string) =>
      ["incident", "service_request", "question", "access_request", "other"].includes(value.toLowerCase()),
  },
  {
    name: "department",
    type: "string",
    required: true,
    description: "Department or team making the request",
    prompt: "What department or team are you from?",
    validation: (value: string) => value && value.length >= 2,
  },
  {
    name: "desired_resolution",
    type: "string",
    required: true,
    description: "Expected outcome or resolution the user is seeking",
    prompt: "What would a successful resolution look like for this request?",
    validation: (value: string) => value && value.length >= 10,
  },
];

/**
 * Type representing collected field values
 */
export interface CollectedFields {
  request_summary?: string;
  business_impact?: string;
  urgency?: UrgencyLevel;
  affected_users?: string;
  request_type?: RequestType;
  department?: string;
  desired_resolution?: string;
}

/**
 * Get required fields only
 */
export function getRequiredFields(): FieldDefinition[] {
  return UNIVERSAL_FIELDS.filter((field) => field.required);
}

/**
 * Get optional fields only
 */
export function getOptionalFields(): FieldDefinition[] {
  return UNIVERSAL_FIELDS.filter((field) => !field.required);
}

/**
 * Get field definition by name
 */
export function getFieldByName(name: string): FieldDefinition | undefined {
  return UNIVERSAL_FIELDS.find((field) => field.name === name);
}

/**
 * Validate a field value
 */
export function validateField(
  fieldName: string,
  value: any
): { valid: boolean; error?: string } {
  const field = getFieldByName(fieldName);

  if (!field) {
    return { valid: false, error: `Unknown field: ${fieldName}` };
  }

  // Check required
  if (field.required && (value === undefined || value === null || value === "")) {
    return { valid: false, error: `${field.name} is required` };
  }

  // Check enum values
  if (field.type === "enum" && field.enumValues) {
    if (!field.enumValues.includes(value?.toLowerCase())) {
      return {
        valid: false,
        error: `${field.name} must be one of: ${field.enumValues.join(", ")}`,
      };
    }
  }

  // Run custom validation
  if (field.validation && !field.validation(value)) {
    return { valid: false, error: `${field.name} validation failed` };
  }

  return { valid: true };
}