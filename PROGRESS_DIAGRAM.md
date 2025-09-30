# CFD Agent - Current Implementation Progress

## Phase 1-3 Conversational Flow Diagram

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

    %% Elicitation Agent Path
    RouteDecision -->|next = elicitationAgent| ElicitCheck{First Time Entry?<br/>elicitationStarted?}

    %% First Time Elicitation
    ElicitCheck -->|false<br/>First Time| PrePopulate[prepopulateFields]
    PrePopulate --> PrePopLLM[LLM Call with Structured Output:<br/>Extract from History]
    PrePopLLM --> PrePopUpdate[Update State:<br/>collectedFields<br/>fieldsMarkedUnknown<br/>elicitationStarted=true]
    PrePopUpdate --> GenInitial[Generate Initial Elicitation Message]
    GenInitial --> InitialLLM[LLM Call: Show Questions]
    InitialLLM --> InitialMsg[Return Initial Elicitation Message]
    InitialMsg --> CompletionCheck1{Check Completion:<br/>areAllRequiredFieldsComplete?}

    %% Subsequent Elicitation Turns
    ElicitCheck -->|true<br/>Subsequent Turn| ExtractFields[Extract Fields from User Response]
    ExtractFields --> ExtractLLM[LLM Call with Structured Output:<br/>FieldExtractionSchema]
    ExtractLLM --> ExtractResult[Get: updates, marked_unknown,<br/>confidence, reasoning]
    ExtractResult --> UpdateFields[Update State:<br/>collectedFields += updates<br/>fieldsMarkedUnknown += marked_unknown]
    UpdateFields --> GenResponse[Generate Conversational Response]
    GenResponse --> ResponseLLM[LLM Call: Acknowledge & Ask Remaining]
    ResponseLLM --> ElicitMsg[Return Elicitation Response]
    ElicitMsg --> CompletionCheck2{Check Completion:<br/>areAllRequiredFieldsComplete?}

    %% Completion Routing
    CompletionCheck1 -->|Incomplete| EndTurn2[END - Return to User]
    CompletionCheck2 -->|Incomplete| EndTurn2

    CompletionCheck1 -->|Complete| TeamMatch[TeamMatchingAgent<br/>Phase 4 Stub]
    CompletionCheck2 -->|Complete| TeamMatch

    TeamMatch --> LogComplete[Log Collected Fields Summary]
    LogComplete --> TeamMsg[Return Completion Message]
    TeamMsg --> UpdateTeamMode[Update State: mode=TEAM_MATCHING]
    UpdateTeamMode --> EndTurn3[END - Return to User]

    %% Loop Back
    EndTurn1 --> WaitUser[Wait for Next User Message]
    EndTurn2 --> WaitUser
    EndTurn3 --> WaitUser
    WaitUser --> UserInput

    %% Styling
    classDef agentNode fill:#e1f5ff,stroke:#333,stroke-width:2px
    classDef llmNode fill:#fff4e1,stroke:#333,stroke-width:2px
    classDef stateNode fill:#e1ffe1,stroke:#333,stroke-width:2px
    classDef decisionNode fill:#ffe1ff,stroke:#333,stroke-width:2px
    classDef toolNode fill:#ffe1e1,stroke:#333,stroke-width:2px

    class Supervisor,ChatAgent,TeamMatch agentNode
    class SupervisorLLM,ChatLLM,PrePopLLM,InitialLLM,ExtractLLM,ResponseLLM llmNode
    class UpdateMode,PrePopUpdate,UpdateFields,UpdateTeamMode stateNode
    class RouteDecision,ElicitCheck,CompletionCheck1,CompletionCheck2 decisionNode
    class PrePopulate,ExtractFields toolNode
