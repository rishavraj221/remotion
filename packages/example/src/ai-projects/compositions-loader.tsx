import React, { useEffect, useState, Suspense } from 'react';
import { Composition } from 'remotion';

interface CompositionMetadata {
  id: string;
  name: string;
  filePath: string;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  createdAt: number;
  updatedAt: number;
  chatHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
}

// This will be populated at runtime by reading the metadata file
// For now, we'll use a simple approach: dynamically import files based on metadata
export const DynamicCompositions: React.FC = () => {
  const [compositions, setCompositions] = useState<CompositionMetadata[]>([]);

  useEffect(() => {
    // Try to load metadata - in a real scenario, this would be done server-side
    // For now, we'll use a different approach: scan for composition files
    const loadCompositions = async () => {
      try {
        // In development, we can't easily read the JSON file from the browser
        // So we'll rely on the file system being updated and hot-reloaded
        // The actual loading will be handled by the server sending updates
        // For now, return empty - compositions will be registered via dynamic imports
      } catch (error) {
        console.error('Error loading compositions:', error);
      }
    };

    loadCompositions();
  }, []);

  // Since we can't easily read files from browser, we'll use a different approach:
  // The server will watch for composition files and we'll import them dynamically
  // For now, return null - we'll handle this via server-side composition registration
  return null;
};

