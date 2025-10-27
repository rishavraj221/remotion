# AI Video Generation - Quick Start Guide

## 🚀 Quick Overview

Generate animated videos by chatting with AI! The system converts natural language prompts into Remotion components.

## 📋 Prerequisites

- ✅ AI Backend running on `ws://localhost:8000`
- ✅ Remotion Studio running
- ✅ WebSocket connection established

## 🎯 How to Use

### Step 1: Chat
Type a prompt in the AI chat panel (right side of Remotion Studio):
```
"Create a video with text 'Hello World' that fades in"
```

### Step 2: Wait
The AI generates code and saves it automatically.

### Step 3: View
Switch to the **"ai-project"** composition in the left sidebar.

### Step 4: Edit (Optional)
Find the generated file in:
```
packages/example/src/ai-projects/generated-*.tsx
```

## 💡 Example Prompts

| Category | Prompt |
|----------|--------|
| **Text** | "Create a video with text 'Hello World' that fades in" |
| **Text** | "Show 'Welcome' text with a bounce effect" |
| **Shape** | "Animate a blue circle moving from left to right" |
| **Shape** | "Create a rotating red square" |
| **Combined** | "Show 'Hello' at the top and a spinning circle below" |

## 🔧 Technical Flow

```
User Input → Frontend (MockChatbot)
           → Studio Server (websocket-ai.ts)
           → AI Backend (port 8000)
           → LLM generates code
           → AI Backend returns JSON
           → Studio Server writes file
           → Remotion hot reloads
           → User views result
```

## 📦 Key Files

| File | Purpose |
|------|---------|
| `packages/studio/src/components/MockChatbot.tsx` | Chat UI |
| `packages/studio-server/src/websocket-ai.ts` | WebSocket handler |
| `packages/example/src/ai-projects/index.tsx` | Generated component loader |
| `packages/example/src/Root.tsx` | Composition registry |

## 🎨 Available Animations

- **Fade**: `interpolate(frame, [0, 30], [0, 1])`
- **Slide**: `interpolate(frame, [0, 30], [-100, 0])`
- **Bounce**: `spring({frame, fps, from: 0, to: 1})`
- **Rotate**: `interpolate(frame, [0, 60], [0, 360])`

## 📨 WebSocket Message Format

### From Frontend to AI Backend
```json
{
  "type": "chat",
  "message": "Create a video with..."
}
```

### From AI Backend to Studio Server
```json
{
  "type": "code-generation",
  "code": "import React from 'react'...",
  "prompt": "Create a video with...",
  "projectName": "my-video"
}
```

### From Studio Server to Frontend
```json
{
  "type": "code-generated",
  "success": true,
  "filename": "generated-my-video-1234567890.tsx",
  "prompt": "Create a video with...",
  "content": "✅ Project created successfully!"
}
```

## 🔒 Security

**Blocked imports:**
- fs, path, os
- child_process
- http, https, net

**Allowed imports:**
- react
- remotion
- @remotion/shapes
- @remotion/layout-utils

## 🎬 Composition Settings

- **ID**: `ai-project`
- **Size**: 1080 × 1920 (vertical)
- **FPS**: 30
- **Duration**: 150 frames (5 seconds)

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Video doesn't appear | Switch to "ai-project" composition |
| Code errors | Check browser console for TypeScript errors |
| WebSocket disconnected | Restart AI backend on port 8000 |
| No hot reload | Refresh browser or restart Remotion |

## 📚 Documentation

- **User Guide**: `packages/example/src/ai-projects/README.md`
- **LLM Guide**: `packages/example/src/ai-projects/BACKEND_PROMPT_GUIDE.md`
- **Full Implementation**: `IMPLEMENTATION_SUMMARY.md`

## ⚡ Quick Test

1. Start AI backend:
   ```bash
   # Your AI backend on port 8000
   ```

2. Start Remotion:
   ```bash
   cd remotion
   bun install
   turbo run make
   # Then open Studio
   ```

3. Test prompt:
   ```
   "Create a video with text 'Test' that fades in"
   ```

4. Check result:
   - Look for success message in chat
   - Switch to "ai-project" composition
   - Watch your animation!

## 🎉 Success Indicators

✅ **WebSocket Connected**: Green dot in chat header
✅ **Code Generated**: Success message in chat
✅ **File Created**: Check `ai-projects/generated-*.tsx`
✅ **Hot Reload**: Composition updates automatically
✅ **No Errors**: Browser console is clean

---

**Need help?** Check the full documentation or look at test examples in `test-examples.json`