```

## State Schema

```mermaid
graph LR
    State[AgentState] --> Messages[messages: BaseMessage<br/>Conversation history]
    State --> Mode[mode: AgentMode<br/>CHAT | ELICITATION | TEAM_MATCHING]
    State --> Next[next: string<br/>Next agent to route to]
    State --> CollectedFields[collectedFields: CollectedFields<br/>request_summary, business_impact,<br/>urgency, affected_users]
    State --> FieldsUnknown[fieldsMarkedUnknown: string<br/>Fields user doesn't know]
    State --> ElicitStarted[elicitationStarted: boolean<br/>Pre-population flag]

    classDef stateField fill:#e1ffe1,stroke:#333,stroke-width:1px
    class Messages,Mode,Next,CollectedFields,FieldsUnknown,ElicitStarted stateField
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
        E1[First time: Pre-populate from history]
        E2[Extract fields with structured output]
        E3[Handle bulk/single/corrections]
        E4[Track I don't know responses]
        E5[Show only missing fields]
        E1 --> E2 --> E3 --> E4 --> E5
    end

    subgraph TeamMatchingAgent
        T1[Phase 4 Stub]
        T2[Log collected fields]
        T3[Confirm completion]
        T1 --> T2 --> T3
    end

    classDef agent fill:#e1f5ff,stroke:#333,stroke-width:2px
    class SupervisorAgent,ChatAgent,ElicitationAgent,TeamMatchingAgent agent
```

## Field Collection Process

```mermaid
sequenceDiagram
    participant User
    participant Supervisor
    participant Elicitation
    participant PrePopulate
    participant Extraction
    participant Completion

    User->>Supervisor: "I need to submit a request about slow app"
    Supervisor->>Supervisor: Detect request intent
    Supervisor->>Elicitation: Route to elicitationAgent

    Note over Elicitation: First Time Entry (elicitationStarted=false)

    Elicitation->>PrePopulate: Extract from conversation history
    PrePopulate->>PrePopulate: LLM structured output
    PrePopulate-->>Elicitation: collectedFields: {request_summary: "slow app"}

    Elicitation->>Elicitation: Generate questions for missing fields
    Elicitation-->>User: "How is this impacting your work? How urgent?"

    User->>Supervisor: "It's blocking sales team, very urgent"
    Supervisor->>Elicitation: Route to elicitationAgent

    Note over Elicitation: Subsequent Turn (elicitationStarted=true)

    Elicitation->>Extraction: Extract from latest message
    Extraction->>Extraction: LLM structured output
    Extraction-->>Elicitation: updates: {business_impact, urgency: "high", affected_users}

    Elicitation->>Completion: Check if all required fields complete
    Completion-->>Elicitation: Complete ✅

    Elicitation->>TeamMatching: Route to teamMatching
    TeamMatching-->>User: "Great! I've collected all information..."
```

## Key Decision Points

| Decision Point | Logic | Outcomes |
|---------------|-------|----------|
| **Supervisor Routing** | Analyze user intent + current mode | → chatAgent<br>→ elicitationAgent |
| **First Time Elicitation** | Check `elicitationStarted` flag | false → Pre-populate from history<br>true → Extract from latest message |
| **Field Extraction** | LLM with `FieldExtractionSchema` | Extract: updates, marked_unknown, confidence |
| **Completion Check** | All required fields filled OR marked unknown | Complete → teamMatching<br>Incomplete → END (ask more) |

## Tools & Helpers

```mermaid
graph LR
    subgraph Configuration
        Fields[fields.ts<br/>UNIVERSAL_FIELDS<br/>Field definitions]
    end

    subgraph Tools
        Extract[fieldExtraction.ts<br/>- getMissingFields<br/>- formatQuestions<br/>- calculateCompletion<br/>- FieldExtractionSchema]
    end

    subgraph Functions
        PrePop[prepopulateFields.ts<br/>Extract from history]
        Check[checkCompletion.ts<br/>Completion logic]
    end

    ElicitAgent[ElicitationAgent] --> Fields
    ElicitAgent --> Extract
    ElicitAgent --> PrePop
    ElicitAgent --> Check

    classDef config fill:#fff4e1,stroke:#333,stroke-width:1px
    classDef tool fill:#e1ffe1,stroke:#333,stroke-width:1px
    class Fields config
    class Extract,PrePop,Check tool
```

## Universal Front Door Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| `request_summary` | string | ✅ Yes | Brief description of the issue |
| `business_impact` | string | ✅ Yes | How this affects work/business |
| `urgency` | enum | ✅ Yes | low, medium, high, critical |
| `affected_users` | string | ❌ No | Who else is impacted |

## Implementation Status

- ✅ **Phase 1**: Basic Chat Agent (completed)
- ✅ **Phase 2**: Supervisor + Mode Routing (completed)
- ✅ **Phase 3**: Requirements Elicitation Loop (completed)
- ⏳ **Phase 4**: Team Matching (stub only)
- ⏳ **Phase 5**: Review & Submission
- ⏳ **Phase 6**: SharePoint Integration