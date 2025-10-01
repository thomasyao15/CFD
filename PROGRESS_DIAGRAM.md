# CFD Agent - Current Implementation Progress

## Phase 1-4 Conversational Flow Diagram (Implemented Architecture)

```mermaid
graph TD
    Start([User Starts Conversation]) --> WelcomeMsg[Welcome Message Sent]
    WelcomeMsg --> UserInput{User Sends Message}

    UserInput --> GraphInvoke[graph.invoke with conversationId]
    GraphInvoke --> Supervisor[SupervisorAgent]

    Supervisor --> AnalyzeIntent[Analyze User Intent & Current Mode]
    AnalyzeIntent --> SupervisorLLM[LLM Call: Determine Routing]
    SupervisorLLM --> UpdateMode[Update State: mode, next]

    UpdateMode --> RouteDecision{Routing Decision}

    %% Chat Agent Path
    RouteDecision -->|next = chatAgent| ChatAgent[ChatAgent]
    ChatAgent --> ChatLLM[LLM Call: Generate Response]
    ChatLLM --> ChatResponse[Return Response Message]
    ChatResponse --> EndTurn1[END - Return to User]

    %% Simplified Elicitation Agent Path - Single LLM Call
    RouteDecision -->|next = elicitationAgent| ElicitAgent[ElicitationAgent]
    ElicitAgent --> BuildPrompt[Build System Prompt:<br/>- Remaining fields<br/>- Collected fields<br/>- Completion %]
    BuildPrompt --> AddHistory[Add Full Conversation History]
    AddHistory --> AddFocus{First Entry?}
    AddFocus -->|No| FocusMsg[Add Focus Instruction:<br/>Latest user message]
    AddFocus -->|Yes| SingleLLM[Single LLM Call with Structured Output]
    FocusMsg --> SingleLLM

    SingleLLM --> StructuredOutput[FieldExtractionSchema Output:<br/>updates, marked_unknown,<br/>reasoning, followup_response]
    StructuredOutput --> FilterNull[Filter null/empty values<br/>from updates]
    FilterNull --> UpdateState[Update State:<br/>collectedFields += updates<br/>fieldsMarkedUnknown += marked_unknown]
    UpdateState --> ReturnFollowup[Return followup_response<br/>as AIMessage]
    ReturnFollowup --> CompletionCheck{Check Completion:<br/>areAllRequiredFieldsComplete?}

    %% Completion Routing
    CompletionCheck -->|Incomplete| EndTurn2[END - Return to User]
    CompletionCheck -->|Complete| TeamMatch[TeamMatchingAgent<br/>Phase 4 - LLM Matching]

    TeamMatch --> LogComplete[Log Collected Fields Summary]
    LogComplete --> TeamMatchLLM[LLM Call: Analyze fields<br/>Match to best team]
    TeamMatchLLM --> TeamMatchOutput[Structured Output:<br/>team_id, confidence, reasoning]
    TeamMatchOutput --> TeamFound{Team Found?}

    %% Team Match Success Path
    TeamFound -->|Yes - team_id exists| UpdateTeamInfo[Update State:<br/>identifiedTeam = team_id<br/>identifiedTeamName = team.name<br/>mode = REVIEW]
    UpdateTeamInfo --> TeamSuccessMsg[Return Success Message:<br/>Identified team + Phase 5 note]
    TeamSuccessMsg --> EndTurn3[END - Return to User]

    %% No Team Match Path
    TeamFound -->|No - team_id is null| NoMatchLLM[Separate LLM Call:<br/>getNoMatchFoundPrompt]
    NoMatchLLM --> PlaybackMsg[Generate Response:<br/>- Play back collected info<br/>- Ask for more detail/different angle]
    PlaybackMsg --> ResetToChat[Update State:<br/>mode = CHAT]
    ResetToChat --> EndTurn4[END - Return to User]

    %% Loop Back
    EndTurn1 --> WaitUser[Wait for Next User Message]
    EndTurn2 --> WaitUser
    EndTurn3 --> WaitUser
    EndTurn4 --> WaitUser
    WaitUser --> UserInput

    %% Styling
    classDef agentNode fill:#e1f5ff,stroke:#333,stroke-width:2px
    classDef llmNode fill:#fff4e1,stroke:#333,stroke-width:2px
    classDef stateNode fill:#e1ffe1,stroke:#333,stroke-width:2px
    classDef decisionNode fill:#ffe1ff,stroke:#333,stroke-width:2px
    classDef processNode fill:#ffe1e1,stroke:#333,stroke-width:2px

    class Supervisor,ChatAgent,ElicitAgent,TeamMatch agentNode
    class SupervisorLLM,ChatLLM,SingleLLM llmNode
    class UpdateMode,UpdateState,UpdateTeamMode stateNode
    class RouteDecision,AddFocus,CompletionCheck decisionNode
    class BuildPrompt,AddHistory,FocusMsg,StructuredOutput,FilterNull,ReturnFollowup processNode
```

