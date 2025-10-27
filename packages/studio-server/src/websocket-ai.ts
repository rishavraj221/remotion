import type { Server as HTTPServer } from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import WebSocket, { WebSocketServer } from 'ws';

export type AIWebSocketMessage = 
  | {type: 'chat'; message: string}
  | {type: 'code-update'; file: string; content: string; action: 'create' | 'update' | 'delete'}
  | {type: 'code-generation'; code: string; prompt: string; projectName?: string}
  | {type: 'status'; status: string};

const AI_BACKEND_WS_URL = 'ws://localhost:8000';

let aiBackendConnection: WebSocket | null = null;

// Helper function to write AI-generated code to file
const writeAIProject = (code: string, _prompt: string, projectName?: string): {success: boolean; filename?: string; error?: string} => {
  try {
    // Get the ai-projects directory path
    // Assuming this file is in studio-server/src, we need to go to example/src/ai-projects
    const projectRoot = path.resolve(__dirname, '../../example/src/ai-projects');
    
    // Ensure directory exists
    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    // Generate filename
    const timestamp = Date.now();
    const safeName = projectName 
      ? projectName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
      : 'project';
    const filename = `generated-${safeName}-${timestamp}.tsx`;
    const filepath = path.join(projectRoot, filename);

    // Write the generated code
    fs.writeFileSync(filepath, code, 'utf-8');

    // Create/update current-project.tsx to point to this new file
    // This file is imported by index.tsx dynamically
    // Since it's in .gitignore, it won't persist across restarts
    const currentProjectPath = path.join(projectRoot, 'current-project.tsx');
    const reExportStatement = `// Auto-generated: Current active project\n// This file is temporary and will be reset on browser refresh/restart\nimport AIGeneratedComponent from './${filename.replace('.tsx', '')}';\n\nexport { AIGeneratedComponent };\nexport default AIGeneratedComponent;\n`;
    
    fs.writeFileSync(currentProjectPath, reExportStatement, 'utf-8');

    console.log(`✅ AI project written to: ${filepath}`);
    console.log(`✅ Current project updated: current-project.tsx → ${filename}`);
    
    return { success: true, filename };
  } catch (error) {
    console.error('❌ Error writing AI project:', error);
    return { success: false, error: String(error) };
  }
};

// Reset current-project.tsx to default state on studio start
const resetCurrentProject = () => {
  try {
    const projectRoot = path.resolve(__dirname, '../../example/src/ai-projects');
    const currentProjectPath = path.join(projectRoot, 'current-project.tsx');
    
    const defaultContent = `/**
 * This file is auto-managed by the AI backend.
 * 
 * DEFAULT STATE: Exports null (shows placeholder)
 * AFTER GENERATION: Gets overwritten to export the generated component
 * 
 * Note: This file is tracked in git to prevent build errors,
 * but will be overwritten dynamically during runtime.
 */

// Default export is null - this tells index.tsx to show placeholder
export default null;
`;
    
    fs.writeFileSync(currentProjectPath, defaultContent, 'utf-8');
    console.log('✅ Reset current-project.tsx to default state');
  } catch (error) {
    console.error('⚠️ Could not reset current-project.tsx:', error);
  }
};

const connectToAIBackend = () => {
  console.log(`Connecting to AI backend at ${AI_BACKEND_WS_URL}...`);

  aiBackendConnection = new WebSocket(AI_BACKEND_WS_URL);

  aiBackendConnection.onopen = () => {
    console.log('Connected to AI backend');
  };

  aiBackendConnection.onmessage = (data) => {
    console.log('Received from AI backend:', data.toString());
  };

  aiBackendConnection.onerror = (error) => {
    console.error('AI backend connection error:', error);
  };

  aiBackendConnection.onclose = () => {
    console.log('AI backend connection closed');
    aiBackendConnection = null;
    setTimeout(connectToAIBackend, 5000);
  };
}

export const makeAIWebSocketServer = (server: HTTPServer) => {
  const wss = new WebSocketServer({ server, path: '/ai-ws' });

  // Reset to default state on studio start
  resetCurrentProject();
  
  connectToAIBackend();

  wss.on('connection', (ws) => {
    console.log('AI WebSocket client connected');

    ws.on('message', (data) => {
      try {
        const message: AIWebSocketMessage = JSON.parse(data.toString());
        console.log('Received from client:', message);

        if (aiBackendConnection && aiBackendConnection.readyState === WebSocket.OPEN) {
          aiBackendConnection.send(JSON.stringify(message));
        } else {
          console.error('AI backend not connected');
          ws.send(JSON.stringify({
            type: 'error',
            content: `AI backend not available. Please try again later.`
          }));
        }

      } catch (error) {
        console.error('Websocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          content: `Failed to process message`
        }));
      }
    });

    const aiBackendMessageHandler = (data: WebSocket.RawData) => {
      console.log('Received from AI backend:', data.toString());
      
      try {
        const message = JSON.parse(data.toString());

        console.log('Message:', message);
        
        // Check if this is a code generation message
        if (message.type === 'code-generation') {
          console.log('🎨 Processing code generation request...');
          const result = writeAIProject(message.code, message.prompt, message.projectName);
          
          if (result.success) {
            // Send success message to frontend
            ws.send(JSON.stringify({
              type: 'code-generated',
              success: true,
              filename: result.filename,
              prompt: message.prompt,
              content: `✅ Project created successfully! File: ${result.filename}\n\nThe composition will hot-reload automatically.`
            }));
          } else {
            // Send error message to frontend
            ws.send(JSON.stringify({
              type: 'code-generated',
              success: false,
              error: result.error,
              content: `❌ Failed to create project: ${result.error}`
            }));
          }
        } else {
          // Forward other messages as-is
          ws.send(data);
        }
      } catch (error) {
        console.error('Error processing AI backend message:', error);
        ws.send(data); // Forward as-is if parsing fails
      }
    }

    if (aiBackendConnection) {
      aiBackendConnection.on('message', aiBackendMessageHandler);
    }
    
    ws.on('close', () => {
      console.log('AI WebSocket client disconnected');
      if (aiBackendConnection) {
        aiBackendConnection.off('message', aiBackendMessageHandler);
      }
    })
  })

  return wss;
}
