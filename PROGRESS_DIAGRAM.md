# CFD Multi-Agent System Architecture

## System Overview

The Consolidated Front Door (CFD) is a multi-agent conversational system that helps AustralianSuper employees submit change/demand requests to the appropriate team through natural conversation.

## Complete Conversation Flow

```mermaid
graph TD
    Start([User Joins]) --> Welcome[Send Welcome Message]
    Welcome --> UserMsg{User Sends Message}

    UserMsg --> GraphInvoke[graph.invoke with thread_id]
    GraphInvoke --> Supervisor[SupervisorAgent]

    %% Supervisor Decision Tree
    Supervisor --> DebugCheck{Debug Command?}
    DebugCheck -->|clear context| ClearAll[clearAll<br/>Clear everything + messages]
    ClearAll --> DebugMsg[Return: Context has been cleared]
    DebugMsg --> EndTurnDebug[END - Return to User]

    DebugCheck -->|No| GetContext[Get Last 5 Messages<br/>for Context]
    GetContext --> SupervisorLLM[LLM Call: Analyze Intent + Mode]
    SupervisorLLM --> RouteDecision{Routing Decision}

    %% Route to Chat Agent
    RouteDecision -->|chatAgent| ChatAgent[ChatAgent]
    ChatAgent --> ChatMode{Current Mode?}
    ChatMode -->|CHAT| ChatPromptNormal[Prompt: General conversation<br/>+ Proactive request detection]
    ChatMode -->|ELICITATION| ChatPromptElicit[Prompt: Answer question<br/>+ Remind about in-progress request]
    ChatMode -->|REVIEW| ChatPromptReview[Prompt: Answer question<br/>+ Remind about pending review]

    ChatPromptNormal --> ChatLLM[LLM Call: Generate Response]
    ChatPromptElicit --> ChatLLM
    ChatPromptReview --> ChatLLM
    ChatLLM --> ChatReturn[Return Response]
    ChatReturn --> EndTurn1[END - Return to User]

    %% Route to Elicitation Agent
    RouteDecision -->|elicitationAgent| ElicitAgent[ElicitationAgent<br/>mode = ELICITATION]
    ElicitAgent --> BuildElicitPrompt[Build System Prompt:<br/>- Remaining fields<br/>- Collected fields<br/>- Completion %<br/>- Abandon detection rules]
    BuildElicitPrompt --> ElicitHistory[Add Full Conversation History]
    ElicitHistory --> ElicitFocus{First Entry?}
    ElicitFocus -->|No| AddFocus[Add Focus Instruction:<br/>Focus on latest message]
    ElicitFocus -->|Yes| ElicitLLM[Single LLM Call<br/>with Structured Output]
    AddFocus --> ElicitLLM

    ElicitLLM --> ElicitExtract[FieldExtractionSchema:<br/>updates, marked_unknown,<br/>reasoning, followup_response,<br/>user_wants_to_abandon]

    ElicitExtract --> AbandonCheck{user_wants_to_abandon?}
    AbandonCheck -->|Yes| AbandonElicit[Return LLM response<br/>+ clearRequestContext]
    AbandonElicit --> EndTurn2[END - mode=CHAT]

    AbandonCheck -->|No| FilterNull[Filter null/empty values]
    FilterNull --> UpdateFields[Update State:<br/>collectedFields += updates<br/>fieldsMarkedUnknown += marked]
    UpdateFields --> ReturnResponse[Return followup_response]
    ReturnResponse --> CompletionCheck{All Required<br/>Fields Complete?}

    CompletionCheck -->|No| EndTurn3[END - Return to User<br/>Stay in ELICITATION]
    CompletionCheck -->|Yes| TeamMatch[TeamMatchingAgent]

    %% Team Matching
    TeamMatch --> TeamMatchPrompt[Build Team Matching Prompt:<br/>All team descriptions<br/>+ Collected fields summary]
    TeamMatchPrompt --> TeamMatchLLM[LLM Call: Identify Best Team]
    TeamMatchLLM --> TeamMatchResult[Structured Output:<br/>team_id, confidence, reasoning]

    TeamMatchResult --> TeamFound{team_id found?}
    TeamFound -->|Yes| FormatReview[formatReviewMessage<br/>NO LLM - Deterministic<br/>User-friendly field labels]
    FormatReview --> SetReviewMode[Update State:<br/>identifiedTeam = team_id<br/>identifiedTeamName = name<br/>mode = REVIEW]
    SetReviewMode --> ReviewMsg[Return Review Message:<br/>Shows collected info + team<br/>Ask: Happy with this?]
    ReviewMsg --> EndTurn4[END - Return to User]

    TeamFound -->|No| NoMatchLLM[Separate LLM Call:<br/>getNoMatchFoundPrompt]
    NoMatchLLM --> NoMatchMsg[Play back collected info<br/>Ask for more detail]
    NoMatchMsg --> ResetChat[mode = CHAT]
    ResetChat --> EndTurn5[END - Return to User]

    %% Route to Review Agent
    RouteDecision -->|reviewAgent| ReviewAgent[ReviewAgent<br/>mode = REVIEW]
    ReviewAgent --> ReviewPrompt[Build Review Prompt:<br/>Collected fields summary<br/>+ Team name]
    ReviewPrompt --> ReviewLLM[LLM Call: Classify Action]
    ReviewLLM --> ReviewClassify[Structured Output:<br/>action_type, reasoning,<br/>response_to_user]

    ReviewClassify --> ActionType{Action Type?}

    %% Confirm Action
    ActionType -->|confirm| SharePointCall[submitToSharePoint<br/>team_id + fields]
    SharePointCall --> SubmitResult{Success?}
    SubmitResult -->|Yes| SubmitSuccess[Return success message + URL<br/>+ clearRequestContext]
    SubmitSuccess --> EndTurn6[END - mode=CHAT]

    SubmitResult -->|No| SubmitError[Return error message<br/>mode = REVIEW stay]
    SubmitError --> EndTurn7[END - Allow retry]

    %% Modify Action
    ActionType -->|modify| ModifyMode[Set mode = ELICITATION<br/>Keep collected fields]
    ModifyMode --> ModifyMsg[Return: What would you<br/>like to change?]
    ModifyMsg --> EndTurn8[END - Supervisor routes<br/>to ElicitationAgent]

    %% Abandon Action
    ActionType -->|abandon| AbandonReview[Return response<br/>+ clearRequestContext]
    AbandonReview --> EndTurn9[END - mode=CHAT]

    %% Clarify Action
    ActionType -->|clarify| ClarifyMsg[Answer user's question<br/>mode = REVIEW stay]
    ClarifyMsg --> EndTurn10[END - Return to User]

    %% Loop Back
    EndTurn1 --> WaitUser[Wait for Next User Message]
    EndTurn2 --> WaitUser
    EndTurn3 --> WaitUser
    EndTurn4 --> WaitUser
    EndTurn5 --> WaitUser
    EndTurn6 --> WaitUser
    EndTurn7 --> WaitUser
    EndTurn8 --> WaitUser
    EndTurn9 --> WaitUser
    EndTurn10 --> WaitUser
    EndTurnDebug --> WaitUser
    WaitUser --> UserMsg

    %% Styling
    classDef agentNode fill:#e1f5ff,stroke:#333,stroke-width:2px
    classDef llmNode fill:#fff4e1,stroke:#333,stroke-width:2px
    classDef stateNode fill:#e1ffe1,stroke:#333,stroke-width:2px
    classDef decisionNode fill:#ffe1ff,stroke:#333,stroke-width:2px
    classDef clearNode fill:#ffe1e1,stroke:#333,stroke-width:2px

    class Supervisor,ChatAgent,ElicitAgent,TeamMatch,ReviewAgent agentNode
    class SupervisorLLM,ChatLLM,ElicitLLM,TeamMatchLLM,NoMatchLLM,ReviewLLM llmNode
    class SetReviewMode,ModifyMode,UpdateFields,ResetChat stateNode
    class RouteDecision,DebugCheck,ChatMode,ElicitFocus,AbandonCheck,CompletionCheck,TeamFound,SubmitResult,ActionType decisionNode
    class ClearAll,AbandonElicit,AbandonReview,SubmitSuccess clearNode
```

