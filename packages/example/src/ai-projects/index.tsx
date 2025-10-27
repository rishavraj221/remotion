import React, { useEffect, useState } from 'react';
import { AbsoluteFill } from 'remotion';

// Placeholder component shown when no project is active
const PlaceholderProject: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          color: '#ffffff',
          padding: 40,
        }}
      >
        <h1 style={{ fontSize: 48, marginBottom: 20, fontWeight: 'bold' }}>
          AI Video Studio
        </h1>
        <p style={{ fontSize: 24, color: '#888', marginBottom: 30 }}>
          No project generated yet
        </p>
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            padding: 20,
            borderRadius: 8,
            maxWidth: 600,
          }}
        >
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#aaa' }}>
            Chat with the AI assistant to generate your first animated video.
            <br />
            <br />
            Try prompts like:
            <br />• "Create a video with text 'Hello World' that fades in"
            <br />• "Animate a blue circle moving from left to right"
            <br />• "Show my company name with a zoom animation"
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Dynamic loader that checks for current-project.tsx
// This file is NEVER overwritten - it always stays as this smart loader
export const AIProject: React.FC = () => {
  const [ProjectComponent, setProjectComponent] =
    useState<React.FC | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Import current-project.tsx
    // If it exports null (default state), show placeholder
    // If it exports a component (after generation), show that
    // @ts-expect-error - This file exists but TypeScript may not see it during build
    import('./current-project')
      .then((module) => {
        const component = module.default || module.AIGeneratedComponent;

        // If the export is null, use placeholder
        if (component === null || component === undefined) {
          setProjectComponent(() => PlaceholderProject);
        } else {
          setProjectComponent(() => component);
        }
        setIsLoading(false);
      })
      .catch(() => {
        // Fallback: if import fails for any reason, use placeholder
        setProjectComponent(() => PlaceholderProject);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#1a1a1a',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <p style={{ color: '#888' }}>Loading...</p>
      </AbsoluteFill>
    );
  }

  if (!ProjectComponent) {
    return <PlaceholderProject />;
  }

  return <ProjectComponent />;
};

export default AIProject;
