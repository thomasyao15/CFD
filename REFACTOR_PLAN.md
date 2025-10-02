# Repository Refactoring Plan

## Table of Contents
- [Overview](#overview)
- [Current State Analysis](#current-state-analysis)
- [Best Practices Research](#best-practices-research)
- [Target Architecture](#target-architecture)
- [Detailed Refactoring Plan](#detailed-refactoring-plan)
- [Benefits](#benefits)
- [Migration Strategy](#migration-strategy)
- [How to Contribute](#how-to-contribute)

---

## Overview

This document outlines a comprehensive refactoring plan for the CFD (Consolidated Front Door) multi-agent system. The goal is to transform the current codebase into a more maintainable, scalable, and production-ready application following industry best practices for LangChain/LangGraph systems.

### Goals
- **Improve maintainability** through clear separation of concerns
- **Enhance scalability** by making it easy to add new agents and features
- **Increase code quality** by removing verbose comments and standardizing patterns
- **Enable testability** by separating pure functions from side effects
- **Follow best practices** for multi-agent LangGraph applications in 2025

### Non-Goals
- Changing the core supervisor architecture (it's already good!)
- Altering the business logic or agent behavior
- Rewriting in a different framework

---

## Current State Analysis

### What's Working Well ✅
- **Supervisor pattern**: Clean delegation to specialized agents
- **LangGraph usage**: Proper use of state management and conditional routing
- **Separation of agents**: Each agent has a clear purpose
- **Structured outputs**: Good use of Zod schemas for LLM responses

### Issues to Address ⚠️

#### 1. File Organization
```
Current: Everything in src/ root
- agent.ts (156 lines): Graph + routing + M365 integration
- state.ts (90 lines): Mixed with agent logic
- prompts/elicitationAgent.ts (120 lines): Too large
```

**Problem**: Hard to find code, mixed responsibilities, cognitive overload

#### 2. Mixed Concerns
- **Config files contain logic**: `fields.ts` has validation functions
- **Agents do formatting**: Logic scattered across files
- **Routing logic split**: Some in `agent.ts`, some in `checkCompletion.ts`
- **Schemas embedded**: Zod schemas inside agent files

**Problem**: Violates single responsibility principle, hard to test

#### 3. Code Quality
- **Verbose comments**: Long explanation blocks in implementation
- **Unused variables**: `elicitationAgent.ts:12` - unused `state`
- **Inconsistent patterns**: Error handling varies across agents
- **Debug logs**: console.log instead of structured logging

**Problem**: Noise obscures intent, maintenance burden

#### 4. Lack of Testing Infrastructure
- No test directory structure
- No unit tests for pure functions
- No integration tests for graph

**Problem**: Risky to make changes, hard to verify correctness

---

## Best Practices Research

Based on research into LangChain/LangGraph multi-agent systems in 2025, here are the key principles:

### 1. Architectural Patterns
- **Supervisor pattern** (our current approach) is recommended for most use cases
- Clear hierarchy: supervisor → specialized workers
- Centralized routing logic in graph definition

### 2. Code Organization
```
Recommended structure:
- src/core/          # Graph construction and state
- src/agents/        # Agent implementations only
- src/routing/       # All routing logic
- src/prompts/       # Prompt templates
- src/schemas/       # Zod schemas
- src/tools/         # External integrations
- src/config/        # Pure data only
- src/utils/         # Pure functions
```

**Rationale**: Separation of concerns makes code easier to navigate and maintain

### 3. Agent Design
- **Single responsibility**: Each agent does one thing well
- **Modularity**: Agents are independent, loosely coupled
- **Clear interfaces**: Well-defined inputs/outputs
- **Delegate to utils**: Agents orchestrate, utils do the work

**Rationale**: Easier to test, modify, and reason about

### 4. State Management
- Define state schema with TypedDict or Pydantic
- Use reducers for concurrent updates
- Keep state minimal - avoid state explosion

**Rationale**: Type safety, predictable updates, easier debugging

### 5. Prompt Engineering
- **Separate prompts from code**: Easier to iterate and version
- **Context engineering**: Provide only necessary context to each agent
- **Multi-stage prompting**: Break complex tasks into smaller prompts

**Rationale**: Prompts change frequently, shouldn't require code changes

### 6. Configuration Management
- **Separate config from code**: Use YAML/JSON files
- **Pure data**: Config files should not contain functions
- **Environment variables for secrets**: Never hardcode credentials

**Rationale**: Easy to modify without code changes, better security

### 7. Common Anti-Patterns to Avoid
- ❌ "Fat" agents with too many responsibilities
- ❌ Mixing data and logic in config files
- ❌ Routing logic scattered across files
- ❌ Verbose implementation comments
- ❌ State explosion with too many fields

**Rationale**: These patterns lead to maintenance nightmares

---

## Target Architecture

### Directory Structure

```
src/
├── core/                           # Core graph and state definitions
│   ├── state.ts                   # State schema only
│   ├── graph.ts                   # LangGraph construction
│   └── types.ts                   # Shared TypeScript types
│
├── agents/                         # Agent implementations (lean)
│   ├── supervisor.ts              # Route to appropriate agent
│   ├── chat.ts                    # General conversation
│   ├── elicitation.ts             # Gather request fields
│   ├── teamMatching.ts            # Identify appropriate team
│   ├── review.ts                  # Handle review phase
│   └── index.ts                   # Barrel export
│
├── routing/                        # Centralized routing logic
│   ├── supervisor.ts              # supervisorRouter function
│   ├── elicitation.ts             # elicitationRouter (completion check)
│   ├── review.ts                  # reviewRouter function
│   └── index.ts                   # Barrel export
│
├── prompts/                        # Modular prompt templates
│   ├── supervisor.ts
│   ├── chat.ts
│   ├── elicitation/
│   │   ├── base.ts               # Shared extraction rules
│   │   ├── first.ts              # First turn prompt
│   │   └── subsequent.ts         # Follow-up turns
│   ├── teamMatching.ts
│   ├── review.ts
│   └── index.ts
│
├── schemas/                        # Zod schemas (reusable)
│   ├── fieldExtraction.ts         # Field extraction schema
│   ├── reviewAction.ts            # Review action schema
│   ├── teamMatching.ts            # Team matching schema
│   └── index.ts
│
├── tools/                          # External integrations
│   ├── sharepoint.ts              # SharePoint API
│   └── index.ts
│
├── config/                         # Pure data configuration
│   ├── fields.ts                  # Field definitions (data only)
│   ├── teams.ts                   # Team definitions (data only)
│   └── index.ts
│
├── utils/                          # Pure utility functions
│   ├── validation.ts              # Field validation logic
│   ├── formatting.ts              # Field formatting utilities
│   ├── llm.ts                     # LLM factory (renamed from llmFactory)
│   ├── state.ts                   # State clearing utilities
│   ├── logger.ts                  # Structured logging (new)
│   └── index.ts
│
├── integrations/                   # Platform-specific code
│   ├── m365.ts                    # M365 Teams integration
│   └── index.ts
│
├── app.ts                          # Application setup and exports
└── index.ts                        # Entry point

tests/
├── unit/
│   ├── agents/
│   ├── routing/
│   └── utils/
├── integration/
│   └── graph.test.ts
└── fixtures/
    └── mockData.ts
```

### Principles

1. **Single Responsibility**: Each file has one clear purpose
2. **Separation of Concerns**: Related code grouped together
3. **Pure vs Impure**: Pure functions in utils/, side effects in agents/tools
4. **Easy Navigation**: Intuitive directory names, logical grouping
5. **Testability**: Clear boundaries make testing easier

---

## Detailed Refactoring Plan

### Phase 1: Directory Restructuring

**Goal**: Create new directory structure without breaking existing code

#### Actions:
1. Create new directories:
   ```bash
   mkdir -p src/{core,routing,schemas,integrations}
   mkdir -p src/prompts/elicitation
   mkdir -p tests/{unit/{agents,routing,utils},integration,fixtures}
   ```

2. Create placeholder index.ts barrel exports in each directory

**Why**: Establishes target structure, enables incremental migration

---

### Phase 2: Core Refactoring

#### 2.1 Split `agent.ts` (156 lines → ~40 lines each)

**Current State**: `agent.ts` contains:
- Graph construction (StateGraph, nodes, edges)
- Routing functions (3 different routers)
- M365 SDK integration (onConversationUpdate, onActivity)
- Debug logging
- Export of cfdAgent

**Target State**: Split into focused files

**Actions**:

**A. Extract to `core/graph.ts`**
```typescript
// Graph construction only
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { AgentState } from "./state";
import * as agents from "../agents";
import * as routers from "../routing";

export function buildGraph() {
  const checkpointer = new MemorySaver();

  return new StateGraph(AgentState)
    .addNode("supervisor", agents.supervisorAgent)
    .addNode("chatAgent", agents.chatAgent)
    // ... rest of graph construction
    .compile({ checkpointer });
}
```

**B. Extract to `routing/supervisor.ts`**
```typescript
// Routing logic only
import { END } from "@langchain/langgraph";
import { AgentStateType } from "../core/state";

export function supervisorRouter(state: AgentStateType): string {
  const nextAgent = state.next || "chatAgent";
  // ... routing logic
}
```

**C. Extract to `routing/elicitation.ts`** (from `checkCompletion.ts`)
```typescript
export function elicitationRouter(state: AgentStateType): string {
  const complete = areAllRequiredFieldsComplete(state.collectedFields);
  return complete ? "teamMatching" : END;
}
```

**D. Extract to `routing/review.ts`**
```typescript
export function reviewRouter(state: AgentStateType): string {
  if (state.mode === "ELICITATION") {
    return "elicitationAgent";
  }
  return END;
}
```

**E. Extract to `integrations/m365.ts`**
```typescript
// M365 Teams SDK integration
import { AgentApplicationBuilder, TurnContext } from "@microsoft/agents-hosting";
import { buildGraph } from "../core/graph";

export function createM365Agent() {
  const cfdAgent = new AgentApplicationBuilder().build();
  const graph = buildGraph();

  cfdAgent.onConversationUpdate("membersAdded", async (context: TurnContext) => {
    // ... welcome message
  });

  cfdAgent.onActivity(ActivityTypes.Message, async (context) => {
    // ... message handling
  });

  return cfdAgent;
}
```

**F. Keep in `app.ts`**
```typescript
// Application setup and exports only
import { createM365Agent } from "./integrations/m365";

export const cfdAgent = createM365Agent();
```

**Why**:
- Each file has single responsibility
- Easy to understand and modify
- Testable in isolation
- Clear separation of concerns

---

#### 2.2 Modularize Prompts

**Current State**: `prompts/elicitationAgent.ts` is 120 lines with:
- First turn prompt (50 lines)
- Subsequent turn prompt (55 lines)
- Router function (10 lines)
- Shared content duplicated

**Target State**: Split into focused files with shared base

**Actions**:

**A. Create `prompts/elicitation/base.ts`**
```typescript
// Shared extraction rules across all turns
export const EXTRACTION_RULES = `
1. Conservative extraction - Extract what user explicitly provided
2. Enum inference allowed - Infer from casual language
3. CRITICAL - Description field - NEVER assume, must come from user
// ... etc
`;

export const FIELD_BEHAVIORS = `
4. Title field - DO NOT ask, infer from context
5. Updates object - ONLY fill fields you want to update
// ... etc
`;
```

**B. Create `prompts/elicitation/first.ts`**
```typescript
import { EXTRACTION_RULES, FIELD_BEHAVIORS } from './base';
import { UNIVERSAL_FIELDS } from '../../config/fields';

export function getFirstTurnPrompt(): string {
  const fieldsList = UNIVERSAL_FIELDS
    .filter(f => f.name !== 'title')
    .map(f => `- **${f.label}**: ${f.prompt}`)
    .join('\n');

  return `**Role:**
You are gathering information to submit a change/demand request. FIRST time collecting.

**All Questions:**
${fieldsList}

${EXTRACTION_RULES}
${FIELD_BEHAVIORS}

**Response Template:**
[Acknowledge warmly]
I'll help you submit this request! Here's what I need:
${fieldsList}`;
}
```

**C. Create `prompts/elicitation/subsequent.ts`**
```typescript
import { EXTRACTION_RULES, FIELD_BEHAVIORS } from './base';
import { formatRemainingFields, formatCollectedFieldsSummary } from '../../utils/formatting';

export function getSubsequentTurnPrompt(state: AgentStateType): string {
  const remaining = formatRemainingFields(state.collectedFields);
  const collected = formatCollectedFieldsSummary(state.collectedFields);

  return `**Role:**
FOLLOW-UP turn - you've collected some information.

**Still Needed:**
${remaining}

**Collected:**
${collected}

${EXTRACTION_RULES}
${FIELD_BEHAVIORS}

**Response Style:**
Brief recap → Ask natural follow-ups → Be conversational`;
}
```

**D. Update `prompts/elicitationAgent.ts`**
```typescript
// Just the router
import { getFirstTurnPrompt } from './elicitation/first';
import { getSubsequentTurnPrompt } from './elicitation/subsequent';

export function getElicitationAgentPrompt(state: AgentStateType): string {
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;
  return isFirstEntry
    ? getFirstTurnPrompt()
    : getSubsequentTurnPrompt(state);
}
```

**Why**:
- Shared rules in one place (DRY principle)
- Each prompt file is focused and manageable
- Easy to iterate on specific turn types
- Reduces duplication

---

#### 2.3 Separate Schemas from Logic

**Current State**: Zod schemas embedded in agent files

**Target State**: Schemas in dedicated `schemas/` directory

**Actions**:

**A. Extract from `tools/fieldExtraction.ts` to `schemas/fieldExtraction.ts`**
```typescript
import { z } from "zod";

export const FieldExtractionSchema = z.object({
  updates: z.object({
    title: z.string().nullable(),
    detailed_description: z.string().nullable(),
    // ... rest of fields
  }),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
  followup_response: z.string(),
  user_wants_to_abandon: z.boolean(),
});

export type FieldExtraction = z.infer<typeof FieldExtractionSchema>;
```

**B. Extract from `agents/reviewAgent.ts` to `schemas/reviewAction.ts`**
```typescript
import { z } from "zod";

export const ReviewActionSchema = z.object({
  action_type: z.enum(["confirm", "modify", "abandon", "clarify"]),
  reasoning: z.string(),
  response_to_user: z.string(),
});

export type ReviewAction = z.infer<typeof ReviewActionSchema>;
```

**C. Extract from `agents/teamMatching.ts` to `schemas/teamMatching.ts`**
```typescript
import { z } from "zod";
import { getAllTeamIds } from "../config/teams";

export const TeamMatchingSchema = z.object({
  team_id: z.enum(getAllTeamIds() as [string, ...string[]]).nullable(),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});

export type TeamMatchingResult = z.infer<typeof TeamMatchingSchema>;
```

**D. Update agents to import schemas**
```typescript
// In reviewAgent.ts
import { ReviewActionSchema } from "../schemas/reviewAction";

// In elicitationAgent.ts
import { FieldExtractionSchema } from "../schemas/fieldExtraction";

// etc.
```

**Why**:
- Schemas are reusable across the codebase
- Easy to find and modify type definitions
- Clear contract between components
- Can be used in tests independently

---

#### 2.4 Pure Configuration

**Current State**: Config files contain functions

**`config/fields.ts`**:
- Field definitions (data) ✓
- Validation functions (logic) ✗
- Helper functions (logic) ✗

**`config/teams.ts`**:
- Team definitions (data) ✓
- getTeamById() (logic) ✗
- getAllTeamIds() (logic) ✗

**Target State**: Config is pure data, logic moves to utils

**Actions**:

**A. Clean `config/fields.ts`**
```typescript
// Keep ONLY data definitions
export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  description: string;
  prompt: string;
  enumValues?: string[];
  examples?: string[];
}

export const UNIVERSAL_FIELDS: FieldDefinition[] = [
  // ... field definitions
];

// Remove: getRequiredFields(), getOptionalFields(), getFieldByName(), validateField()
```

**B. Move to `utils/validation.ts`**
```typescript
import { UNIVERSAL_FIELDS } from "../config/fields";

export function getRequiredFields(): FieldDefinition[] {
  return UNIVERSAL_FIELDS.filter(field => field.required);
}

export function getFieldByName(name: string): FieldDefinition | undefined {
  return UNIVERSAL_FIELDS.find(field => field.name === name);
}

export function validateField(
  fieldName: string,
  value: any
): { valid: boolean; error?: string } {
  // ... validation logic
}

export function isValidFieldValue(value: any): boolean {
  // ... validation logic
}
```

**C. Clean `config/teams.ts`**
```typescript
// Keep ONLY data definitions
export interface TeamDefinition {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  sharepoint_site_url: string;
  sharepoint_list_title: string;
}

export const TEAMS: TeamDefinition[] = [
  // ... team definitions
];

// Remove: getTeamById(), getAllTeamIds()
```

**D. Move to utils (or keep in schemas for team matching)**
```typescript
// In utils/teams.ts or schemas/teamMatching.ts
import { TEAMS } from "../config/teams";

export function getTeamById(teamId: string): TeamDefinition | undefined {
  return TEAMS.find(team => team.id === teamId);
}

export function getAllTeamIds(): string[] {
  return TEAMS.map(team => team.id);
}
```

**Why**:
- Configuration is pure data (easy to understand, modify, serialize)
- Logic is testable in isolation
- Clear separation between "what" (config) and "how" (utils)
- Can potentially move config to JSON/YAML in future

---

#### 2.5 Consolidate Utils

**Current State**: Utility functions scattered

**Target State**: All utils in dedicated files by category

**Actions**:

**A. Create `utils/formatting.ts`**
```typescript
// Move from tools/fieldExtraction.ts
import { CollectedFields, UNIVERSAL_FIELDS } from "../config/fields";
import { isValidFieldValue } from "./validation";

export function formatRemainingFields(
  collectedFields: Partial<CollectedFields>
): string {
  // ... formatting logic
}

export function formatCollectedFieldsSummary(
  collectedFields: Partial<CollectedFields>
): string {
  // ... formatting logic
}

export function formatCollectedFieldsForUser(
  collectedFields: Partial<CollectedFields>
): string {
  // ... formatting logic
}

export function calculateCompletionPercentage(
  collectedFields: Partial<CollectedFields>
): number {
  // ... calculation logic
}
```

**B. Create `utils/validation.ts`**
```typescript
// Consolidate all validation logic
import { CollectedFields, UNIVERSAL_FIELDS } from "../config/fields";

export function isValidFieldValue(value: any): boolean {
  // ... from fieldExtraction.ts
}

export function getMissingRequiredFields(
  collectedFields: Partial<CollectedFields>
): string[] {
  // ... from fieldExtraction.ts
}

export function areAllRequiredFieldsComplete(
  collectedFields: Partial<CollectedFields>
): boolean {
  // ... from fieldExtraction.ts
}

export function validateField(
  fieldName: string,
  value: any
): { valid: boolean; error?: string } {
  // ... from config/fields.ts
}
```

**C. Rename `utils/llmFactory.ts` → `utils/llm.ts`**
```typescript
// Simpler, clearer name
export { createLLM } from "./llm";
```

**D. Keep `utils/state.ts`** (already clean!)
```typescript
// No changes needed - already follows best practices
export { clearRequestContext, clearAll } from "./state";
```

**E. Create `utils/logger.ts`** (new)
```typescript
// Structured logging to replace console.log
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export const logger = {
  debug: (message: string, meta?: any) => {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  },
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta || '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${message}`, meta || '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
};
```

**Why**:
- All similar functionality grouped together
- Easy to find and import utilities
- Testable in isolation
- Clear responsibility boundaries

---

### Phase 3: Code Quality Improvements

#### 3.1 Remove Verbose Comments

**Guideline**: Keep "why", remove "what"

**Good Comments** (Keep):
```typescript
// CRITICAL: Must manually merge because state reducers use replacement semantics
return {
  messages: [new AIMessage(extraction.followup_response)],
  collectedFields: { ...state.collectedFields, ...nonNullUpdates },
};
```

**Bad Comments** (Remove):
```typescript
// ============================================================================
// PHASE 5: REVIEW & SUBMISSION
// Full review flow with confirm/modify/abandon/clarify actions
// ============================================================================

// Step 1: Classify user's action using structured output
const systemPrompt = getReviewAgentPrompt(state);
```

**Actions**:
1. Remove all section divider comments (====, ----, etc.)
2. Remove phase markers (PHASE 1, PHASE 2, etc.)
3. Remove implementation explanation comments
4. Remove step-by-step comments for obvious code
5. Keep JSDoc for public functions
6. Keep "why" comments for non-obvious decisions

**Before**:
```typescript
/**
 * ElicitationAgent - Simplified Single-Pass Implementation
 * Performs extraction + response generation in a single LLM call
 * Always analyzes full conversation history
 */
export async function elicitationAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  console.log(`[ElicitationAgent] ${isFirstEntry ? 'FIRST' : 'SUBSEQUENT'} turn - extracting fields`);

  const systemPrompt = getElicitationAgentPrompt(state);

  // Get the latest user message for focus guidance
  const lastMessage = state.messages[state.messages.length - 1];

  // Build messages for structured output extraction
  const extractionMessages = [
    new SystemMessage(systemPrompt),
    ...state.messages, // Always pass full conversation history
  ];

  // Add focus instruction for subsequent turns
  if (!isFirstEntry && lastMessage.getType() === "human") {
    extractionMessages.push(
      new SystemMessage(
        `Focus on extracting from the latest user message: "${lastMessage.content}"\n\nBut also consider the full conversation history for context. Update any errors in the collected fields as needed.`
      )
    );
  }
```

**After**:
```typescript
/**
 * Gathers required fields for request submission through conversational interaction.
 * Uses structured output to extract field values and generate natural responses.
 */
export async function elicitationAgent(
  state: AgentStateType
): Promise<Partial<AgentStateType>> {
  const llm = createLLM();
  const isFirstEntry = Object.keys(state.collectedFields).length === 0;

  logger.debug('ElicitationAgent', { turn: isFirstEntry ? 'first' : 'subsequent' });

  const systemPrompt = getElicitationAgentPrompt(state);
  const lastMessage = state.messages[state.messages.length - 1];

  const extractionMessages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  if (!isFirstEntry && lastMessage.getType() === "human") {
    extractionMessages.push(
      new SystemMessage(
        `Focus on: "${lastMessage.content}"\n\nConsider full history for context.`
      )
    );
  }
```

**Why**:
- Code is self-documenting with good naming
- Verbose comments become noise over time
- Easier to read and understand
- JSDoc provides API documentation where needed

---

#### 3.2 Fix Code Issues

**Issues to Address**:

**A. Unused variable** (`elicitationAgent.ts:12`)
```typescript
// Current (line 12):
import { AgentStateType } from "../state";

// In the function, 'state' is used but there's an unused import somewhere
// Fix: Remove unused imports after refactoring
```

**B. Standardize error messages**
```typescript
// Current: Inconsistent error messages
console.error("[ReviewAgent] Error during review:", error);
console.error("[TeamMatching] Error during team matching:", error);

// Target: Consistent structured logging
logger.error('Agent execution failed', {
  agent: 'ReviewAgent',
  phase: 'review',
  error
});
```

**C. Replace console.log with logger**
```typescript
// Replace all instances:
console.log(`[Supervisor] Mode: ${state.mode}`)
// With:
logger.info(`Supervisor routing`, { mode: state.mode, nextAgent })
```

**D. Add JSDoc to exported functions**
```typescript
/**
 * Routes to the appropriate agent based on supervisor's decision.
 * Handles END signal for clear context commands.
 *
 * @param state - Current agent state
 * @returns Agent name or END
 */
export function supervisorRouter(state: AgentStateType): string {
  // ...
}
```

---

#### 3.3 Improve Naming

**Renames**:

| Current | New | Reason |
|---------|-----|--------|
| `checkCompletion.ts` | `routing/elicitation.ts` | Clearer purpose |
| `llmFactory.ts` | `llm.ts` | Simpler, standard naming |
| `fieldExtraction.ts` | Split into `schemas/` + `utils/` | Separation of concerns |
| `routeToAgent` | `supervisorRouter` | Consistent naming |
| `routeAfterElicitation` | `elicitationRouter` | Consistent naming |
| `routeAfterReview` | `reviewRouter` | Consistent naming |

**Why**: Consistent, descriptive names improve code readability

---

### Phase 4: Testing Infrastructure

**Goal**: Enable confident refactoring and future development

**Actions**:

**A. Create test structure**
```bash
tests/
├── unit/
│   ├── agents/
│   │   ├── supervisor.test.ts
│   │   ├── elicitation.test.ts
│   │   └── review.test.ts
│   ├── routing/
│   │   ├── supervisor.test.ts
│   │   └── elicitation.test.ts
│   └── utils/
│       ├── validation.test.ts
│       └── formatting.test.ts
├── integration/
│   └── graph.test.ts
└── fixtures/
    └── mockData.ts
```

**B. Example unit test** (`tests/unit/utils/validation.test.ts`)
```typescript
import { describe, it, expect } from '@jest/globals';
import { isValidFieldValue, areAllRequiredFieldsComplete } from '../../../src/utils/validation';

describe('validation utils', () => {
  describe('isValidFieldValue', () => {
    it('returns false for null', () => {
      expect(isValidFieldValue(null)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidFieldValue('')).toBe(false);
    });

    it('returns true for valid string', () => {
      expect(isValidFieldValue('test')).toBe(true);
    });
  });

  describe('areAllRequiredFieldsComplete', () => {
    it('returns false when required fields missing', () => {
      const fields = { title: 'Test' };
      expect(areAllRequiredFieldsComplete(fields)).toBe(false);
    });

    it('returns true when all required fields present', () => {
      const fields = {
        title: 'Test',
        detailed_description: 'Description',
        criticality: 'important to have',
        // ... all required fields
      };
      expect(areAllRequiredFieldsComplete(fields)).toBe(true);
    });
  });
});
```

**C. Example integration test** (`tests/integration/graph.test.ts`)
```typescript
import { describe, it, expect } from '@jest/globals';
import { buildGraph } from '../../src/core/graph';
import { HumanMessage } from '@langchain/core/messages';

describe('Multi-agent graph', () => {
  it('routes to chat agent for general conversation', async () => {
    const graph = buildGraph();

    const result = await graph.invoke(
      { messages: [new HumanMessage('Hello')] },
      { configurable: { thread_id: 'test-1' } }
    );

    expect(result.next).toBe('chatAgent');
  });

  it('routes to elicitation agent for request intent', async () => {
    const graph = buildGraph();

    const result = await graph.invoke(
      { messages: [new HumanMessage('I need to submit a request')] },
      { configurable: { thread_id: 'test-2' } }
    );

    expect(result.mode).toBe('ELICITATION');
  });
});
```

**Why**:
- Confidence in refactoring
- Catch regressions early
- Document expected behavior
- Enable safe iterations

---

### Phase 5: Documentation

**Goal**: Comprehensive developer documentation

**Actions**:

**A. Add JSDoc to all public functions**
```typescript
/**
 * Creates a configured LLM instance based on environment settings.
 * Supports both OpenAI and Azure OpenAI providers.
 *
 * @param config - Optional LLM configuration
 * @param config.model - Model name (defaults to env LLM_MODEL or gpt-5-nano)
 * @param config.temperature - Sampling temperature (0-1)
 * @param config.maxTokens - Maximum tokens in response
 * @returns Configured chat model instance
 * @throws Error if required environment variables are missing
 *
 * @example
 * ```typescript
 * const llm = createLLM({ temperature: 0.7 });
 * const response = await llm.invoke([new HumanMessage('Hello')]);
 * ```
 */
export function createLLM(config: LLMConfig = {}): BaseChatModel {
  // ...
}
```

**B. Create `docs/` directory**
```
docs/
├── architecture.md          # System architecture overview
├── agents.md               # Agent responsibilities
├── routing.md              # Routing logic explanation
├── state-management.md     # State schema and updates
├── adding-an-agent.md      # How to add new agents
└── testing.md              # Testing guide
```

**C. Update README.md**
- Link to architecture docs
- Quick start guide
- Development workflow
- Testing instructions

**Why**: Enable new developers to contribute effectively

---

## Benefits

### Maintainability
- **Clear separation of concerns**: Each file has single responsibility
- **Easy to locate code**: Intuitive directory structure
- **Reduced cognitive load**: Smaller, focused files (~40 lines vs 120+)
- **Self-documenting**: Good naming, minimal comments

### Scalability
- **Easy to add agents**: Clear template in `agents/` directory
- **Easy to modify prompts**: Modular files in `prompts/`
- **Easy to add routing**: Centralized in `routing/` directory
- **Easy to add tools**: Dedicated `tools/` directory

### Code Quality
- **No verbose comments**: Code speaks for itself
- **Consistent patterns**: Standardized across codebase
- **Type safety**: Better TypeScript usage with schemas
- **Clean utils**: Pure functions, testable

### Testing
- **Easier to test**: Pure functions separated from side effects
- **Clear test structure**: Organized test directory
- **Mockable dependencies**: Clean interfaces
- **Fast unit tests**: No LLM calls in pure function tests

### Developer Experience
- **Faster onboarding**: Clear structure, good docs
- **Confident changes**: Tests catch regressions
- **Easy debugging**: Structured logging, clear flow
- **Enjoyable to work with**: Clean, organized code

---

## Migration Strategy

### Approach: Incremental, Non-Breaking

We'll refactor incrementally to minimize risk and maintain a working system throughout.

### Steps:

#### 1. Setup Phase (No Breaking Changes)
- Create new directory structure
- Add placeholder files with exports
- Set up testing infrastructure
- Add logger utility

#### 2. Extract Phase (Parallel Implementation)
- Copy code to new locations
- Refactor copied code
- Add tests for new code
- Keep old code working

#### 3. Integration Phase (Gradual Cutover)
- Update imports one file at a time
- Run tests after each change
- Verify functionality
- Fix any issues

#### 4. Cleanup Phase (Remove Old Code)
- Delete old files
- Remove unused imports
- Clean up any remaining issues
- Final test pass

#### 5. Documentation Phase
- Update all documentation
- Add JSDoc
- Create architecture guides
- Update README

### Safety Measures

1. **Version Control**: Commit after each phase
2. **Testing**: Run tests after each change
3. **Rollback Plan**: Can revert any step if needed
4. **Feature Flags**: Use if needed for gradual rollout

### Timeline Estimate

- Phase 1 (Setup): 2 hours
- Phase 2 (Extract): 8 hours
- Phase 3 (Integration): 4 hours
- Phase 4 (Cleanup): 2 hours
- Phase 5 (Documentation): 4 hours

**Total**: ~20 hours of focused work

---

## How to Contribute

### For This Refactoring

**Pick a task from the plan above:**

1. **Choose a phase** (recommend starting with Phase 1)
2. **Create a branch**: `git checkout -b refactor/phase-1-setup`
3. **Follow the plan** for that phase
4. **Add tests** for any new code
5. **Update this document** with progress
6. **Submit PR** with clear description

**Coordination**:
- Mark sections as "In Progress" with your name
- Update completion status
- Flag any blockers or changes to plan

### For Future Development

**After refactoring is complete:**

**Adding a New Agent**:
1. Create file in `src/agents/myAgent.ts`
2. Create prompt in `src/prompts/myAgent.ts`
3. Create schema in `src/schemas/myAgent.ts` (if needed)
4. Add node to graph in `src/core/graph.ts`
5. Add routing logic in `src/routing/` (if needed)
6. Write tests in `tests/unit/agents/myAgent.test.ts`

**Modifying Prompts**:
1. Find prompt file in `src/prompts/`
2. Edit prompt text
3. Test changes with LangSmith
4. No code changes needed!

**Adding Config**:
1. Add to `src/config/fields.ts` or `teams.ts`
2. Add validation to `src/utils/validation.ts` (if needed)
3. Add formatting to `src/utils/formatting.ts` (if needed)

---

## Progress Tracking

### Phase 1: Directory Restructuring
- [ ] Create core/ directory
- [ ] Create routing/ directory
- [ ] Create schemas/ directory
- [ ] Create integrations/ directory
- [ ] Create prompts/elicitation/ subdirectory
- [ ] Create tests/ structure
- [ ] Add placeholder index.ts files

### Phase 2: Core Refactoring
- [ ] 2.1: Split agent.ts
  - [ ] Extract to core/graph.ts
  - [ ] Extract to routing/supervisor.ts
  - [ ] Extract to routing/elicitation.ts
  - [ ] Extract to routing/review.ts
  - [ ] Extract to integrations/m365.ts
  - [ ] Update app.ts
- [ ] 2.2: Modularize prompts
  - [ ] Create prompts/elicitation/base.ts
  - [ ] Create prompts/elicitation/first.ts
  - [ ] Create prompts/elicitation/subsequent.ts
  - [ ] Update prompts/elicitationAgent.ts
- [ ] 2.3: Separate schemas
  - [ ] Create schemas/fieldExtraction.ts
  - [ ] Create schemas/reviewAction.ts
  - [ ] Create schemas/teamMatching.ts
  - [ ] Update agent imports
- [ ] 2.4: Pure configuration
  - [ ] Clean config/fields.ts
  - [ ] Clean config/teams.ts
  - [ ] Move logic to utils/validation.ts
- [ ] 2.5: Consolidate utils
  - [ ] Create utils/formatting.ts
  - [ ] Create utils/validation.ts
  - [ ] Rename utils/llmFactory.ts → utils/llm.ts
  - [ ] Create utils/logger.ts

### Phase 3: Code Quality
- [ ] 3.1: Remove verbose comments
- [ ] 3.2: Fix code issues
  - [ ] Fix unused variables
  - [ ] Standardize error messages
  - [ ] Replace console.log
  - [ ] Add JSDoc
- [ ] 3.3: Improve naming

### Phase 4: Testing
- [ ] 4.1: Create test structure
- [ ] 4.2: Add unit tests for utils
- [ ] 4.3: Add unit tests for routing
- [ ] 4.4: Add integration tests for graph

### Phase 5: Documentation
- [ ] 5.1: Add JSDoc to all public functions
- [ ] 5.2: Create docs/ directory with guides
- [ ] 5.3: Update README.md
- [ ] 5.4: Create contribution guide

---

## Questions & Answers

**Q: Will this break existing functionality?**
A: No. We're refactoring without changing behavior. Tests ensure correctness.

**Q: How long will this take?**
A: Estimated 20 hours of focused work. Can be done incrementally.

**Q: Can I help?**
A: Yes! Pick a phase, create a branch, follow the plan, submit a PR.

**Q: Why not just rewrite from scratch?**
A: Current architecture is good! We're improving organization, not replacing logic.

**Q: What if we find issues with the plan?**
A: Update this document! This is a living guide.

**Q: How do we handle merge conflicts?**
A: Work on separate phases, communicate in PRs, rebase frequently.

**Q: What about the compiled lib/ folder?**
A: Ignore it - it's auto-generated from src/. Focus on src/ only.

---

## References

### Research Sources
- LangChain Multi-Agent Best Practices 2025
- LangGraph Documentation
- LangGraph Supervisor Pattern
- Multi-Agent System Architecture Patterns

### Related Documents
- `PRD.md` - Product requirements
- `IMPLEMENTATION_PLAN.md` - Original implementation plan
- `PROGRESS_DIAGRAM.md` - Progress tracking
- `README.md` - Project overview

---

**Last Updated**: 2025-10-03
**Status**: Ready to Begin
**Contributors**: Add your name when you contribute!