## State Schema

```mermaid
graph LR
    State[AgentState] --> Messages[messages: BaseMessage<br/>Conversation history<br/>Concat reducer]
    State --> Mode[mode: AgentMode<br/>CHAT, ELICITATION,<br/>TEAM_MATCHING, REVIEW]
    State --> Next[next: string<br/>Next agent to route to]
    State --> CollectedFields[collectedFields: CollectedFields<br/>9 fields for request submission<br/>Replacement reducer]
    State --> FieldsUnknown[fieldsMarkedUnknown: string<br/>Fields user explicitly doesn't know<br/>Replacement reducer]
    State --> IdentifiedTeam[identifiedTeam: string or null<br/>Team ID after matching]
    State --> IdentifiedTeamName[identifiedTeamName: string or null<br/>Team display name]
    State --> SharePointURL[sharepoint_item_url: string or null<br/>URL after successful submission]
    State --> SubmissionError[submission_error: string or null<br/>Error if submission fails]

    classDef stateField fill:#e1ffe1,stroke:#333,stroke-width:1px
    class Messages,Mode,Next,CollectedFields,FieldsUnknown,IdentifiedTeam,IdentifiedTeamName,SharePointURL,SubmissionError stateField
```

## Agent Responsibilities

### SupervisorAgent
```mermaid
graph TD
    S1[Check for debug command<br/>clear context]
    S1 --> S2{Is debug command?}
    S2 -->|Yes| S3[clearAll + Return message<br/>No routing]
    S2 -->|No| S4[Get last 5 messages for context]
    S4 --> S5[LLM: Analyze intent + mode]
    S5 --> S6[Parse decision]
    S6 --> S7{Route to?}
    S7 -->|chatAgent| S8[Keep current mode<br/>next = chatAgent]
    S7 -->|elicitationAgent| S9[mode = ELICITATION<br/>next = elicitationAgent]
    S7 -->|reviewAgent| S10[mode = REVIEW<br/>next = reviewAgent]

    classDef decision fill:#ffe1ff,stroke:#333,stroke-width:1px
    classDef action fill:#e1f5ff,stroke:#333,stroke-width:1px
    class S2,S7 decision
    class S3,S4,S5,S6,S8,S9,S10 action
```

