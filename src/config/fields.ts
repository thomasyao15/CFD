export type FieldType = "string" | "enum" | "multi-select";
export type CriticalityLevel = "nice to have" | "important to have" | "necessary to have" | "mission-critical to have" | "not sure";
export type RiskLevel = "Risk to a Single Team" | "Risk to Multiple Teams" | "Risk to Whole of Fund" | "not sure";
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
  },
  {
    name: "detailed_description",
    label: "Detailed Description",
    type: "string",
    required: true,
    description: "2-3 sentences describing the work including tools, timelines, current state, stakeholders, and details",
    prompt: "Please provide 2-3 sentences describing the work needed, including tools, timelines, current state, and stakeholders",
  },
  {
    name: "criticality",
    label: "Criticality",
    type: "enum",
    required: true,
    description: "Criticality to the business",
    prompt: "What's the criticality to the business? (nice to have, important to have, necessary to have, or mission-critical to have)",
    enumValues: ["nice to have", "important to have", "necessary to have", "mission-critical to have", "not sure"],
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
  },
  {
    name: "benefits",
    label: "Benefits",
    type: "string",
    required: true,
    description: "What is finally different and/or better because of this work",
    prompt: "What is finally different and/or better because of this work?",
  },
  {
    name: "demand_sponsor",
    label: "Demand Sponsor",
    type: "string",
    required: true,
    description: "Person sponsoring the work (team lead, department head, or requester)",
    prompt: "Who in the business is sponsoring this work? (team lead, department head, or yourself)",
  },
  {
    name: "risk",
    label: "Risk Level",
    type: "enum",
    required: true,
    description: "Level of risk this project addresses",
    prompt: "What level of risk does this address? (Risk to a Single Team, Risk to Multiple Teams, or Risk to Whole of Fund)",
    enumValues: ["Risk to a Single Team", "Risk to Multiple Teams", "Risk to Whole of Fund", "not sure"],
  },
  {
    name: "other_details",
    label: "Other Details",
    type: "string",
    required: false,
    description: "Any additional information not captured in other fields",
    prompt: "Is there anything else we should know? (pre-existing work, people involved, budget, etc.)",
  },
];

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
