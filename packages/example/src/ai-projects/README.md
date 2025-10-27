# AI-Generated Projects

This directory contains AI-generated Remotion components created through the chat interface.

## Overview

The AI Video Studio allows you to generate animated videos by simply describing what you want in natural language. The AI will generate Remotion component code that you can view, edit, and render.

## How It Works

1. **Chat with the AI**: Open the Remotion Studio and use the AI chat panel on the right
2. **Describe your video**: Tell the AI what kind of animation you want
3. **Code Generation**: The AI generates a Remotion component (TSX file) 
4. **Auto-Import**: The generated file is automatically saved and imported
5. **View Result**: Switch to the "ai-project" composition to see your video
6. **Hot Reload**: Any changes to the generated code will automatically update

## Example Prompts

### Text Animations

```
Create a video with text "Hello World" that fades in
```

```
Show "Welcome" text with a bounce effect using spring animation
```

```
Animate the title "My Company" sliding in from the left
```

### Shape Animations

```
Animate a blue circle moving from left to right
```

```
Create a rotating square that changes color from red to blue
```

```
Show multiple circles appearing with staggered timing
```

### Combined Animations

```
Create a video with "Hello" text at the top and a spinning circle below it
```

```
Animate text "Subscribe" with a background that fades in
```

```
Show a countdown timer from 3 to 1 with scaling animation
```

## Available APIs

The AI can use the following Remotion APIs and components:

### Core Remotion
- `useCurrentFrame()` - Get the current frame number
- `useVideoConfig()` - Get video configuration (fps, width, height, durationInFrames)
- `AbsoluteFill` - Full-screen container
- `Sequence` - Time-based sequences
- `interpolate()` - Interpolate values based on frame
- `spring()` - Spring physics animations

### Shapes (from @remotion/shapes)
- `Circle` - Animated circles
- `Rect` - Rectangles
- `Triangle` - Triangles
- `Ellipse` - Ellipses
- `Star` - Stars

### Common Patterns

#### Fade In
```typescript
const opacity = interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

#### Slide In
```typescript
const translateX = interpolate(frame, [0, 30], [-100, 0], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
});
```

#### Spring Animation
```typescript
const scale = spring({
  frame,
  fps,
  config: {
    damping: 100,
    stiffness: 200,
    mass: 0.5,
  },
});
```

#### Rotation
```typescript
const rotation = interpolate(frame, [0, 60], [0, 360]);
```

## File Structure

```
ai-projects/
├── README.md                          # This file
├── template.ts                        # Code generation utilities
├── index.tsx                          # Auto-updated to import latest project
├── .gitignore                         # Ignores generated files
└── generated-{name}-{timestamp}.tsx   # AI-generated components
```

## Composition Settings

The `ai-project` composition is registered in `Root.tsx` with these defaults:

- **Width**: 1080px (vertical video format)
- **Height**: 1920px (TikTok/Instagram Reels format)
- **FPS**: 30
- **Duration**: 150 frames (5 seconds)

These can be modified by the AI in the generated code if needed.

## Tips for Better Results

1. **Be Specific**: Instead of "make a video", say "create a video with text 'Hello' that fades in"
2. **Mention Colors**: Specify colors like "blue circle" or "red text"
3. **Describe Timing**: "fade in over 1 second" or "appear at frame 30"
4. **Reference Elements**: "text at the top" or "circle in the center"
5. **Use Simple Animations**: The AI works best with basic animations like fade, slide, scale, rotate

## Limitations

- The AI generates simple to medium complexity animations
- Complex interactions or user input are not supported
- External API calls or data fetching are blocked for security
- File size is limited to 50KB per generated component
- Dangerous Node.js modules (fs, child_process, etc.) are blocked

## Editing Generated Code

All generated files are saved in this directory with the pattern:
`generated-{name}-{timestamp}.tsx`

You can:
1. Open the file directly to edit it
2. Copy the code to a new location for long-term use
3. Delete old generated files (they're gitignored)

The `index.tsx` file is automatically updated to import the latest generation, so your edits will immediately appear in the composition.

## Troubleshooting

### Video Doesn't Appear
- Make sure you've switched to the "ai-project" composition in the sidebar
- Check the browser console for TypeScript or React errors
- Verify the generated file exists in the ai-projects directory

### Compilation Errors
- The AI-generated code may have syntax errors
- Check the browser console for specific error messages
- You can manually edit the generated file to fix issues

### Hot Reload Not Working
- Remotion Studio should automatically detect file changes
- Try refreshing the browser if changes don't appear
- Check that the file was actually written (check terminal logs)

## Security

For security, the following are blocked in generated code:
- File system access (fs module)
- Child processes (child_process module)
- Network access (http, https, net modules)
- Operating system access (os module)
- Path manipulation (path module for security reasons)

## Backend Integration

The AI backend should send messages in this format:

```json
{
  "type": "code-generation",
  "code": "import React from 'react'...",
  "prompt": "Create a video with...",
  "projectName": "my-video"
}
```

The studio-server will:
1. Validate the code
2. Write it to a file
3. Update index.tsx
4. Send confirmation to the frontend

## Next Steps

After generating a video:
1. **Preview**: View it in the Studio
2. **Edit**: Modify the generated code if needed
3. **Render**: Use `npx remotion render` to export
4. **Reuse**: Copy the component to a permanent location

Happy creating! 🎬