**Routing Logic:**
- **CHAT mode**: Default to chatAgent, only route to elicitationAgent if user explicitly wants to submit request
- **ELICITATION mode**: Route to elicitationAgent for field collection, chatAgent for off-topic questions
- **REVIEW mode**: Route to reviewAgent for review actions, chatAgent for off-topic questions
- **Debug**: "clear context" → clearAll() → no routing

### ChatAgent (Mode-Aware)
```mermaid
graph TD
    C1[Determine current mode]
    C1 --> C2{Mode?}
    C2 -->|CHAT| C3[Prompt: General conversation<br/>+ Proactively detect request opportunities<br/>+ Suggest opening request if relevant]
    C2 -->|ELICITATION| C4[Prompt: Answer off-topic question<br/>+ Gently remind about in-progress request]
    C2 -->|REVIEW| C5[Prompt: Answer off-topic question<br/>+ Gently remind about pending review]
    C3 --> C6[LLM: Generate response]
    C4 --> C6
    C5 --> C6
    C6 --> C7[Return response]

    classDef decision fill:#ffe1ff,stroke:#333,stroke-width:1px
    classDef action fill:#e1f5ff,stroke:#333,stroke-width:1px
    class C2 decision
    class C1,C3,C4,C5,C6,C7 action
```

**Behavior:**
- **CHAT**: Assess user problems → Suggest opening request if warranted (not for random questions)
- **ELICITATION**: Answer question → "You have a request in progress..."
- **REVIEW**: Answer question → "You have a request ready for review..."

### ElicitationAgent (Single-Pass with Abandon Detection)
```mermaid
graph TD
    E1[Build system prompt:<br/>Remaining fields, collected fields,<br/>completion %, abandon signals]
    E1 --> E2[Add full conversation history]
    E2 --> E3{First entry?}
    E3 -->|No| E4[Add focus instruction:<br/>Focus on latest message]
    E3 -->|Yes| E5[Single LLM call<br/>Structured output]
    E4 --> E5
    E5 --> E6[Extract: updates, marked_unknown,<br/>reasoning, followup_response,<br/>user_wants_to_abandon]
    E6 --> E7{Abandon?}
    E7 -->|Yes| E8[Return LLM response<br/>+ clearRequestContext<br/>mode = CHAT]
    E7 -->|No| E9[Filter null/empty values]
    E9 --> E10[Merge into collectedFields<br/>+ fieldsMarkedUnknown]
    E10 --> E11[Return followup_response]

    classDef decision fill:#ffe1ff,stroke:#333,stroke-width:1px
    classDef action fill:#e1f5ff,stroke:#333,stroke-width:1px
    classDef clear fill:#ffe1e1,stroke:#333,stroke-width:1px
    class E3,E7 decision
    class E1,E2,E4,E5,E6,E9,E10,E11 action
    class E8 clear
```

