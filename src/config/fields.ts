/**
 * AustralianSuper CFD Field Configuration
 * Centralized definition of all required and optional fields for demand/change requests
 */

export type FieldType = "string" | "enum" | "multi-select";
export type CriticalityLevel = "nice to have" | "important to have" | "necessary to have" | "mission-critical to have" | "not sure";
export type RiskLevel = "Risk to a Single Team" | "Risk to Multiple Teams" | "Risk to Whole of Fund" | "not sure";
export type DependencyOption =
  | "Funding approval"
  | "Resource availability"
  | "Technology readiness"
  | "Executive or stakeholder sign-off"
  | "Completion of another project or phase"
  | "Access to data or systems"
  | "Legal or regulatory clearance"
  | "Third-party deliverables"
  | "Training or capability building"
  | "Other";
export type StrategicPillar =
  | "Market leading net performance"
  | "Personalised guidance at scale"
  | "Trustworthy financial institution"
  | "Value at a competitive cost"
  | "Talent & Culture";

/**
 * Definition of a single field in the CFD system
 */
export interface FieldDefinition {
  /** Unique field identifier */
  name: string;
  /** User-friendly label for display */
  label: string;
  /** Data type of the field */
  type: FieldType;
  /** Whether this field must be collected */
  required: boolean;
  /** Description for internal reference */
  description: string;
  /** Question to ask user when collecting this field */
  prompt: string;
  /** For enum/multi-select types: valid values */
  enumValues?: string[];
  /** Example values to show user */
  examples?: string[];
  /** Optional validation function */
  validation?: (value: any) => boolean;
  /** Special extraction rule */
  extractionRule?: string;
}

/**
 * AustralianSuper CFD Fields
 * Fields for demand/change request submission (excludes auto-populated fields)
 */
export const UNIVERSAL_FIELDS: FieldDefinition[] = [
  {
    name: "title",
    label: "Title",
    type: "string",
    required: true,
    description: "Brief description of the work being requested (project title)",
    prompt: "What's a brief title for this work request?",
    examples: ["Automate monthly performance reporting", "Integrate Aladdin with WSO", "Build Power App for claims processing"],
    validation: (value: string) => value && value.length >= 5,
  },
  {
    name: "detailed_description",
    label: "Detailed Description",
    type: "string",
    required: true,
    description: "2-3 sentences describing the work including tools, timelines, current state, stakeholders, and details",
    prompt: "Please provide 2-3 sentences describing the work needed, including tools, timelines, current state, and stakeholders",
    examples: [
      "We need to automate the monthly performance attribution reporting currently done manually in Excel. This involves integrating PowerBI with our Pearl system and should be completed by Q2. The Finance team will be the primary stakeholders.",
    ],
    validation: (value: string) => value && value.length >= 20,
  },
  {
    name: "criticality",
    label: "Criticality",
    type: "enum",
    required: true,
    description: "Criticality to the business",
    prompt: "What's the criticality to the business? (nice to have, important to have, necessary to have, or mission-critical to have)",
    enumValues: ["nice to have", "important to have", "necessary to have", "mission-critical to have", "not sure"],
    extractionRule: "ONLY extract if user explicitly provides one of these exact values. Use 'not sure' if user doesn't know.",
    validation: (value: string) =>
      ["nice to have", "important to have", "necessary to have", "mission-critical to have", "not sure"].includes(value.toLowerCase()),
  },
  {
    name: "dependencies",
    label: "Dependencies",
    type: "multi-select",
    required: false,
    description: "Dependencies that must be resolved before work can proceed",
    prompt: "Are there any dependencies? For example: funding approval, resource availability, technology readiness, or other blockers?",
    enumValues: [
      "Funding approval",
      "Resource availability",
      "Technology readiness",
      "Executive or stakeholder sign-off",
      "Completion of another project or phase",
      "Access to data or systems",
      "Legal or regulatory clearance",
      "Third-party deliverables",
      "Training or capability building",
      "Other",
    ],
    examples: ["Funding approval", "Resource availability", "Technology readiness"],
    extractionRule: "Suggest 2-3 common examples, don't show full list unless requested",
  },
  {
    name: "strategic_alignment",
    label: "Strategic Alignment",
    type: "multi-select",
    required: true,
    description: "Alignment with AustralianSuper's 2035 strategic pillars",
    prompt: "Which of AustralianSuper's strategic priorities does this support?",
    enumValues: [
      "Market leading net performance",
      "Personalised guidance at scale",
      "Trustworthy financial institution",
      "Value at a competitive cost",
      "Talent & Culture",
    ],
    extractionRule: "Use leading questions to elicit alignment if not explicitly stated. Strategic pillars: (1) Market leading net performance - delivering superior investment returns, (2) Personalised guidance at scale - tailored member experiences, (3) Trustworthy financial institution - security, compliance, and member confidence, (4) Value at a competitive cost - operational efficiency and cost-effectiveness, (5) Talent & Culture - workforce development and organizational capability",
  },
  {
    name: "benefits",
    label: "Benefits",
    type: "string",
    required: true,
    description: "What is finally different and/or better because of this work",
    prompt: "What is finally different and/or better because of this work?",
    examples: [
      "Reduces manual reporting time by 80%",
      "Eliminates reconciliation errors",
      "Improves member experience through faster claims processing",
    ],
    validation: (value: string) => value && value.length >= 10,
  },
  {
    name: "demand_sponsor",
    label: "Demand Sponsor",
    type: "string",
    required: true,
    description: "Person sponsoring the work (team lead, department head, or requester)",
    prompt: "Who in the business is sponsoring this work? (team lead, department head, or yourself)",
    examples: ["Jane Smith (Investment Operations Lead)", "John Doe (Head of Technology)", "Myself"],
    validation: (value: string) => value && value.length >= 2,
  },
  {
    name: "risk",
    label: "Risk Level",
    type: "enum",
    required: true,
    description: "Level of risk this project addresses",
    prompt: "What level of risk does this address? (Risk to a Single Team, Risk to Multiple Teams, or Risk to Whole of Fund)",
    enumValues: ["Risk to a Single Team", "Risk to Multiple Teams", "Risk to Whole of Fund", "not sure"],
    extractionRule: "ONLY extract if user explicitly provides one of these exact values. Use 'not sure' if user doesn't know.",
    validation: (value: string) =>
      ["Risk to a Single Team", "Risk to Multiple Teams", "Risk to Whole of Fund", "not sure"].includes(value),
  },
  {
    name: "other_details",
    label: "Other Details",
    type: "string",
    required: false,
    description: "Any additional information not captured in other fields",
    prompt: "Is there anything else we should know? (pre-existing work, people involved, budget, etc.)",
    extractionRule: "ALWAYS prompt for this field. Accept any input without validation",
  },
];

/**
 * Type representing collected field values
 */
export interface CollectedFields {
  title?: string;
  detailed_description?: string;
  criticality?: CriticalityLevel;
  dependencies?: string; // Comma-separated or JSON array
  strategic_alignment?: string; // Comma-separated or JSON array
  benefits?: string;
  demand_sponsor?: string;
  risk?: RiskLevel;
  other_details?: string;
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