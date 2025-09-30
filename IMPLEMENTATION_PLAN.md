# Implementation Plan: Consolidated Front Door (CFD) Agent

## Executive Summary

This document outlines the architecture, design decisions, and incremental development strategy for the CFD Agent. The architecture is based on extensive research of LangChain/LangGraph patterns (2024-2025), OpenAI GPT-5 best practices, and production agentic system designs.

**Core Architecture**: LangGraph multi-agent supervisor pattern with 3 agents
**Technology Stack**: LangChain, LangGraph, OpenAI GPT-5, SharePoint API
**Development Approach**: 6-phase incremental development with comprehensive testing
**Testing Framework**: LangSmith for tracing, evaluation, and monitoring

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Design Decisions](#key-design-decisions)
3. [Component Design](#component-design)
4. [State Management](#state-management)
5. [Incremental Development Plan](#incremental-development-plan)
6. [Testing Strategy](#testing-strategy)
7. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
8. [Technology Stack Details](#technology-stack-details)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│              (Teams / M365 Copilot)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 SupervisorAgent                          │
│          (State Machine & Router)                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Routing Logic:                                  │   │
│  │  - Analyze current state.mode                    │   │
│  │  - Analyze user intent                           │   │
│  │  - Route to appropriate worker                   │   │
│  └─────────────────────────────────────────────────┘   │
└──────────┬────────────────────────────┬─────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────┐
│    ChatAgent         │    │  ElicitationAgent        │
│  (General Convo)     │    │  (Requirements Gather)   │
│                      │    │                          │
│  - Chit-chat         │    │  - Ask questions         │
│  - Detect problems   │    │  - Extract field data    │
│  - Offer routing     │    │  - Track completeness    │
│  - Answer questions  │    │  - Handle interruptions  │
└──────────────────────┘    └────────┬─────────────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │  TeamMatcherTool   │
                            │  (Deterministic)   │
                            │                    │
                            │  Input: Fields     │
                            │  Output: Team ID   │
                            └────────┬───────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │ SharePointTool     │
                            │ (Submission)       │
                            │                    │
                            │ Creates request    │
                            │ Returns link       │
                            └────────────────────┘
```

### Why This Architecture?

**LangGraph Multi-Agent Supervisor Pattern** (vs alternatives):
- ✅ **Clear separation of concerns**: Each agent has a single, well-defined responsibility
- ✅ **Explicit state management**: TypedDict-based state eliminates non-determinism in critical logic
- ✅ **Cyclical flow support**: Native support for requirements elicitation loops
- ✅ **Interrupt handling**: Built-in human-in-the-loop capabilities for side questions
- ✅ **Debuggability**: LangSmith tracing shows full execution path
- ✅ **Extensibility**: Easy to add new specialized agents (e.g., TechnicalSupportAgent) without refactoring
- ✅ **Industry-validated**: Pattern recommended by LangChain, used in production systems (Feb 2025 langgraph-supervisor library)

**Rejected Alternatives:**
- ❌ **Single LLM-driven agent**: Too unpredictable for structured requirements gathering
- ❌ **Pure LangChain sequential chains**: Cannot handle cyclical flows or mode switching
- ❌ **4+ agent architecture**: Over-engineered; adds complexity without benefit

---

## Key Design Decisions

### 1. Three Agents Only

**Decision**: Use exactly 3 agents: Supervisor, ChatAgent, ElicitationAgent

**Rationale**:
- **Supervisor**: Necessary for state machine routing and orchestration
- **ChatAgent**: Isolates general conversation logic from task-oriented logic
- **ElicitationAgent**: Focused solely on structured data collection

**Why not more agents?**
- Team matching doesn't need conversational ability → Tool
- SharePoint submission is deterministic → Tool
- Adding agents increases complexity without improving capability

### 2. Team Matching as Tool (Not Agent)

**Decision**: Implement team matching as a Tool function, not a conversational agent

**Rationale**:
- **No conversation needed**: Team matching is a deterministic/semi-deterministic function
- **Input**: Structured data (`fields_collected`)
- **Output**: Team ID
- **Testability**: Standard unit testing with input/output pairs
- **Performance**: No LLM call overhead for deterministic logic
- **Maintainability**: Simple Python function or vector search, not complex prompt engineering

**Implementation Options**:
1. Rule-based matching (if/else logic)
2. Vector similarity search against team descriptions
3. Lightweight classifier model
4. API call to existing team routing service

### 3. Explicit Field-by-Field State Tracking

**Decision**: Track each required field explicitly in state, not relying on LLM to decide "completeness"

**Rationale**:
- **Reliability**: LLMs are not reliable state trackers for business-critical logic
- **Determinism**: Field completeness check is a simple programmatic operation
- **Auditability**: Clear visibility into what's been collected vs. what's missing

**Hybrid Approach**:
- **State is truth**: TypedDict contains `required_fields: List[str]` and `collected_fields: Dict[str, Any]`
- **LLM is interface**: ElicitationAgent uses natural language to extract values
- **Flexibility maintained**: LLM can extract multiple fields from single user utterance

### 4. Balance: Rigid Control Points + Flexible Conversation

**Decision**: Use state machine for structure, LLM for conversation

**Rigid (State Machine Controlled)**:
- ✅ Mode transitions (Chat → Elicitation → Review → Submit)
- ✅ All required fields must be collected before team matching
- ✅ User confirmation required before SharePoint submission
- ✅ Completeness validation logic

**Flexible (LLM-Driven)**:
- ✅ Question ordering during elicitation (agent decides optimal sequence)
- ✅ Handling interruptions and side questions
- ✅ Natural language understanding and extraction
- ✅ Conversational tone and empathy

**Why This Balance?**
- Prevents over-engineering while ensuring reliability
- Leverages LLM strengths (language) and avoids weaknesses (state tracking)
- User experience feels natural, not robotic
- Business logic remains predictable and testable

### 5. Markdown-Structured System Prompts

**Decision**: Use OpenAI's recommended Markdown and JSON structure for all prompts

**Rationale**:
- GPT-5 is optimized for Markdown and natural language formatting
- Clear separation of instructions, data, examples, and context using Markdown sections
- Supports advanced patterns (chain of thought with "Let's think step by step")
- JSON mode for structured outputs when needed

**Example Structure** (see Component Design section for full templates):
```markdown
**Role:**
Define agent persona and responsibility

**Instructions:**
1. Step-by-step task guidance
2. Clear numbered or bulleted lists

**Context:**
```json
{
  "relevant_state": "...",
  "history": "..."
}
```

**Reasoning:**
Let's think step by step about the best approach...

**Response:**
Final response to user
```

---

## Component Design

### SupervisorAgent

**Responsibility**: Orchestrate conversation flow by routing to appropriate worker agents

**System Prompt Template**:
```markdown
**Role:**
You are the supervisor of a multi-agent system designed to help users submit requests to internal teams.
Your job is to analyze the current conversation state and user intent, then delegate to the appropriate specialized agent.

**Instructions:**
1. Review the current state below to understand the current mode and what has been accomplished.
2. Analyze the latest user message to determine intent.
3. Apply routing logic:
   - If mode is CHAT and user mentions a problem → suggest elicitation mode
   - If mode is ELICITATION and all fields collected → proceed to team matching
   - If mode is REVIEW and user confirms → submit to SharePoint
   - If user asks side question during elicitation → route to ChatAgent
4. Return the next agent to invoke: "ChatAgent" or "ElicitationAgent"

**Current State:**
```json
{{SERIALIZED_STATE}}
```

**Latest User Message:**
"{{LATEST_MESSAGE}}"

**Routing Logic:**
- CHAT mode + problem detected → Offer ElicitationAgent
- ELICITATION mode + fields incomplete → ElicitationAgent
- ELICITATION mode + fields complete → TeamMatcherTool → REVIEW mode
- REVIEW mode → ChatAgent (for confirmation dialogue)
- Side question detected → ChatAgent (preserve elicitation state)
```

**Key Features**:
- Stateless on each turn (state passed in prompt)
- Makes routing decision based on mode + intent
- Can interrupt elicitation flow to answer questions
- Transparent routing logic for debugging

**GPT-5 Configuration Example**:
```python
response = client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "system", "content": supervisor_prompt}],
    reasoning_effort="medium",  # Enhanced reasoning for routing decisions
    tools=[
        {"type": "function", "function": route_to_chat_agent_schema},
        {"type": "function", "function": route_to_elicitation_agent_schema}
    ]
)
```

---

### ChatAgent

**Responsibility**: Handle general conversation, detect problems, assess intent confidence for automatic elicitation

**System Prompt Template**:
```markdown
**Role:**
You are a friendly, helpful assistant for internal employees.
You can chat about anything, answer general questions, and help users when they have work-related problems.
When you detect a user has HIGH CONFIDENCE intent to submit a request, you automatically begin gathering information.

**Instructions:**
1. Engage naturally with the user based on their message.
2. Continuously assess user intent for request submission:

   **HIGH CONFIDENCE signals** (auto-transition to elicitation):
   - Explicit: "I need to submit a request", "create a ticket", "I want to report an issue"
   - Detailed problem with urgency indicators
   - Questions like "which team handles X?" or "who do I contact about Y?"
   - User provides multiple problem details unprompted

   **LOW CONFIDENCE signals** (stay in chat):
   - Casual mention without detail
   - Venting or expressing frustration without action intent
   - Hypothetical or exploratory questions
   - General discussion about problems

3. If HIGH CONFIDENCE detected:
   - DO NOT ask permission
   - Smoothly transition: "Let me help you get this to the right team. Can you tell me more about [relevant field]?"
   - Signal to supervisor: mode=ELICITATION

4. If LOW CONFIDENCE:
   - Continue natural conversation
   - Answer their question
   - Wait for clearer intent signals

5. When answering side questions during elicitation, be brief and return context to the request.

**Conversation History:**
```json
{{MESSAGES}}
```

**Current Mode:**
{{STATE.mode}}

**Intent Assessment:**
Let's think step by step about the user's intent confidence level: LOW, MEDIUM, or HIGH.
If HIGH, signal mode transition. If LOW/MEDIUM, continue chat naturally.

**Tone:**
Friendly, professional, helpful. Brief responses (2-3 sentences typical).
Transitions should feel seamless, not robotic or forced.
```

**Key Features**:
- Intent confidence assessment (high/medium/low)
- Automatic transition to elicitation (no permission prompt)
- Handles ambiguous cases by staying in chat mode
- Smooth conversational transitions
- Maintains conversational tone

---

### ElicitationAgent

**Responsibility**: Collect all universal front door fields through conversational questioning

**System Prompt Template**:
```markdown
**Role:**
You are a specialized assistant responsible for gathering specific information for a service request.
Your goal is to fill all required fields in the schema below through natural conversation.
You must be polite, clear, and efficient. Only ask for information that is still missing.

**Instructions:**
1. Review the conversation history and collected fields below to understand context.
2. Identify the next missing field from the required fields schema.
3. Ask a clear, specific question to obtain that information.
4. If the user provides multiple pieces of information at once, extract and acknowledge all of them.
5. If the user says "I don't know", mark that field as unknown and move to the next field.
6. If the user asks a side question, answer briefly and return to elicitation.
7. Once all fields are collected, signal completion to supervisor.

**Conversation History:**
```json
{{MESSAGES}}
```

**Collected Fields:**
```json
{{STATE.collected_fields}}
```

**Required Fields Schema:**
```json
{
  "request_summary": {
    "type": "string",
    "required": true,
    "description": "Brief description of the request (1-2 sentences)"
  },
  "business_impact": {
    "type": "string",
    "required": true,
    "description": "How this affects business operations or goals"
  },
  "urgency": {
    "type": "enum",
    "values": ["low", "medium", "high", "critical"],
    "required": true,
    "description": "Timeline sensitivity"
  },
  "affected_users": {
    "type": "string",
    "required": false,
    "description": "Who is impacted by this issue"
  }
}
```

**Extraction Guidelines:**
- Extract data into JSON format matching the schema
- Use tool calls to update collected_fields in state
- Be flexible with question ordering based on conversation flow
- Infer field values when possible from context
- Confirm extracted data with user if ambiguous

**Reasoning:**
Let's think step by step about what fields are still missing and what question to ask next...

**Response:**
[Clear, specific question to user]
```

**Key Features**:
- Schema-driven (fields defined in state/config, not hardcoded in prompt)
- Flexible question ordering
- Multi-field extraction from single utterance
- Handles "I don't know" responses
- Chain of thought reasoning (using "Let's think step by step" pattern)

**Tool Access**:
- `update_field(field_name: str, value: Any)`: Updates state with extracted information
- `mark_field_unknown(field_name: str)`: Marks field as "user doesn't know"

**GPT-5 Configuration Example**:
```python
response = client.chat.completions.create(
    model="gpt-5",
    messages=[{"role": "system", "content": elicitation_prompt}],
    reasoning_effort="low",  # Simple extraction tasks don't need high reasoning
    tools=[
        {"type": "function", "function": update_field_schema},
        {"type": "function", "function": mark_field_unknown_schema}
    ],
    tool_choice="auto"  # Let model decide when to call tools
)
```

---

### TeamMatcherTool

**Responsibility**: Identify the correct team based on collected field data

**Function Signature**:
```python
def match_team(collected_fields: Dict[str, Any], team_database: List[Team]) -> Optional[str]:
    """
    Determines the best team to handle the request.

    Args:
        collected_fields: All user-provided information
        team_database: List of teams with descriptions, responsibilities, and SharePoint URLs

    Returns:
        team_id: Identifier for matched team, or None if no match found
    """
```

**Implementation Options** (choose based on complexity):

1. **Rule-Based Matching** (simplest, for POC):
```python
if "authentication" in collected_fields["request_summary"].lower():
    return "identity_team"
elif "performance" in collected_fields["request_summary"].lower():
    return "performance_team"
# ... more rules
```

2. **Semantic Search** (recommended for production):
```python
# Embed request context
request_embedding = embed_text(
    f"{collected_fields['request_summary']} {collected_fields['business_impact']}"
)

# Find most similar team
similarities = [
    cosine_similarity(request_embedding, team.description_embedding)
    for team in team_database
]
best_match_idx = np.argmax(similarities)

if similarities[best_match_idx] > THRESHOLD:
    return team_database[best_match_idx].id
else:
    return None  # No confident match
```

3. **LLM Classification** (fallback for ambiguous cases):
```python
# Use structured output for reliability
response = client.chat.completions.create(
    model="gpt-5",
    messages=[{
        "role": "user",
        "content": f"""
        **Request Data:**
        ```json
        {collected_fields}
        ```

        **Available Teams:**
        ```json
        {team_database}
        ```

        Which team should handle this request? Respond with team_id only.
        """
    }],
    response_format={"type": "json_object"}
)
```

**Testing**:
- Unit tests with fixtures: `assert match_team(sample_auth_request) == "identity_team"`
- Edge cases: ambiguous requests, out-of-scope requests
- Performance benchmarks

---

### SharePointTool

**Responsibility**: Submit request to team's SharePoint list and return item link

**Function Signature**:
```python
def submit_to_sharepoint(
    team_id: str,
    fields: Dict[str, Any],
    sharepoint_config: Dict[str, str]
) -> Dict[str, Any]:
    """
    Creates item in team's SharePoint list.

    Args:
        team_id: Target team identifier
        fields: Universal front door fields to submit
        sharepoint_config: URLs and auth for SharePoint API

    Returns:
        {
            "success": bool,
            "item_url": str,  # Link to created request
            "item_id": str,
            "error": Optional[str]
        }
    """
```

**Implementation**:
```python
# Map team_id to SharePoint list URL
list_url = sharepoint_config["teams"][team_id]["list_url"]

# Map universal fields to SharePoint column names
payload = {
    "Title": fields["request_summary"],
    "BusinessImpact": fields["business_impact"],
    "Urgency": fields["urgency"],
    # ... additional mappings
}

# Submit via SharePoint REST API
response = requests.post(
    f"{list_url}/items",
    headers={"Authorization": f"Bearer {access_token}"},
    json=payload
)

if response.status_code == 201:
    item_data = response.json()
    return {
        "success": True,
        "item_url": item_data["webUrl"],
        "item_id": item_data["id"]
    }
else:
    return {
        "success": False,
        "error": response.text
    }
```

**Error Handling**:
- Network failures: Retry with exponential backoff
- Auth failures: Prompt user or return helpful error
- Validation errors: Show user which fields need correction

---

## State Management

### State Schema

```python
from typing import TypedDict, List, Dict, Any, Optional, Literal

class UniversalFrontDoorFields(TypedDict):
    """Universal fields required by all teams"""
    request_summary: Optional[str]
    business_impact: Optional[str]
    urgency: Optional[Literal["low", "medium", "high", "critical"]]
    affected_users: Optional[str]
    requester_contact: Optional[str]
    # ... additional universal fields
    # To be populated based on actual front door requirements

class AgentState(TypedDict):
    """Shared state across all agents"""

    # Conversation tracking
    messages: List[Dict[str, str]]  # [{role: "user|assistant", content: "..."}]

    # Mode tracking
    mode: Literal[
        "CHAT",          # General conversation
        "ELICITATION",   # Gathering requirements
        "TEAM_MATCHING", # Identifying team (transient)
        "REVIEW",        # User reviewing extracted data
        "SUBMITTING",    # Submitting to SharePoint (transient)
        "COMPLETE"       # Request submitted successfully
    ]

    # Requirements elicitation
    collected_fields: UniversalFrontDoorFields
    required_field_names: List[str]  # Fields that must be collected
    fields_marked_unknown: List[str]  # Fields user doesn't know

    # Team matching
    identified_team: Optional[str]  # Team ID after matching
    identified_team_name: Optional[str]  # Team display name

    # Submission tracking
    sharepoint_item_url: Optional[str]
    submission_error: Optional[str]
```

### State Transitions

```
START
  ↓
CHAT ←──────────────────────────┐
  ↓                              │
  ├→ (user has problem?)         │
  │   → Ask permission           │
  │   → If yes: ELICITATION      │
  │   → If no: stay in CHAT      │
  ↓                              │
ELICITATION                      │
  ↓                              │
  ├→ (side question?) ──→ CHAT ─┘
  ├→ (all fields collected?)
  │   → Yes: TEAM_MATCHING
  │   → No: continue elicitation
  ↓
TEAM_MATCHING (transient)
  ↓
  ├→ (team found?)
  │   → Yes: REVIEW
  │   → No: CHAT (inform no match)
  ↓
REVIEW
  ↓
  ├→ (user confirms?)
  │   → Yes: SUBMITTING
  │   → No: ELICITATION (for corrections)
  ↓
SUBMITTING (transient)
  ↓
  ├→ (submission success?)
  │   → Yes: COMPLETE
  │   → No: REVIEW (show error)
  ↓
COMPLETE
  ↓
CHAT (can start new request)
```

### State Management Principles

1. **Minimal State**: Only store what's necessary for routing and data passing
2. **Immutability**: Each agent returns a new state, not mutating in place
3. **Single Source of Truth**: State object is authoritative, not LLM memory
4. **Serializable**: All state values are JSON-serializable for persistence
5. **Observable**: LangSmith can trace full state evolution

---

## Incremental Development Plan

### Overview

The agent will be built in 6 phases, each adding complexity incrementally. Each phase is testable independently, reducing risk and debugging time.

### Phase 1: Basic Chat Agent (Baseline)

**Goal**: Establish baseline conversational ability

**Scope**:
- Single ChatAgent (no supervisor yet)
- Handles general questions, greetings, small talk
- No request routing, no elicitation
- Simple state: just messages

**Implementation**:
```python
# Simple graph with one node
from langgraph.graph import StateGraph

workflow = StateGraph(BasicState)
workflow.add_node("chat", chat_agent)
workflow.set_entry_point("chat")
workflow.set_finish_point("chat")

app = workflow.compile()
```

**Testing**:
- Manual conversation testing
- LangSmith traces for latency and token usage
- Human eval: tone, helpfulness, coherence

**Success Criteria**:
- ✅ Agent responds naturally to greetings
- ✅ Agent can answer general questions
- ✅ Conversations feel human-like
- ✅ Latency < 2 seconds per turn

**Estimated Duration**: 2-3 days

---

### Phase 2: Supervisor + Mode Routing

**Goal**: Implement supervisor pattern and mode switching

**Scope**:
- Add SupervisorAgent
- Add ElicitationAgent (stub that just echoes)
- Implement routing logic: CHAT ↔ ELICITATION
- ChatAgent detects problems, assesses intent confidence, and signals automatic transition to elicitation when confidence is high
- State includes `mode` field and `intent_confidence` signal

**Implementation**:
```python
# Supervisor routing function
def route_to_agent(state: AgentState) -> str:
    if state["mode"] == "CHAT":
        return "chat_agent"
    elif state["mode"] == "ELICITATION":
        return "elicitation_agent"
    else:
        return "chat_agent"  # fallback

# Graph with supervisor
workflow = StateGraph(AgentState)
workflow.add_node("supervisor", supervisor_agent)
workflow.add_node("chat_agent", chat_agent)
workflow.add_node("elicitation_agent", elicitation_agent_stub)

workflow.set_entry_point("supervisor")
workflow.add_conditional_edges(
    "supervisor",
    route_to_agent,
    {
        "chat_agent": "chat_agent",
        "elicitation_agent": "elicitation_agent"
    }
)

# Both agents loop back to supervisor
workflow.add_edge("chat_agent", "supervisor")
workflow.add_edge("elicitation_agent", "supervisor")

app = workflow.compile()
```

**Testing**:
- **Intent Confidence Dataset**: 50+ utterances labeled with expected confidence + mode
  - "Hi there" → CHAT (no transition)
  - "My app is slow" → CHAT initially, then assess
  - "I need to submit a request about login issues" → HIGH confidence → ELICITATION
  - "Which team handles performance problems?" → HIGH confidence → ELICITATION
  - "Just venting - everything is slow today" → LOW confidence → CHAT
- LangSmith evaluator: intent classification accuracy and mode transition appropriateness
- Manual testing: transitions feel seamless and natural (not forced)
- **GPT-5 Optimization**: Experiment with `reasoning_effort` settings (low/medium/high) to balance accuracy vs. latency for supervisor routing decisions

**Success Criteria**:
- ✅ Supervisor correctly routes to ChatAgent vs ElicitationAgent
- ✅ ChatAgent accurately assesses intent confidence (high/low)
- ✅ Automatic transitions happen smoothly when appropriate
- ✅ False positive rate < 10% (doesn't force elicitation when user just chatting)
- ✅ Intent accuracy > 85% on test dataset

**Estimated Duration**: 3-4 days

---

### Phase 3: Requirements Elicitation Loop

**Goal**: Implement full cyclical requirements gathering

**Sub-Phase 3a**: Single Field Elicitation
- ElicitationAgent asks for ONE field (e.g., "request_summary")
- Extracts value using tool call
- Updates state
- Signals completion

**Sub-Phase 3b**: All Fields, Fixed Order
- ElicitationAgent iterates through all required fields
- Asks questions in fixed order: summary → impact → urgency → etc.
- Tracks completion: `len(collected_fields) == len(required_fields)`
- Transitions to next mode when complete

**Sub-Phase 3c**: Flexible Order + Multi-Field Extraction
- Agent decides optimal question order based on context
- Can extract multiple fields from single user utterance
- Handles "I don't know" responses
- Can handle interruptions (side questions)

**Implementation Highlights**:
```python
# Tool for updating fields
def update_collected_field(field_name: str, value: Any, state: AgentState) -> AgentState:
    state["collected_fields"][field_name] = value
    return state

# Conditional edge: are we done eliciting?
def check_elicitation_complete(state: AgentState) -> str:
    required = set(state["required_field_names"])
    collected = set(k for k, v in state["collected_fields"].items() if v is not None)

    if required.issubset(collected):
        return "team_matching"  # All fields collected
    else:
        return "continue_elicitation"  # Still missing fields
```

**Testing**:
- **Field Extraction Tests**: Does agent correctly parse "My project is Apollo and it's urgent"?
- **Completeness Logic**: Unit test for `check_elicitation_complete`
- **Golden Path Integration Test**: Full conversation from start to all-fields-collected
- **Interruption Test**: User asks "What fields do you need?" mid-elicitation
- **Correction Test**: User says "Oops, I meant low urgency, not high"

**Success Criteria**:
- ✅ Agent collects all required fields
- ✅ Field extraction accuracy > 85%
- ✅ Handles interruptions gracefully
- ✅ Allows corrections
- ✅ Doesn't ask for already-provided information

**Estimated Duration**: 5-7 days

---

### Phase 4: Team Matching

**Goal**: Identify correct team after elicitation completes

**Scope**:
- Implement `TeamMatcherTool` (start with rule-based matching)
- Add TEAM_MATCHING mode (transient state)
- Supervisor calls tool when elicitation complete
- Update state with `identified_team`
- Handle "no match found" case

**Implementation**:
```python
# Simple rule-based matcher for POC
def match_team_simple(collected_fields: Dict[str, Any]) -> Optional[str]:
    summary_lower = collected_fields.get("request_summary", "").lower()

    keywords_to_team = {
        "authentication": "identity_team",
        "login": "identity_team",
        "performance": "performance_team",
        "slow": "performance_team",
        "data": "data_team",
        # ... more rules
    }

    for keyword, team_id in keywords_to_team.items():
        if keyword in summary_lower:
            return team_id

    return None  # No match found

# Integration in graph
workflow.add_node("team_matching", team_matching_node)
workflow.add_conditional_edges(
    "elicitation_agent",
    check_elicitation_complete,
    {
        "team_matching": "team_matching",
        "continue_elicitation": "elicitation_agent"
    }
)
```

**Testing**:
- **Unit Tests**: 20+ request scenarios → expected team ID
  - "My login isn't working" → "identity_team"
  - "App is running slow" → "performance_team"
- **Edge Cases**: Ambiguous requests, out-of-scope requests
- **No Match Handling**: System gracefully informs user

**Success Criteria**:
- ✅ Matching accuracy > 80% on test dataset (POC phase)
- ✅ Tool is independently testable (no LLM required)
- ✅ System handles "no match" case appropriately

**Estimated Duration**: 2-3 days

---

### Phase 5: Review, Confirmation, Submission

**Goal**: User reviews data and submits to SharePoint

**Scope**:
- Add REVIEW mode
- Agent plays back all collected data + identified team
- User can:
  - Confirm and proceed
  - Request corrections (return to ELICITATION)
  - Ask clarifying questions
- Add SUBMITTING mode
- Implement `SharePointTool` (mock for testing)
- Submit request and return item URL
- Handle submission errors gracefully

**Implementation**:
```python
# Review node: present data to user
def review_node(state: AgentState) -> AgentState:
    collected = state["collected_fields"]
    team_name = state["identified_team_name"]

    review_message = f"""
    Great! I've gathered the following information and identified
    that {team_name} is the best team to help you:

    - Summary: {collected['request_summary']}
    - Business Impact: {collected['business_impact']}
    - Urgency: {collected['urgency']}
    ... [all fields]

    Does this look correct? I can submit this request for you now.
    """

    state["messages"].append({
        "role": "assistant",
        "content": review_message
    })
    state["mode"] = "REVIEW"
    return state

# Submission node
def submit_to_sharepoint_node(state: AgentState) -> AgentState:
    result = submit_to_sharepoint(
        team_id=state["identified_team"],
        fields=state["collected_fields"],
        sharepoint_config=SHAREPOINT_CONFIG
    )

    if result["success"]:
        state["sharepoint_item_url"] = result["item_url"]
        state["mode"] = "COMPLETE"
        state["messages"].append({
            "role": "assistant",
            "content": f"Your request has been submitted! You can track it here: {result['item_url']}"
        })
    else:
        state["submission_error"] = result["error"]
        state["mode"] = "REVIEW"  # Stay in review to retry
        state["messages"].append({
            "role": "assistant",
            "content": f"I encountered an error submitting your request: {result['error']}. Would you like to try again?"
        })

    return state
```

**Testing**:
- **Mock SharePoint API**: Return success/failure without real API calls
- **Review Flow Test**: User confirms → submission succeeds
- **Correction Flow Test**: User says "Wrong urgency" → returns to elicitation
- **Error Handling Test**: Mock API failure → user sees helpful error

**Success Criteria**:
- ✅ User can review all collected data before submission
- ✅ Corrections route back to elicitation appropriately
- ✅ Successful submission returns valid SharePoint link
- ✅ Errors are handled gracefully with retry option

**Estimated Duration**: 4-5 days

---

### Phase 6: SharePoint Integration + Polish

**Goal**: Replace mocks with real SharePoint API, polish UX

**Scope**:
- Integrate real SharePoint Lists API
- Handle authentication (for local dev: stored tokens; later: SSO)
- Add retry logic and error handling
- Polish conversational flow based on user testing
- Optimize prompts based on LangSmith traces
- Add conversation summaries for long interactions
- Performance tuning (prompt caching, token optimization)

**Implementation**:
```python
# Real SharePoint integration
from office365.sharepoint.client_context import ClientContext

def submit_to_sharepoint_real(team_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    # Get SharePoint site and list for this team
    site_url = SHAREPOINT_CONFIG["teams"][team_id]["site_url"]
    list_title = SHAREPOINT_CONFIG["teams"][team_id]["list_title"]

    # Authenticate
    ctx = ClientContext(site_url).with_credentials(
        UserCredential(username, password)  # Or OAuth token
    )

    # Get list
    target_list = ctx.web.lists.get_by_title(list_title)

    # Create item
    item_properties = {
        "Title": fields["request_summary"],
        "BusinessImpact": fields["business_impact"],
        # ... map all fields
    }

    new_item = target_list.add_item(item_properties)
    ctx.execute_query()

    # Return success with item URL
    return {
        "success": True,
        "item_url": new_item.properties["webUrl"],
        "item_id": new_item.properties["Id"]
    }
```

**Testing**:
- **End-to-End Test**: Full conversation from "Hi" to submission link
- **Real SharePoint Test**: Submit to test list, verify item created
- **Performance Test**: Measure latency, token usage
- **User Acceptance Testing**: Real employees test the agent

**Success Criteria**:
- ✅ Real SharePoint submissions work reliably
- ✅ End-to-end success rate > 90%
- ✅ Average conversation time < 3 minutes
- ✅ User satisfaction score > 4/5

**Estimated Duration**: 5-7 days

---

### Total Timeline Estimate

- Phase 1: 2-3 days
- Phase 2: 3-4 days
- Phase 3: 5-7 days (most complex)
- Phase 4: 2-3 days
- Phase 5: 4-5 days
- Phase 6: 5-7 days

**Total: 21-29 days (~4-6 weeks)**

This is a POC timeline. Production readiness (SSO, monitoring, scale testing) would add 2-3 additional weeks.

---

## Testing Strategy

### Testing Philosophy

1. **Unit test tools** (deterministic functions)
2. **Integration test agents** (with mocked tools)
3. **End-to-end test full graph** (with real/mocked SharePoint)
4. **Human eval for conversation quality**

### LangSmith Integration

**Setup**:
```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_PROJECT"] = "cfd-agent"
os.environ["LANGCHAIN_API_KEY"] = "..."

# Tracing is now automatic for all LangChain/LangGraph invocations
```

**Dataset Creation**:
```python
from langsmith import Client

client = Client()

# Create routing test dataset
routing_examples = [
    {
        "input": {"messages": [{"role": "user", "content": "Hello!"}], "mode": "CHAT"},
        "expected": {"next_agent": "chat_agent"}
    },
    {
        "input": {"messages": [{"role": "user", "content": "I need help with login"}], "mode": "CHAT"},
        "expected": {"next_agent": "offer_elicitation"}
    },
    # ... 50+ examples
]

client.create_dataset("routing-accuracy", examples=routing_examples)
```

**Automated Evaluation**:
```python
from langsmith.evaluation import evaluate

# Custom evaluator
def routing_accuracy_evaluator(run, example):
    predicted_agent = run.outputs["next_agent"]
    expected_agent = example.outputs["expected"]["next_agent"]
    return {"score": 1 if predicted_agent == expected_agent else 0}

# Run evaluation
results = evaluate(
    lambda inputs: app.invoke(inputs),
    data="routing-accuracy",
    evaluators=[routing_accuracy_evaluator],
    experiment_prefix="phase-2-routing"
)

print(f"Routing accuracy: {results['accuracy']:.2%}")
```

### Testing Matrix

| Phase | Test Type | Focus Area | Tools |
|-------|-----------|------------|-------|
| 1 | Manual + Human Eval | Conversation quality | LangSmith traces |
| 2 | Integration Test | Routing accuracy | LangSmith evaluator |
| 3a | Unit Test | Field extraction | Pytest |
| 3b | Integration Test | Elicitation completeness | LangSmith evaluator |
| 3c | E2E Test | Interruption handling | LangSmith + manual |
| 4 | Unit Test | Team matching logic | Pytest |
| 5 | E2E Test | Full review/submit flow | Mock SharePoint |
| 6 | E2E Test | Real SharePoint | Production-like env |

### Test Coverage Goals

- **Tools**: 100% unit test coverage
- **Routing Logic**: > 90% accuracy on held-out dataset
- **Field Extraction**: > 85% accuracy
- **End-to-End Success Rate**: > 90% (simulated conversations)

---

## Anti-Patterns to Avoid

### OpenAI GPT-5 Best Practices

**✅ Do:**
- Use Markdown formatting with clear headers (`**Role:**`, `**Instructions:**`)
- Structure data in JSON code blocks for clarity
- Use "Let's think step by step" for chain of thought reasoning
- Enable `response_format={"type": "json_object"}` when expecting structured outputs
- Set appropriate `reasoning_effort` levels based on task complexity
- Use numbered lists for sequential instructions
- Provide examples in JSON format when relevant

**❌ Don't:**
- Use XML tags like `<role>`, `<instructions>`, `<thinking>` (not optimized for GPT-5)
- Mix formatting styles within a single prompt
- Expect XML parsing reliability
- Forget to specify JSON mode when needed
- Use overly high reasoning effort for simple tasks (wastes tokens/time)

---

### 1. Leaky Agent Responsibilities

**❌ Bad**:
```python
# ChatAgent prompt includes elicitation logic
chat_prompt = """
You are a chatbot. If the user has a problem,
ask them for: summary, business impact, urgency...
"""
```

**✅ Good**:
```python
# ChatAgent only detects problems and offers routing
chat_prompt = """
You are a chatbot. If the user mentions a problem,
offer to route their request. Do not collect details yourself.
"""
```

**Why**: Each agent should have exactly one responsibility. Mixing concerns makes prompts complex and brittle.

---

### 2. Over-Stuffing the State

**❌ Bad**:
```python
class AgentState(TypedDict):
    messages: List[Dict]
    mode: str
    collected_fields: Dict
    last_question_asked: str  # Unnecessary
    conversation_sentiment: str  # Unnecessary
    user_typing_speed: float  # Unnecessary
    internal_agent_thoughts: List[str]  # Unnecessary
```

**✅ Good**:
```python
class AgentState(TypedDict):
    messages: List[Dict]  # Necessary for context
    mode: str  # Necessary for routing
    collected_fields: Dict  # Necessary for submission
    identified_team: Optional[str]  # Necessary for routing
```

**Why**: State should contain only what's needed for routing and data passing. Temporary or derived data bloats state and makes debugging harder.

---

### 3. Fragile Keyword-Based Routing

**❌ Bad**:
```python
def route(state):
    if "help" in state["messages"][-1]["content"].lower():
        return "elicitation"
    else:
        return "chat"
```

**✅ Good**:
```python
def route(state):
    # Use LLM to understand semantic intent
    intent = supervisor_llm.invoke(
        f"Classify intent as CHAT or ELICITATION: {state['messages'][-1]}"
    )
    return intent
```

**Why**: Keyword matching is brittle. Use LLM for semantic understanding.

---

### 4. No Escape Hatch

**❌ Bad**:
```python
# User is stuck in elicitation mode with no way out
elicitation_prompt = """
Keep asking questions until all fields are filled.
Never stop until complete.
"""
```

**✅ Good**:
```python
elicitation_prompt = """
Ask questions to fill fields. However, if the user:
- Asks a clarifying question → answer it
- Says "stop" or "cancel" → acknowledge and exit to chat mode
- Changes topic → recognize this and route to ChatAgent
"""
```

**Why**: Users must always have control. Forcing them into a loop is frustrating.

---

### 5. Ignoring Failure Modes

**❌ Bad**:
```python
# No error handling
result = submit_to_sharepoint(fields)
return f"Submitted! {result['url']}"
```

**✅ Good**:
```python
try:
    result = submit_to_sharepoint(fields)
    if result["success"]:
        return f"Submitted! {result['url']}"
    else:
        return f"Submission failed: {result['error']}. Would you like to retry?"
except NetworkError:
    return "I'm having trouble connecting to SharePoint. Let's try again in a moment."
```

**Why**: Real systems fail. Graceful degradation maintains user trust.

---

### 6. Prompt Bloat

**❌ Bad**:
```python
# Putting everything in one giant prompt
prompt = """
You are a chatbot. You can:
1. Chat about weather
2. Chat about personal problems
3. Detect work issues
4. Collect 15 different fields for requests
5. Match to one of 100 teams
6. Submit to SharePoint
...
[5000 words of instructions]
"""
```

**✅ Good**:
```python
# Separate prompts for separate agents
chat_prompt = """You are a friendly chatbot. [200 words]"""
elicitation_prompt = """Collect fields. [300 words]"""
```

**Why**: Focused prompts are more reliable. Use architecture to separate concerns, not ever-growing prompts.

---

## Technology Stack Details

### Core Framework

- **LangChain v0.3+**: Tool definitions, prompt templates, LLM interfaces
- **LangGraph v0.2+**: State machine, multi-agent orchestration, checkpointing
- **LangSmith**: Tracing, evaluation, monitoring, debugging

### LLM

- **Primary**: OpenAI GPT-5
- **Rationale**:
  - Advanced reasoning capabilities with `reasoning_effort` parameter
  - Best-in-class tool use and function calling
  - 200K+ context window
  - Optimized for Markdown and JSON formatting
  - Native JSON mode for structured outputs
  - Superior performance on complex multi-step tasks

**GPT-5 Specific Features**:
- **Reasoning Effort**: Set `reasoning_effort` parameter ("low", "medium", "high") for deeper thinking on complex decisions
- **JSON Mode**: Use `response_format={"type": "json_object"}` for structured outputs
- **Function Calling**: Use `tools` parameter with `allowed_tools` for granular control
- **Chain of Thought**: Use "Let's think step by step" for explicit reasoning
- **Structured Prompts**: Prefer Markdown headers, bullet lists, and JSON code blocks over XML

### Integration

- **SharePoint**: `Office365-REST-Python-Client` library
- **Authentication**: Local: stored credentials; Production: OAuth 2.0 / SSO
- **M365 Agents SDK**: For deployment to Teams/Copilot (Phase 7+)

### Development Environment

- **Language**: Python 3.11+
- **Package Manager**: Poetry or pip + requirements.txt
- **Linting**: Ruff + mypy for type checking
- **Testing**: pytest + LangSmith evaluators
- **OpenAI SDK**: `openai>=1.0.0` for GPT-5 API access

**OpenAI Client Initialization**:
```python
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)

# Example usage with GPT-5
response = client.chat.completions.create(
    model="gpt-5",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ],
    reasoning_effort="medium",  # Adjust based on task complexity
    temperature=0.7,
    max_tokens=2000
)
```

### GPT-5 Prompt Engineering Guidelines

**Prompt Structure**:
```markdown
**Role:** [Single sentence defining agent persona]

**Instructions:**
1. [Numbered step-by-step instructions]
2. [Clear, actionable items]

**Context:**
```json
{
  "state": "...",
  "data": "..."
}
```

**Reasoning:**
Let's think step by step...

**Response:**
[Final output]
```

**Key Principles**:
1. **Clear Delimiters**: Use Markdown headers (`**Role:**`) not XML tags
2. **JSON for Data**: Embed state/config as JSON code blocks
3. **Explicit Reasoning**: Add "Let's think step by step" for complex decisions
4. **Structured Outputs**: Use `response_format={"type": "json_object"}` when needed
5. **Reasoning Effort**:
   - `"low"` for simple extraction/classification
   - `"medium"` for routing and intent assessment (default)
   - `"high"` for complex multi-step reasoning
6. **Function Calling**: Define clear tool schemas with detailed descriptions
7. **Context Management**: Keep prompts under 4000 tokens when possible for faster response times

### Deployment (Future)

- **Local Dev**: M365 Agent Playground
- **Production**: Azure Functions or Container Apps (when ready for Teams deployment)

---

## Configuration Management

### Universal Front Door Fields Configuration

**Location**: `config/universal_fields.yaml` or `config/universal_fields.json`

```json
{
  "universal_front_door_fields": [
    {
      "name": "request_summary",
      "type": "string",
      "required": true,
      "description": "Brief 1-2 sentence description of the request",
      "prompt_hint": "What are you trying to accomplish?"
    },
    {
      "name": "business_impact",
      "type": "string",
      "required": true,
      "description": "How this affects business operations",
      "prompt_hint": "How does this impact your work or the business?"
    },
    {
      "name": "urgency",
      "type": "enum",
      "required": true,
      "values": ["low", "medium", "high", "critical"],
      "description": "Timeline sensitivity",
      "prompt_hint": "How urgent is this? (low/medium/high/critical)"
    },
    {
      "name": "affected_users",
      "type": "string",
      "required": false,
      "description": "Who is impacted",
      "prompt_hint": "Who else is affected by this?"
    }
  ]
}
```

**Note**: JSON format is preferred for GPT-5 integration as it can be directly embedded in prompts without conversion.

### Team Directory Configuration

**Location**: `config/teams.yaml` or `config/teams.json`

```json
{
  "teams": [
    {
      "id": "identity_team",
      "name": "Identity & Authentication Team",
      "description": "Handles login, SSO, MFA, and authentication issues",
      "keywords": ["login", "authentication", "password", "SSO", "MFA"],
      "sharepoint_site_url": "https://contoso.sharepoint.com/sites/IdentityTeam",
      "sharepoint_list_title": "Support Requests"
    },
    {
      "id": "performance_team",
      "name": "Performance Engineering Team",
      "description": "Handles app performance, latency, and optimization",
      "keywords": ["slow", "performance", "latency", "timeout"],
      "sharepoint_site_url": "https://contoso.sharepoint.com/sites/PerfTeam",
      "sharepoint_list_title": "Performance Tickets"
    }
  ]
}
```

**Note**: JSON format allows direct embedding in GPT-5 prompts and easier programmatic access.

### Prompt Templates

**Location**: `prompts/`

- `supervisor.md`: SupervisorAgent prompt
- `chat_agent.md`: ChatAgent prompt
- `elicitation_agent.md`: ElicitationAgent prompt

**Dynamic Loading**:
```python
from pathlib import Path

def load_prompt(agent_name: str, state: Dict) -> str:
    template_path = Path(__file__).parent / "prompts" / f"{agent_name}.md"
    template = template_path.read_text()

    # Inject state into template
    return template.format(
        STATE=json.dumps(state, indent=2),
        MESSAGES=json.dumps(state["messages"], indent=2),
        COLLECTED_FIELDS=json.dumps(state.get("collected_fields", {}), indent=2)
    )
```

---

## Success Metrics

### POC Success Criteria

1. **Functional**:
   - ✅ Agent operates in both chat and elicitation modes
   - ✅ Successfully collects all universal front door fields
   - ✅ Identifies correct team > 80% of the time
   - ✅ Submits requests to SharePoint and returns valid links

2. **User Experience**:
   - ✅ Conversations feel natural and human-like
   - ✅ Users maintain control (can interrupt, correct, cancel)
   - ✅ Average conversation time < 3 minutes

3. **Technical**:
   - ✅ Code is clean, modular, and well-documented
   - ✅ Comprehensive test coverage (unit + integration)
   - ✅ Debugging is straightforward via LangSmith traces
   - ✅ No over-engineering: simple solutions preferred

### Production Readiness Criteria (Future)

- SSO integration for authentication
- Multi-tenant support (if applicable)
- Performance SLAs (latency, uptime)
- Monitoring and alerting
- Security audit passed
- Accessibility compliance (Teams/M365 UI)

---

## Appendix: Example Conversation Flow

**Note**: This example demonstrates the natural conversation flow. Behind the scenes, all agent prompts use Markdown formatting and JSON data structures optimized for GPT-5.

```
User: Hi there!
Agent (ChatAgent): Hello! How can I help you today?

User: I'm having trouble with our app loading slowly
Agent (ChatAgent): [Assesses intent: detailed problem mentioned - HIGH confidence]
                   I understand that can be frustrating. Let me help you get
                   this to the right team. Can you tell me more about what's
                   happening? How long has it been taking to load?

Agent (SupervisorAgent): [ChatAgent signals mode=ELICITATION, routes to ElicitationAgent]

User: The main dashboard is taking 30+ seconds to load for our team
Agent: Got it. How is this impacting your business operations?

User: It's slowing down our morning stand-ups significantly
Agent: Understood. How urgent would you say this is?

User: Probably medium urgency
Agent: Thanks. Who else on your team is affected by this?

User: Just our product team, about 15 people
Agent: And could you provide your email so the team can follow up?

User: john.doe@company.com
Agent: Perfect! I've gathered all the information. Based on what you've
       shared, the Performance Engineering Team is best suited to help.

       Here's what I have:
       - Summary: Dashboard loading taking 30+ seconds
       - Business Impact: Slowing down morning stand-ups
       - Urgency: Medium
       - Affected Users: Product team (~15 people)
       - Contact: john.doe@company.com
       - Team: Performance Engineering

       Does this look correct? I can submit this request for you now.

User: Yes, looks good!
Agent: Great! I've submitted your request to the Performance Engineering
       Team. You can track it here:
       https://contoso.sharepoint.com/sites/PerfTeam/Lists/Tickets/123

       Is there anything else I can help you with?

User: No, that's all. Thanks!
Agent: You're welcome! Feel free to come back anytime.
```

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Populate configurations**:
   - Universal front door fields (from real requirements)
   - Team directory (from org structure)
3. **Set up development environment**:
   - LangSmith account and API key
   - Local SharePoint test list
   - Poetry project structure
4. **Begin Phase 1**: Basic ChatAgent implementation
5. **Establish testing cadence**: Daily LangSmith evaluations during active development

---

## Document History

- **v1.0** (2025-09-30): Initial implementation plan based on research and architecture validation
- **Authors**: Research conducted via Gemini Deep Research, validated with Gemini Pro (zen MCP), synthesized by Claude
- **Status**: Ready for stakeholder review and Phase 1 kickoff