## State Schema (Phase 1-4)

```mermaid
graph LR
    State[AgentState] --> Messages[messages: BaseMessage<br/>Conversation history]
    State --> Mode[mode: AgentMode<br/>CHAT | ELICITATION | TEAM_MATCHING | REVIEW]
    State --> Next[next: string<br/>Next agent to route to]
    State --> CollectedFields[collectedFields: CollectedFields<br/>request_summary, business_impact,<br/>urgency, affected_users, request_type,<br/>department, desired_resolution]
    State --> FieldsUnknown[fieldsMarkedUnknown: string<br/>Fields user doesn't know]
    State --> IdentifiedTeam[identifiedTeam: string | null<br/>Team ID after matching]
    State --> IdentifiedTeamName[identifiedTeamName: string | null<br/>Team display name]

    classDef stateField fill:#e1ffe1,stroke:#333,stroke-width:1px
    class Messages,Mode,Next,CollectedFields,FieldsUnknown,IdentifiedTeam,IdentifiedTeamName stateField
```

## Agent Responsibilities

```mermaid
graph TD
    subgraph SupervisorAgent
        S1[Analyze user intent & current mode]
        S2[Make routing decision]
        S3[Update mode if needed]
        S1 --> S2 --> S3
    end

    subgraph ChatAgent
        C1[Handle general conversation]
        C2[Answer questions naturally]
        C3[Maintain conversational tone]
        C1 --> C2 --> C3
    end

    subgraph ElicitationAgent
        E1[Single LLM call with full history]
        E2[Structured output extraction + response]
        E3[Extract: updates, marked_unknown, followup_response]
        E4[Filter null/empty values]
        E5[Return followup_response directly]
        E1 --> E2 --> E3 --> E4 --> E5
    end

    subgraph TeamMatchingAgent
        T1[Log collected fields summary]
        T2[LLM Call: Match to best team]
        T3[Structured output: team_id, confidence, reasoning]
        T4{Team found?}
        T5[Success: Update state with team info, mode=REVIEW]
        T6[No match: Separate LLM call with dedicated prompt]
        T7[Generate playback + ask for more detail]
        T8[Reset mode to CHAT]
        T1 --> T2 --> T3 --> T4
        T4 -->|Yes| T5
        T4 -->|No| T6 --> T7 --> T8
    end

    classDef agent fill:#e1f5ff,stroke:#333,stroke-width:2px
    class SupervisorAgent,ChatAgent,ElicitationAgent,TeamMatchingAgent agent
```

## Field Collection Process (Simplified)

```mermaid
sequenceDiagram
    participant User
    participant Supervisor
    participant Elicitation
    participant SingleLLM
    participant Completion

    User->>Supervisor: "I need to submit a request about slow app"
    Supervisor->>Supervisor: Detect request intent
    Supervisor->>Elicitation: Route to elicitationAgent

    Note over Elicitation: Single LLM Call with Full History

    Elicitation->>Elicitation: Build prompt: remaining fields + collected fields
    Elicitation->>SingleLLM: Invoke with full conversation history
    SingleLLM->>SingleLLM: Extract + Generate response in one call
    SingleLLM-->>Elicitation: {updates, marked_unknown, followup_response}

    Elicitation->>Elicitation: Filter null/empty values
    Elicitation-->>User: followup_response: "Got it - slow app. How is this impacting your work?"

    User->>Supervisor: "It's blocking sales team, very urgent"
    Supervisor->>Elicitation: Route to elicitationAgent

    Note over Elicitation: Single LLM Call Again (with updated history)

    Elicitation->>SingleLLM: Full history + focus on latest message
    SingleLLM-->>Elicitation: {updates: {business_impact, urgency, affected_users}, followup_response}

    Elicitation->>Completion: Check if all required fields complete
    Completion-->>Elicitation: Complete ✅

    Elicitation->>TeamMatching: Route to teamMatching
    TeamMatching-->>User: "Perfect! I have everything I need..."
```

## Key Decision Points