**Extraction Logic:**
- **95% confidence threshold**: Only extract what user explicitly stated
- **No inference**: Don't interpret vague statements
- **Abandonment detection**: "cancel", "never mind", "forget it" → Sets user_wants_to_abandon = true
- **Title special rule**: Don't ask for title, infer it when enough information collected

### TeamMatchingAgent
```mermaid
graph TD
    T1[LLM: Match request to team<br/>Analyze all team descriptions<br/>+ collected fields]
    T1 --> T2[Structured output:<br/>team_id, confidence, reasoning]
    T2 --> T3{team_id found?}
    T3 -->|Yes| T4[formatReviewMessage<br/>NO LLM - Deterministic<br/>User-friendly labels]
    T4 --> T5[Update state:<br/>identifiedTeam, identifiedTeamName<br/>mode = REVIEW]
    T5 --> T6[Return review message]
    T3 -->|No| T7[Separate LLM call:<br/>getNoMatchFoundPrompt]
    T7 --> T8[Play back collected info<br/>Ask for more detail/different angle]
    T8 --> T9[mode = CHAT]

    classDef decision fill:#ffe1ff,stroke:#333,stroke-width:1px
    classDef action fill:#e1f5ff,stroke:#333,stroke-width:1px
    class T3 decision
    class T1,T2,T4,T5,T6,T7,T8,T9 action
```

**Team Matching:**
- 3 teams configured: Ops Change, IO Change, Hyperautomation
- LLM analyzes semantic similarity between request and team capabilities
- Graceful "no match" handling with dedicated prompt

### ReviewAgent (4 Actions)
```mermaid
graph TD
    R1[LLM: Classify user action<br/>based on review response]
    R1 --> R2[Structured output:<br/>action_type, reasoning,<br/>response_to_user]
    R2 --> R3{Action Type?}

    R3 -->|confirm| R4[submitToSharePoint<br/>team_id + fields]
    R4 --> R5{Success?}
    R5 -->|Yes| R6[Return success + URL<br/>+ clearRequestContext<br/>mode = CHAT]
    R5 -->|No| R7[Return error<br/>mode = REVIEW stay]

    R3 -->|modify| R8[Return response<br/>mode = ELICITATION<br/>Keep collected fields]

    R3 -->|abandon| R9[Return response<br/>+ clearRequestContext<br/>mode = CHAT]

    R3 -->|clarify| R10[Answer user's question<br/>mode = REVIEW stay]

    classDef decision fill:#ffe1ff,stroke:#333,stroke-width:1px
    classDef action fill:#e1f5ff,stroke:#333,stroke-width:1px
    classDef clear fill:#ffe1e1,stroke:#333,stroke-width:1px
    class R3,R5 decision
    class R1,R2,R4,R7,R8,R10 action
    class R6,R9 clear
```

**Review Actions:**
- **confirm**: Submit → Success (clear context) | Failure (stay in review for retry)
- **modify**: Return to ELICITATION mode (keeps collected data)
- **abandon**: Clear context → CHAT mode
- **clarify**: Answer questions, stay in REVIEW

## State Clearing Logic

```mermaid
graph TD
    Clear[State Clearing Scenarios]

    Clear --> Scenario1[Debug: clear context command]
    Scenario1 --> Clear1[clearAll]
    Clear1 --> Clear1A[Clear messages<br/>Clear all request fields<br/>mode = CHAT]

    Clear --> Scenario2[Abandon from ELICITATION]
    Scenario2 --> Clear2[clearRequestContext]
    Clear2 --> Clear2A[Preserve messages<br/>Clear request fields<br/>mode = CHAT]

    Clear --> Scenario3[Abandon from REVIEW]
    Scenario3 --> Clear3[clearRequestContext]
    Clear3 --> Clear3A[Preserve messages<br/>Clear request fields<br/>mode = CHAT]

    Clear --> Scenario4[Successful Submission]
    Scenario4 --> Clear4[clearRequestContext]
    Clear4 --> Clear4A[Preserve messages<br/>Clear request fields<br/>mode = CHAT]

    classDef clearNode fill:#ffe1e1,stroke:#333,stroke-width:2px
    classDef preserveNode fill:#e1ffe1,stroke:#333,stroke-width:2px
    class Clear1,Clear2,Clear3,Clear4 clearNode
    class Clear1A,Clear2A,Clear3A,Clear4A preserveNode
```
