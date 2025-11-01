import type { Server as HTTPServer } from 'node:http';
import * as path from 'node:path';
import WebSocket, { WebSocketServer } from 'ws';
import { CompositionManager } from './composition-manager';
import { generateCompositionLoader } from './composition-loader-generator';
import { validateCode, formatErrorsForLLM } from './code-validator';

export type AIWebSocketMessage = 
  | {type: 'chat'; message: string; compositionId?: string}
  | {type: 'create-composition'; name: string; width?: number; height?: number; fps?: number; durationInFrames?: number}
  | {type: 'select-composition'; compositionId: string}
  | {type: 'delete-composition'; compositionId: string}
  | {type: 'rename-composition'; compositionId: string; newName: string}
  | {type: 'duplicate-composition'; compositionId: string; newName: string; width?: number; height?: number; fps?: number; durationInFrames?: number}
  | {type: 'code-update'; file: string; content: string; action: 'create' | 'update' | 'delete'}
  | {type: 'code-generation'; code: string; prompt: string; projectName?: string; compositionId?: string}
  | {type: 'code-edit'; compositionId: string; code: string; prompt: string; width?: number; height?: number; fps?: number; durationInFrames?: number}
  | {type: 'get-compositions'}
  | {type: 'status'; status: string};

const AI_BACKEND_WS_URL = 'ws://localhost:8000';

let aiBackendConnection: WebSocket | null = null;

// Initialize composition manager
const projectRoot = path.resolve(__dirname, '../../example/src/ai-projects');
const compositionManager = new CompositionManager(projectRoot);

// Store selected composition ID per WebSocket connection
const connectionState = new Map<WebSocket, { selectedCompositionId?: string }>();

// Maximum number of retry attempts for error fixing
const MAX_ERROR_RETRY_ATTEMPTS = 3;

/**
 * Handles code editing with automatic error detection and retry
 */
async function handleCodeEditWithErrorChecking(
  compositionId: string,
  code: string,
  width: number | undefined,
  height: number | undefined,
  fps: number | undefined,
  durationInFrames: number | undefined,
  explanation: string | undefined,
  ws: WebSocket,
  retryAttempt: number = 0
): Promise<void> {
  const composition = compositionManager.getComposition(compositionId);
  if (!composition) {
    ws.send(JSON.stringify({
      type: 'code-updated',
      success: false,
      error: 'Composition not found',
      content: `❌ Composition not found`
    }));
    return;
  }

  // Update the code file
  const success = compositionManager.updateCompositionCode(compositionId, code);
  if (!success) {
    ws.send(JSON.stringify({
      type: 'code-updated',
      success: false,
      error: 'Failed to update composition file',
      content: `❌ Failed to update composition`
    }));
    return;
  }

  // Validate the code for errors
  const filePath = path.resolve(projectRoot, composition.filePath);
  const tsconfigPath = path.resolve(__dirname, '../../example/tsconfig.json');
  const validation = await validateCode(code, filePath, tsconfigPath);

  if (!validation.valid && validation.errors.length > 0) {
    console.log(`❌ Code has ${validation.errors.length} error(s), attempt ${retryAttempt + 1}/${MAX_ERROR_RETRY_ATTEMPTS}`);
    
    // If we haven't exceeded max retries, ask LLM to fix the errors
    if (retryAttempt < MAX_ERROR_RETRY_ATTEMPTS) {
      console.log('🔄 Requesting LLM to fix errors...');
      
      // Get existing code (the one that was just written, which has errors)
      const existingCode = compositionManager.getCompositionCode(compositionId);
      
      // Send error-fixing request to AI backend
      if (aiBackendConnection && aiBackendConnection.readyState === WebSocket.OPEN) {
        const errorFixPrompt = `Fix the following errors in the code:\n\n${formatErrorsForLLM(validation.errors)}`;
        
        aiBackendConnection.send(JSON.stringify({
          type: 'chat',
          message: errorFixPrompt,
          compositionId,
          existingCode: existingCode || undefined,
          previousErrors: validation.errors,
          retryAttempt: retryAttempt + 1,
        }));
        
        // Send status message to client
        ws.send(JSON.stringify({
          type: 'code-updated',
          success: false,
          hasErrors: true,
          retryAttempt: retryAttempt + 1,
          errors: validation.errors,
          content: `⚠️ Found ${validation.errors.length} error(s) in the code. Attempting to fix automatically (attempt ${retryAttempt + 1}/${MAX_ERROR_RETRY_ATTEMPTS})...`
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'code-updated',
          success: false,
          hasErrors: true,
          errors: validation.errors,
          content: `❌ Code has ${validation.errors.length} error(s) and AI backend is not available:\n\n${formatErrorsForLLM(validation.errors)}`
        }));
      }
      return;
    } else {
      // Max retries exceeded
      console.log('❌ Max retry attempts exceeded');
      ws.send(JSON.stringify({
        type: 'code-updated',
        success: false,
        hasErrors: true,
        errors: validation.errors,
        content: `❌ Unable to fix errors after ${MAX_ERROR_RETRY_ATTEMPTS} attempts. Please review the errors:\n\n${formatErrorsForLLM(validation.errors)}`
      }));
      return;
    }
  }

  // Code is valid - proceed with normal update
  // Update composition properties if provided
  if (width || height || fps || durationInFrames) {
    compositionManager.updateComposition(compositionId, {
      width,
      height,
      fps,
      durationInFrames,
    });
  }
  
  // Save assistant response to chat history
  if (explanation) {
    compositionManager.addChatMessage(compositionId, 'assistant', explanation);
  }
  
  // Regenerate composition loader in case properties changed
  generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
  
  const updatedComposition = compositionManager.getComposition(compositionId);
  
  // Send code update confirmation
  ws.send(JSON.stringify({
    type: 'code-updated',
    success: true,
    compositionId,
    composition: updatedComposition,
    content: retryAttempt > 0 
      ? `✅ Composition updated successfully after fixing errors!\n\nThe composition will hot-reload automatically.`
      : `✅ Composition updated successfully!\n\nThe composition will hot-reload automatically.`
  }));
  
  // Also send updated compositions list to refresh UI
  const compositions = compositionManager.getAllCompositions();
  ws.send(JSON.stringify({
    type: 'compositions-list',
    compositions,
  }));
}