| Decision Point | Logic | Outcomes |
|---------------|-------|----------|
| **Supervisor Routing** | Analyze user intent + current mode | → chatAgent<br>→ elicitationAgent |
| **Elicitation Focus** | Check if first entry (collectedFields empty) | First → Analyze full history<br>Subsequent → Focus on latest + full history context |
| **Field Extraction** | Single LLM call with `FieldExtractionSchema` | Extract: updates, marked_unknown, reasoning, followup_response |
| **Completion Check** | All required fields filled OR marked unknown | Complete → teamMatching<br>Incomplete → END (ask more) |
| **Team Matching** | LLM analyzes fields against all team descriptions | team_id found → mode=REVIEW<br>team_id null → mode=CHAT (no match) |
| **No Match Handling** | Separate LLM call with dedicated prompt | Play back info + ask for more detail → CHAT mode |

## Tools & Helpers (Phase 1-4)

```mermaid
graph LR
    subgraph Configuration
        Fields[fields.ts<br/>UNIVERSAL_FIELDS<br/>7 field definitions]
        Teams[teams.ts<br/>TEAMS array<br/>3 team definitions]
    end

    subgraph Tools
        Extract[fieldExtraction.ts<br/>- formatRemainingFields<br/>- formatCollectedFieldsSummary<br/>- calculateCompletionPercentage<br/>- isValidFieldValue<br/>- FieldExtractionSchema]
    end

    subgraph Prompts
        TeamPrompts[teamMatching.ts<br/>- getTeamMatchingPrompt<br/>- getNoMatchFoundPrompt]
    end

    subgraph Functions
        Check[checkCompletion.ts<br/>Completion logic]
    end

    ElicitAgent[ElicitationAgent] --> Fields
    ElicitAgent --> Extract
    ElicitAgent --> Check

    TeamAgent[TeamMatchingAgent] --> Teams
    TeamAgent --> TeamPrompts
    TeamAgent --> Extract

    classDef config fill:#fff4e1,stroke:#333,stroke-width:1px
    classDef tool fill:#e1ffe1,stroke:#333,stroke-width:1px
    class Fields,Teams config
    class Extract,Check,TeamPrompts tool
```

## Universal Front Door Fields (7 Total)

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `request_summary` | string | ✅ Yes | Brief description of the issue |
| `business_impact` | string | ✅ Yes | How this affects work/business |
| `urgency` | enum | ✅ Yes | low, medium, high, critical |
| `affected_users` | string | ❌ No | Who else is impacted |
| `request_type` | enum | ✅ Yes | incident, service_request, question, access_request, other |
| `department` | string | ✅ Yes | Department or team making the request |
| `desired_resolution` | string | ✅ Yes | Expected outcome or resolution |

## Available Teams (3 Total)

| Team ID | Team Name | Specialization |
|---------|-----------|----------------|
| `identity_access_team` | Identity & Access Management Team | Authentication, login, SSO, MFA, permissions, account access |
| `performance_engineering_team` | Performance Engineering Team | App performance, latency, slow loading, timeouts, crashes |
| `data_analytics_team` | Data & Analytics Team | Reports, dashboards, data exports, analytics, BI tools |

## Implementation Status

- ✅ **Phase 1**: Basic Chat Agent (completed)
- ✅ **Phase 2**: Supervisor + Mode Routing (completed)
- ✅ **Phase 3**: Requirements Elicitation Loop (completed)
- ✅ **Phase 4**: Team Matching (completed)
  - LLM-based team identification with structured output
  - 3 teams configured (Identity, Performance, Data Analytics)
  - Graceful "no match" handling with dedicated prompt
  - Automatic fallback to CHAT mode if no suitable team
- ⏳ **Phase 5**: Review & Submission (next)
- ⏳ **Phase 6**: SharePoint Integration

## Phase 4 Implementation Details

### Team Matching Flow
1. **LLM Analysis**: Uses `getTeamMatchingPrompt()` with all team descriptions and collected fields
2. **Structured Output**: Returns `team_id` (or null), `confidence`, and `reasoning`
3. **Success Path**:
   - Updates state with `identifiedTeam` and `identifiedTeamName`
   - Sets mode to `REVIEW` (Phase 5 stub)
   - Returns success message to user
4. **No Match Path**:
   - Separate LLM call with `getNoMatchFoundPrompt()`
   - Plays back collected information naturally
   - Asks user for more detail or different angle
   - Resets mode to `CHAT` for continued conversation

### Key Design Decisions
- **Two separate prompts**: Focused prompts avoid pollution with unrelated instructions
- **LLM over rules**: Semantic matching handles variations better than keyword matching
- **Graceful degradation**: "No match" returns to conversation naturally
- **Future-ready**: Easy to extend to vector search with 100+ teams