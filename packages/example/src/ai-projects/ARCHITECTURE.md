# AI Video Generation System - Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REMOTION STUDIO                              │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                                                                 │  │
│  │  ┌──────────────┐           ┌─────────────────┐               │  │
│  │  │   Explorer   │           │  Canvas (Main)  │               │  │
│  │  │    Panel     │           │                 │               │  │
│  │  │              │           │  ┌───────────┐  │               │  │
│  │  │ • Comps      │           │  │ ai-project│  │               │  │
│  │  │ • ai-project ◄───────────┼──│ Component │  │               │  │
│  │  │ • Files      │           │  │  (renders │  │               │  │
│  │  │              │           │  │   here)   │  │               │  │
│  │  └──────────────┘           │  └───────────┘  │               │  │
│  │                              │                 │               │  │
│  │                              └─────────────────┘               │  │
│  │                                                                 │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │                    MockChatbot.tsx                       │  │  │
│  │  │                                                          │  │  │
│  │  │  Bot: "Hello! How can I help?"                          │  │  │
│  │  │  User: "Create video with 'Hello World' fading in"      │  │  │
│  │  │  Bot: "✅ Project created! Switch to ai-project"        │  │  │
│  │  │                                                          │  │  │
│  │  │  [Type message...                        ] [Send]       │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                              │                                  │  │
│  └──────────────────────────────┼──────────────────────────────────┘  │
│                                 │                                     │
└─────────────────────────────────┼─────────────────────────────────────┘
                                  │
                                  │ WebSocket (ws://localhost:3000/ai-ws)
                                  │
                     ┌────────────▼────────────┐
                     │   Studio Server         │
                     │  (websocket-ai.ts)      │
                     │                         │
                     │  • Receive messages     │
                     │  • Forward to AI        │
                     │  • Handle responses     │
                     │  • Write files          │
                     └────────────┬────────────┘
                                  │
                                  │ WebSocket (ws://localhost:8000)
                                  │
                        ┌─────────▼──────────┐
                        │   AI Backend       │
                        │   (port 8000)      │
                        │                    │
                        │  ┌──────────────┐  │
                        │  │     LLM      │  │
                        │  │  (Claude,    │  │
                        │  │   GPT, etc)  │  │
                        │  └──────────────┘  │
                        │                    │
                        │  • Parse prompt    │
                        │  • Generate code   │
                        │  • Return JSON     │
                        └────────────────────┘
```

## Data Flow

### 1. User Sends Prompt
```
User types: "Create video with 'Hello World' fading in"
     ↓
MockChatbot.tsx
     ↓
ws.send({type: 'chat', message: '...'})
```

### 2. Message Forwarding
```
WebSocket → Studio Server
     ↓
websocket-ai.ts receives message
     ↓
Forwards to AI Backend (port 8000)
```

### 3. Code Generation
```
AI Backend receives message
     ↓
LLM processes prompt
     ↓
Generates Remotion component code
     ↓
Returns JSON with type: 'code-generation'
```

### 4. File Operations
```
Studio Server receives code
     ↓
writeAIProject() function:
  • Validates code
  • Creates generated-*.tsx file
  • Updates index.tsx import
  • Returns success/error
```

### 5. User Notification
```
Studio Server → Frontend
     ↓
MockChatbot displays:
"✅ Project created! Switch to ai-project composition"
```

### 6. Hot Reload
```
Remotion detects file change
     ↓
Recompiles ai-projects/index.tsx
     ↓
Canvas updates automatically
```

## Component Hierarchy

```
Root.tsx (Composition Registry)
  └── <Composition id="ai-project" component={AIProject} />
       └── AIProject (from ai-projects/index.tsx)
            └── AIGeneratedComponent (dynamically imported)
                 └── <AbsoluteFill>
                      └── User's content (text, shapes, etc.)
```

## File System Structure

```
remotion/
├── packages/
│   ├── studio/                         (Frontend)
│   │   └── src/components/
│   │       └── MockChatbot.tsx         ← Chat UI
│   │
│   ├── studio-server/                  (Backend)
│   │   └── src/
│   │       └── websocket-ai.ts         ← WebSocket handler
│   │
│   └── example/
│       └── src/
│           ├── Root.tsx                ← Composition registry
│           │
│           └── ai-projects/            ← AI-generated content
│               ├── index.tsx           ← Dynamic loader
│               ├── template.ts         ← Utilities
│               ├── README.md           ← User docs
│               ├── BACKEND_PROMPT_GUIDE.md  ← LLM guide
│               ├── ARCHITECTURE.md     ← This file
│               ├── test-examples.json  ← Test cases
│               ├── .gitignore          ← Git ignore
│               │
│               └── generated-*.tsx     ← AI-generated files
│                   ├── generated-hello-world-1234.tsx
│                   ├── generated-welcome-5678.tsx
│                   └── ...
│
├── IMPLEMENTATION_SUMMARY.md           ← Full implementation details
└── AI_SYSTEM_QUICKSTART.md            ← Quick start guide
```

## Message Flow Diagram

```
┌──────────┐   chat    ┌──────────────┐   chat    ┌────────────┐
│          ├──────────►│              ├──────────►│            │
│ Frontend │           │ Studio Server│           │ AI Backend │
│          │◄──────────┤              │◄──────────┤            │
└──────────┘  response └──────┬───────┘  code-gen └────────────┘
                              │
                              │ (File System)
                              ▼
                      ┌───────────────┐
                      │  ai-projects/ │
                      │               │
                      │ • index.tsx   │
                      │ • generated-  │
                      │   *.tsx       │
                      └───────────────┘
```

## WebSocket Connection States

```
Frontend MockChatbot
    │
    ├─ CONNECTING ──► [Waiting for connection]
    │
    ├─ OPEN ────────► [Connected - Green dot]
    │   │
    │   ├─ Sending ──► {type: 'chat', message: '...'}
    │   │
    │   └─ Receiving ► {type: 'code-generated', success: true, ...}
    │
    ├─ ERROR ───────► [Connection error - Red dot]
    │
    └─ CLOSED ──────► [Disconnected - Gray dot]
```

## Security Layers

```
1. Input Validation
   └── Chat message → Sanitized

2. Code Validation (template.ts)
   ├── Check blocked imports
   ├── Verify export structure
   └── Check file size limit

3. File System Isolation
   └── Write only to ai-projects/

4. Runtime Safety
   └── Error boundaries in React
```

## Performance Optimization

```
1. Dynamic Imports
   └── Lazy loading of generated components

2. Hot Module Replacement
   └── Fast updates without full refresh

3. WebSocket Persistence
   └── Connection stays open for multiple requests

4. Incremental File Writing
   └── Only write changed files
```

## Error Handling Flow

```
Error Occurs
    │
    ├─ Frontend Error
    │   └── Display in chat: "❌ Failed to send message"
    │
    ├─ Backend Error
    │   └── Log + Send error message to frontend
    │
    ├─ Code Generation Error
    │   └── AI Backend returns error → Frontend displays
    │
    ├─ File Write Error
    │   └── Catch in writeAIProject() → Send failure message
    │
    └─ Compilation Error
        └── TypeScript error → Shown in browser console
```

## Scaling Considerations

### Current Limits
- 1 active project at a time (in index.tsx)
- 50KB max file size
- Single AI backend connection

### Future Enhancements
- Multiple simultaneous projects
- Project history/versioning
- Direct composition switching
- Preview thumbnails
- Code diff viewer
- Undo/redo functionality

## Integration Points

### External Systems
```
1. AI Backend (Required)
   └── WebSocket server on port 8000
   └── LLM integration (Claude, GPT, etc.)

2. Remotion Studio (Required)
   └── Development server
   └── File watcher

3. Browser (Required)
   └── WebSocket support
   └── React/TypeScript
```

### Internal Dependencies
```
remotion (core)
  └── useCurrentFrame, useVideoConfig, interpolate, spring

@remotion/shapes
  └── Circle, Rect, Triangle, Ellipse

@remotion/layout-utils
  └── measureText, fillTextBox
```

## Deployment Considerations

```
Development:
  ├── Local AI backend on localhost:8000
  ├── Local studio server on localhost:3000
  └── Auto file-watching enabled

Production:
  ├── Deploy AI backend to cloud
  ├── Update AI_BACKEND_WS_URL
  ├── Configure CORS/WebSocket policies
  └── Use build outputs for rendering
```

---

This architecture provides a complete, extensible system for AI-powered video generation within Remotion Studio.