const connectToAIBackend = () => {
  console.log(`Connecting to AI backend at ${AI_BACKEND_WS_URL}...`);

  aiBackendConnection = new WebSocket(AI_BACKEND_WS_URL);

  aiBackendConnection.onopen = () => {
    console.log('Connected to AI backend');
  };

  // Use EventEmitter API for ws library (Node.js)
  aiBackendConnection.on('message', (data: WebSocket.RawData) => {
    try {
      const messageStr = data.toString();
      console.log('Received from AI backend:', messageStr);
      // Try to parse and log prettily if it's JSON
      try {
        const parsed = JSON.parse(messageStr);
        console.log('Parsed message:', JSON.stringify(parsed, null, 2));
      } catch {
        // Not JSON, that's fine
      }
    } catch (error) {
      console.error('Error processing AI backend message for logging:', error);
    }
  });

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
  
  connectToAIBackend();

  wss.on('connection', (ws) => {
    console.log('AI WebSocket client connected');
    
    // Initialize connection state
    connectionState.set(ws, {});
    
    // Send list of compositions on connect
    const compositions = compositionManager.getAllCompositions();
    ws.send(JSON.stringify({
      type: 'compositions-list',
      compositions,
    }));

    ws.on('message', (data) => {
      try {
        const message: AIWebSocketMessage = JSON.parse(data.toString());
        console.log('Received from client:', message);

        // Handle local messages that don't need AI backend
        if (message.type === 'create-composition') {
          try {
            const composition = compositionManager.createComposition(message.name, {
              width: message.width,
              height: message.height,
              fps: message.fps,
              durationInFrames: message.durationInFrames,
            });
            
            // Regenerate composition loader
            generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
            
            ws.send(JSON.stringify({
              type: 'composition-created',
              composition,
            }));
            
            // Broadcast updated list
            const compositions = compositionManager.getAllCompositions();
            ws.send(JSON.stringify({
              type: 'compositions-list',
              compositions,
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              content: (error as Error).message || 'Failed to create composition'
            }));
          }
          return;
        }

        if (message.type === 'select-composition') {
          const state = connectionState.get(ws);
          if (state) {
            state.selectedCompositionId = message.compositionId;
          }
          
          const composition = compositionManager.getComposition(message.compositionId);
          if (composition) {
            ws.send(JSON.stringify({
              type: 'composition-selected',
              composition,
              chatHistory: composition.chatHistory,
            }));
          }
          return;
        }

        if (message.type === 'delete-composition') {
          try {
            const success = compositionManager.deleteComposition(message.compositionId);
            if (success) {
              // Regenerate composition loader
              generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
              
              ws.send(JSON.stringify({
                type: 'composition-deleted',
                compositionId: message.compositionId,
                success: true,
              }));
              
              // Send updated list
              const compositions = compositionManager.getAllCompositions();
              ws.send(JSON.stringify({
                type: 'compositions-list',
                compositions,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                content: `Failed to delete composition: composition not found`
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              content: `Failed to delete composition: ${(error as Error).message}`
            }));
          }
          return;
        }

        if (message.type === 'rename-composition') {
          try {
            const composition = compositionManager.renameComposition(message.compositionId, message.newName);
            if (composition) {
              // Regenerate composition loader (ID might have changed)
              generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
              
              ws.send(JSON.stringify({
                type: 'composition-renamed',
                oldCompositionId: message.compositionId,
                composition,
                success: true,
              }));
              
              // Send updated list
              const compositions = compositionManager.getAllCompositions();
              ws.send(JSON.stringify({
                type: 'compositions-list',
                compositions,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                content: `Failed to rename composition: composition not found`
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              content: `Failed to rename composition: ${(error as Error).message}`
            }));
          }
          return;
        }

        if (message.type === 'duplicate-composition') {
          try {
            const composition = compositionManager.duplicateComposition(message.compositionId, message.newName, {
              width: message.width,
              height: message.height,
              fps: message.fps,
              durationInFrames: message.durationInFrames,
            });
            if (composition) {
              // Regenerate composition loader
              generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
              
              ws.send(JSON.stringify({
                type: 'composition-duplicated',
                composition,
                success: true,
              }));
              
              // Send updated list
              const compositions = compositionManager.getAllCompositions();
              ws.send(JSON.stringify({
                type: 'compositions-list',
                compositions,
              }));
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                content: `Failed to duplicate composition: composition not found`
              }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              content: `Failed to duplicate composition: ${(error as Error).message}`
            }));
          }
          return;
        }

        if (message.type === 'get-compositions') {
          const compositions = compositionManager.getAllCompositions();
          ws.send(JSON.stringify({
            type: 'compositions-list',
            compositions,
          }));
          return;
        }

        // Forward chat messages to AI backend with composition context
        if (message.type === 'chat') {
          const state = connectionState.get(ws);
          const compositionId = message.compositionId || state?.selectedCompositionId;
          
          if (compositionId) {
            // Save user message to chat history
            compositionManager.addChatMessage(compositionId, 'user', message.message);
          }

          if (aiBackendConnection && aiBackendConnection.readyState === WebSocket.OPEN) {
            // If editing an existing composition, read the current code to pass to LLM
            let existingCode: string | undefined;
            if (compositionId) {
              const code = compositionManager.getCompositionCode(compositionId);
              existingCode = code || undefined;
            }
            
            // Include composition ID and existing code in message to backend
            aiBackendConnection.send(JSON.stringify({
              ...message,
              compositionId,
              existingCode,
            }));
          } else {
            console.error('AI backend not connected');
            ws.send(JSON.stringify({
              type: 'error',
              content: `AI backend not available. Please try again later.`
            }));
          }
          return;
        }

        // Forward other messages to AI backend
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

    const aiBackendMessageHandler = async (data: WebSocket.RawData) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📨 Processing AI backend message:', message.type || 'unknown');
        
        const state = connectionState.get(ws);
        const compositionId = message.compositionId || state?.selectedCompositionId;
        
        // Check if this is a code generation or edit message
        if (message.type === 'code-generation' || message.type === 'code-edit') {
          console.log('🎨 Processing code update request...');
          
          if (message.type === 'code-edit' && compositionId) {
            // Edit existing composition with error checking
            await handleCodeEditWithErrorChecking(
              compositionId,
              message.code,
              message.width,
              message.height,
              message.fps,
              message.durationInFrames,
              message.explanation,
              ws,
              message.retryAttempt || 0
            );
          } else if (message.type === 'code-generation') {
            // Legacy: Create new file (for backward compatibility)
            // This should now create a new composition if no compositionId is provided
            const projectName = message.projectName || 'new-project';
            
            if (compositionId) {
              // Edit existing
              const success = compositionManager.updateCompositionCode(compositionId, message.code);
              if (success && message.explanation) {
                compositionManager.addChatMessage(compositionId, 'assistant', message.explanation);
              }
              
              // Regenerate composition loader
              generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
              
              const composition = compositionManager.getComposition(compositionId);
              ws.send(JSON.stringify({
                type: 'code-updated',
                success: true,
                compositionId,
                composition,
                content: `✅ Composition updated successfully!`
              }));
              
              // Also send updated compositions list to refresh UI
              const compositions = compositionManager.getAllCompositions();
              ws.send(JSON.stringify({
                type: 'compositions-list',
                compositions,
              }));
            } else {
              // Create new composition
              const composition = compositionManager.createComposition(projectName);
              compositionManager.updateCompositionCode(composition.id, message.code);
              if (message.explanation) {
                compositionManager.addChatMessage(composition.id, 'assistant', message.explanation);
              }
              
              // Regenerate composition loader
              generateCompositionLoader(compositionManager, path.resolve(__dirname, '../../example/src'));
              
              ws.send(JSON.stringify({
                type: 'composition-created',
                composition,
                content: `✅ New composition created: ${composition.name}\n\nThe composition will hot-reload automatically.`
              }));
              
              // Send updated compositions list
              const compositions = compositionManager.getAllCompositions();
              ws.send(JSON.stringify({
                type: 'compositions-list',
                compositions,
              }));
              
              // Update selected composition
              if (state) {
                state.selectedCompositionId = composition.id;
              }
            }
          }
        } else if (message.type === 'response') {
          // Regular chat response - save to history
          if (compositionId && message.content) {
            compositionManager.addChatMessage(compositionId, 'assistant', message.content);
          }
          
          // Forward other messages as-is
          ws.send(data);
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
      connectionState.delete(ws);
      if (aiBackendConnection) {
        aiBackendConnection.off('message', aiBackendMessageHandler);
      }
    })
  })

  return wss;
}
