import React, { useCallback, useRef, useState, useEffect, useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { BACKGROUND, INPUT_BACKGROUND, BLUE, TEXT_COLOR } from '../helpers/colors';
import { Internals } from 'remotion';
import 'highlight.js/styles/github-dark.css';

const container: React.CSSProperties = {
	height: '100%',
	width: '100%',
	display: 'flex',
	flexDirection: 'column',
	backgroundColor: BACKGROUND,
	padding: '16px',
	fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const messagesContainer: React.CSSProperties = {
	flex: 1,
	overflowY: 'auto',
	marginBottom: '16px',
	display: 'flex',
	flexDirection: 'column',
	gap: '10px',
	paddingRight: '4px',
};

const messageStyle: React.CSSProperties = {
	padding: '10px 14px',
	borderRadius: '6px',
	maxWidth: '85%',
	wordWrap: 'break-word',
	fontSize: '13px',
	lineHeight: '1.5',
	letterSpacing: '0.01em',
};

const userMessageStyle: React.CSSProperties = {
	...messageStyle,
	backgroundColor: BLUE,
	color: '#ffffff',
	alignSelf: 'flex-end',
	marginLeft: 'auto',
	boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
};

const botMessageStyle: React.CSSProperties = {
	...messageStyle,
	backgroundColor: INPUT_BACKGROUND,
	color: '#e8e8e8',
	alignSelf: 'flex-start',
	border: '1px solid rgba(255, 255, 255, 0.05)',
};

const inputContainer: React.CSSProperties = {
	display: 'flex',
	gap: '8px',
	alignItems: 'center',
};

const inputStyle: React.CSSProperties = {
	flex: 1,
	padding: '10px 12px',
	backgroundColor: INPUT_BACKGROUND,
	border: '1px solid rgba(255, 255, 255, 0.08)',
	borderRadius: '6px',
	color: TEXT_COLOR,
	fontSize: '13px',
	outline: 'none',
	fontFamily: 'inherit',
	transition: 'border-color 0.2s ease',
};

const buttonStyle: React.CSSProperties = {
	padding: '10px 18px',
	backgroundColor: BLUE,
	color: '#ffffff',
	border: 'none',
	borderRadius: '6px',
	cursor: 'pointer',
	fontSize: '13px',
	fontWeight: '500',
	fontFamily: 'inherit',
	transition: 'background-color 0.2s ease',
	boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
};

const headerStyle: React.CSSProperties = {
	fontSize: '13px',
	fontWeight: '600',
	color: TEXT_COLOR,
	marginBottom: '16px',
	paddingBottom: '12px',
	borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
	letterSpacing: '0.02em',
	display: 'flex',
	alignItems: 'center',
	gap: '8px',
};

const statusStyle: React.CSSProperties = {
	fontSize: '10px',
	color: '#555',
	fontStyle: 'italic',
	padding: '4px 8px',
	backgroundColor: 'rgba(255, 255, 255, 0.01)',
	borderRadius: '3px',
	alignSelf: 'center',
	textAlign: 'center',
	maxWidth: '100%',
	opacity: 0.6,
};

const loadingStyle: React.CSSProperties = {
	...messageStyle,
	backgroundColor: INPUT_BACKGROUND,
	color: '#888',
	alignSelf: 'flex-start',
	border: '1px solid rgba(255, 255, 255, 0.05)',
	fontStyle: 'italic',
};

const markdownStyles = `
.markdown-content {
	word-wrap: break-word;
	overflow-wrap: break-word;
	font-size: 13px;
	line-height: 1.5;
}

.markdown-content p {
	margin: 0 0 6px 0;
	font-size: 13px;
}

.markdown-content p:last-child {
	margin-bottom: 0;
}

.markdown-content code {
	background-color: rgba(0, 0, 0, 0.4);
	padding: 2px 5px;
	border-radius: 3px;
	font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
	font-size: 11px;
	color: #e8e8e8;
}

.markdown-content pre {
	background-color: rgba(0, 0, 0, 0.5) !important;
	padding: 10px !important;
	border-radius: 5px;
	overflow-x: auto;
	margin: 6px 0;
}

.markdown-content pre code {
	background-color: transparent;
	padding: 0;
	font-size: 11px;
	line-height: 1.4;
}

.markdown-content strong {
	font-weight: 600;
	color: #fff;
	font-size: inherit;
}

.markdown-content em {
	font-style: italic;
	font-size: inherit;
}

.markdown-content a {
	color: #4ade80;
	text-decoration: underline;
	font-size: inherit;
}

.markdown-content a:hover {
	color: #22c55e;
}

.markdown-content ul, .markdown-content ol {
	margin: 6px 0;
	padding-left: 18px;
	font-size: 13px;
}

.markdown-content li {
	margin: 2px 0;
	font-size: 13px;
}

.markdown-content blockquote {
	border-left: 2px solid #4ade80;
	padding-left: 10px;
	margin: 6px 0;
	color: #aaa;
	font-size: 13px;
}

.markdown-content table {
	border-collapse: collapse;
	width: 100%;
	margin: 6px 0;
	font-size: 12px;
}

.markdown-content th, .markdown-content td {
	border: 1px solid rgba(255, 255, 255, 0.1);
	padding: 4px 8px;
	text-align: left;
	font-size: 12px;
}

.markdown-content th {
	background-color: rgba(255, 255, 255, 0.05);
	font-weight: 600;
}

.markdown-content h1, .markdown-content h2, .markdown-content h3, 
.markdown-content h4, .markdown-content h5, .markdown-content h6 {
	margin: 8px 0 4px 0;
	font-weight: 600;
}

.markdown-content h1 { font-size: 15px; }
.markdown-content h2 { font-size: 14px; }
.markdown-content h3 { font-size: 13px; }
.markdown-content h4 { font-size: 13px; }
.markdown-content h5 { font-size: 13px; }
.markdown-content h6 { font-size: 13px; }
`;

type Message = {
	text: string;
	sender: 'user' | 'bot' | 'status';
	timestamp: Date;
};

interface Composition {
	id: string;
	name: string;
	width: number;
	height: number;
	fps: number;
	durationInFrames: number;
	createdAt: number;
	updatedAt: number;
	chatHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
}

export const MockChatbot: React.FC = () => {
	const [messages, setMessages] = useState<Message[]>([
		{
			text: 'Hello! I\'m your video assistant. How can I help you today?',
			sender: 'bot',
			timestamp: new Date(),
		},
	]);
	const [input, setInput] = useState('');
	const [connected, setConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [compositions, setCompositions] = useState<Composition[]>([]);
	const [selectedCompositionId, setSelectedCompositionId] = useState<string | null>(null);
	const wsRef = useRef<WebSocket | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Get currently selected composition from Remotion
	const { canvasContent } = useContext(Internals.CompositionManager);

	// Auto-select composition when it's selected in the sidebar
	useEffect(() => {
		if (canvasContent && canvasContent.type === 'composition') {
			const compositionId = canvasContent.compositionId;
			// Always sync with sidebar selection
			if (compositionId !== selectedCompositionId) {
				setSelectedCompositionId(compositionId);
				// Send select message to backend to load chat history
				if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
					wsRef.current.send(JSON.stringify({
						type: 'select-composition',
						compositionId: compositionId,
					}));
				}
			}
		}
	}, [canvasContent, selectedCompositionId]);

	useEffect(() => {
		const ws = new WebSocket('ws://localhost:3000/ai-ws');

		ws.onopen = () => {
			console.log('WebSocket connected');
			setConnected(true);
			setMessages((prev) => [
				...prev,
				{
					text: 'Connected to AI Backend',
					sender: 'status',
					timestamp: new Date()
				}
			]);

			// Request compositions list
			ws.send(JSON.stringify({ type: 'get-compositions' }));
		}

		ws.onmessage = async (event) => {
			console.log('🔵 [Frontend] Raw message received:', event.data);

			try {
				let messageText: string;

				// Handle Blob data
				if (event.data instanceof Blob) {
					console.log('🔵 [Frontend] Message is a Blob, reading as text...');
					messageText = await event.data.text();
				} else {
					messageText = event.data;
				}

				console.log('🔵 [Frontend] Message text:', messageText);

				const data = JSON.parse(messageText);
				console.log('🔵 [Frontend] Parsed data:', data);
				console.log('🔵 [Frontend] Content:', data.content);

				setIsLoading(false); // Stop loading indicator

				// Handle different message types
				if (data.type === 'workflow-progress') {
					// Handle workflow progress updates
					const agentIcons = ['🎬', '🎨', '📝', '💻'];
					const icon = agentIcons[data.agentNumber - 1] || '🤖';
					
					let progressText = '';
					if (data.status === 'start') {
						progressText = `${icon} **${data.agentName}** - Starting...`;
					} else if (data.status === 'complete') {
						progressText = `${icon} **${data.agentName}** - Complete ✅`;
					} else if (data.status === 'clarification') {
						progressText = `${icon} **${data.agentName}** - Needs clarification`;
					}
					
					if (data.details) {
						progressText += `\n${data.details}`;
					}
					
					if (data.progress !== undefined) {
						progressText += `\n_Progress: ${Math.round(data.progress)}%_`;
					}
					
					setMessages((prev) => [
						...prev,
						{
							text: progressText,
							sender: 'status',
							timestamp: new Date(),
						},
					]);
					return;
				}

				if (data.type === 'clarification-needed') {
					// Handle clarification request
					setIsLoading(false);
					
					let clarificationText = `**${data.explanation || 'I need more information to proceed'}**\n\n`;
					
					if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
						clarificationText += '**Please provide:**\n\n';
						data.questions.forEach((q: string | { question: string; suggestions?: string[] }, index: number) => {
							if (typeof q === 'string') {
								clarificationText += `${index + 1}. ${q}\n`;
							} else {
								clarificationText += `${index + 1}. ${q.question}\n`;
								if (q.suggestions && q.suggestions.length > 0) {
									clarificationText += `   _Suggestions: ${q.suggestions.join(', ')}_\n`;
								}
							}
						});
					}
					
					clarificationText += '\n_Reply to this message with your answers._';
					
					setMessages((prev) => [
						...prev,
						{
							text: clarificationText,
							sender: 'bot',
							timestamp: new Date(),
						},
					]);
					return;
				}

				if (data.type === 'compositions-list') {
					setCompositions(data.compositions || []);
					// Don't auto-select - let user select from sidebar
					return;
				}

				if (data.type === 'composition-selected') {
					// Update selected composition ID first
					setSelectedCompositionId(data.composition.id);
					
					// Clear existing messages and load chat history for the selected composition
					if (data.chatHistory && Array.isArray(data.chatHistory) && data.chatHistory.length > 0) {
						const historyMessages: Message[] = data.chatHistory.map((msg: { role: string; content: string; timestamp?: number }) => ({
							text: msg.content,
							sender: msg.role === 'user' ? 'user' : 'bot',
							timestamp: new Date(msg.timestamp || Date.now()),
						}));
						setMessages([
							{
								text: `📂 Switched to composition: **${data.composition.name}**`,
								sender: 'status',
								timestamp: new Date(),
							},
							...historyMessages,
						]);
					} else {
						// No chat history - start fresh for this composition
						setMessages([
							{
								text: `📂 **${data.composition.name}**\n\nHello! How can I help you edit this composition?`,
								sender: 'bot',
								timestamp: new Date(),
							},
						]);
					}
					return;
				}

				if (data.type === 'composition-created') {
					// Add composition to list if it doesn't exist
					setCompositions((prev) => {
						if (prev.some(c => c.id === data.composition.id)) {
							return prev; // Already exists
						}
						return [...prev, data.composition];
					});
					
					// Select the new composition
					setSelectedCompositionId(data.composition.id);
					
					// Request to select it (which will switch chat context)
					if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
						wsRef.current.send(JSON.stringify({ 
							type: 'select-composition', 
							compositionId: data.composition.id 
						}));
					}
				}

				if (data.type === 'asset-uploaded') {
					setMessages((prev) => [
						...prev,
						{
							text: `✅ Asset uploaded successfully: **${data.asset.originalFilename}**\n\nYou can now use this asset in your composition. The AI will automatically reference it when generating code.`,
							sender: 'bot',
							timestamp: new Date(),
						},
					]);
					return;
				}

				// Handle code-updated messages from studio-server (after code is saved)
				if (data.type === 'code-updated') {
					setIsLoading(false);
					
					if (data.success) {
						// Code was saved successfully
						let messageContent = `✅ **Code updated successfully!**\n\n`;
						
						if (data.content) {
							messageContent += `${data.content}\n\n`;
						}
						
						if (data.compositionId) {
							const composition = data.composition || compositions.find(c => c.id === data.compositionId);
							const compositionName = composition?.name || data.compositionId;
							messageContent += `**Tip:** Switch to the "${compositionName}" composition in the sidebar to view your video!`;
						}
						
						setMessages((prev) => [
							...prev,
							{
								text: messageContent,
								sender: 'bot',
								timestamp: new Date(),
							},
						]);
						
						// Update compositions list if new composition was created
						if (data.composition) {
							setCompositions((prev) => {
								if (prev.some(c => c.id === data.composition.id)) {
									return prev.map(c => c.id === data.composition.id ? data.composition : c);
								}
								return [...prev, data.composition];
							});
						}
						
						// Select the composition if provided
						if (data.compositionId) {
							setSelectedCompositionId(data.compositionId);
							if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
								wsRef.current.send(JSON.stringify({ 
									type: 'select-composition', 
									compositionId: data.compositionId 
								}));
							}
						}
					} else {
						// Code update failed
						let errorMessage = `❌ **Failed to update code**\n\n`;
						if (data.content) {
							errorMessage += data.content;
						}
						if (data.error) {
							errorMessage += `\n\nError: ${data.error}`;
						}
						if (data.hasErrors && data.errors) {
							errorMessage += `\n\nFound ${data.errors.length} error(s) in the code.`;
						}
						
						setMessages((prev) => [
							...prev,
							{
								text: errorMessage,
								sender: 'bot',
								timestamp: new Date(),
							},
						]);
					}
					return;
				}

				// Handle legacy code-generation messages (for backward compatibility, though studio-server should convert these)
				if (data.type === 'code-generation' || data.type === 'code-edit') {
					setIsLoading(false);
					
					// If this is a new composition, ensure it's selected and chat is switched
					if (data.type === 'code-generation' && data.compositionId) {
						// New composition created - select it and switch chat context
						const newCompositionId = data.compositionId;
						
						// Check if composition is already in our list
						if (!compositions.some(c => c.id === newCompositionId)) {
							// Composition not in list yet - will be added by composition-created message
							// But we can set it as selected now
							setSelectedCompositionId(newCompositionId);
							
							// Request to select it (which will load chat history)
							if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
								wsRef.current.send(JSON.stringify({ 
									type: 'select-composition', 
									compositionId: newCompositionId 
								}));
							}
						} else {
							// Composition already exists - just select it
							setSelectedCompositionId(newCompositionId);
							if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
								wsRef.current.send(JSON.stringify({ 
									type: 'select-composition', 
									compositionId: newCompositionId 
								}));
							}
						}
					}
					
					let messageContent = `✅ **Code ${data.type === 'code-generation' ? 'generated' : 'updated'} successfully!**\n\n`;
					
					if (data.explanation) {
						messageContent += `${data.explanation}\n\n`;
					}
					
					if (data.compositionId || data.projectName) {
						const compositionName = data.compositionId || data.projectName;
						messageContent += `**Tip:** Switch to the "${compositionName}" composition in the sidebar to view your video!`;
					}
					
					setMessages((prev) => [
						...prev,
						{
							text: messageContent,
							sender: 'bot',
							timestamp: new Date(),
						},
					]);
					return;
				}

				if (data.type === 'response') {
					setIsLoading(false);
					let messageContent = data.content || JSON.stringify(data);
					if (data.success) {
						messageContent = `${data.content}\n\n**Tip:** Switch to the "${data.compositionId || 'composition'}" composition in the sidebar to view your video!`;
					} else {
						messageContent = data.content;
					}
					
					const newMessage = {
						text: messageContent,
						sender: 'bot' as const,
						timestamp: new Date()
					};

					console.log('🔵 [Frontend] Adding message:', newMessage);

					setMessages((prev) => {
						console.log('🔵 [Frontend] Previous messages count:', prev.length);
						const updated = [...prev, newMessage];
						console.log('🔵 [Frontend] New messages count:', updated.length);
						return updated;
					});
					return;
				}

				// Fallback for any other message types not explicitly handled
				if (data.content || data.message) {
					const messageContent = data.content || data.message || JSON.stringify(data);
					const newMessage = {
						text: messageContent,
						sender: 'bot' as const,
						timestamp: new Date()
					};

					console.log('🔵 [Frontend] Adding fallback message:', newMessage);

					setMessages((prev) => {
						console.log('🔵 [Frontend] Previous messages count:', prev.length);
						const updated = [...prev, newMessage];
						console.log('🔵 [Frontend] New messages count:', updated.length);
						return updated;
					});
				}
			} catch (error) {
				console.error('❌ [Frontend] Failed to parse message:', error);
				setIsLoading(false); // Stop loading on error too
			}
		}

		ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			setMessages((prev) => [
				...prev,
				{
					text: 'Connection error',
					sender: 'status',
					timestamp: new Date()
				}
			])
		}

		ws.onclose = () => {
			console.log('WebSocket disconnected');
			setConnected(false);
			setMessages((prev) => [
				...prev,
				{
					text: 'Disconnected from AI Backend',
					sender: 'status',
					timestamp: new Date()
				}
			])
		}

		wsRef.current = ws;

		return () => {
			ws.close();
		}
	}, []);

	// Auto-scroll to bottom when new messages arrive or loading state changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isLoading]);

	const handleSend = useCallback(() => {
		if (!input.trim() || !wsRef.current) return;

		// Allow chat even without selectedCompositionId - will create new composition
		// But if we have a selectedCompositionId, use it
		const compositionIdToUse = selectedCompositionId;

		const userMessage: Message = {
			text: input,
			sender: 'user',
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setIsLoading(true); // Start loading indicator

		// Get current composition details for editing (if editing)
		const currentComposition = compositionIdToUse 
			? compositions.find(c => c.id === compositionIdToUse)
			: null;
		
		wsRef.current.send(JSON.stringify({
			type: 'chat',
			message: input,
			compositionId: compositionIdToUse || undefined, // undefined = new composition
			// Include metadata for editing (backend will get code from its state store)
			width: currentComposition?.width,
			height: currentComposition?.height,
			fps: currentComposition?.fps,
			durationInFrames: currentComposition?.durationInFrames,
		}));

		setInput('');
	}, [input, selectedCompositionId, compositions]);


	const handleKeyPress = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === 'Enter') {
				handleSend();
			}
		},
		[handleSend],
	);

	const handleFileUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || files.length === 0 || !wsRef.current || !selectedCompositionId) return;

			for (const file of Array.from(files)) {
				// Check file size (limit to 10MB)
				if (file.size > 10 * 1024 * 1024) {
					setMessages((prev) => [
						...prev,
						{
							text: `⚠️ File ${file.name} is too large. Maximum size is 10MB.`,
							sender: 'status',
							timestamp: new Date(),
						},
					]);
					continue;
				}

				try {
					// Show uploading message
					setMessages((prev) => [
						...prev,
						{
							text: `📤 Uploading ${file.name}...`,
							sender: 'status',
							timestamp: new Date(),
						},
					]);

					// Convert file to base64
					const reader = new FileReader();
					reader.onload = async (event) => {
						const base64 = event.target?.result as string;
						// Remove data URL prefix
						const base64Data = base64.split(',')[1] || base64;

						// Send upload message
						wsRef.current?.send(JSON.stringify({
							type: 'upload-asset',
							file: base64Data,
							filename: file.name,
							mimeType: file.type || 'application/octet-stream',
							compositionId: selectedCompositionId,
							tags: [],
							description: `Uploaded: ${file.name}`,
						}));
					};

					reader.onerror = () => {
						setMessages((prev) => [
							...prev,
							{
								text: `❌ Failed to read file ${file.name}`,
								sender: 'status',
								timestamp: new Date(),
							},
						]);
					};

					reader.readAsDataURL(file);
				} catch (error) {
					setMessages((prev) => [
						...prev,
						{
							text: `❌ Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
							sender: 'status',
							timestamp: new Date(),
						},
					]);
				}
			}

			// Reset file input
			e.target.value = '';
		},
		[selectedCompositionId],
	);


	return (
		<div style={container} className="css-reset">
			<style>{markdownStyles}</style>
			<div style={headerStyle}>
				<span style={{
					width: '8px',
					height: '8px',
					borderRadius: '50%',
					backgroundColor: connected ? '#4ade80' : '#ef4444',
				}} />
				Kureita AI
				{canvasContent && canvasContent.type === 'composition' && (
					<>
						<span style={{ opacity: 0.5, margin: '0 8px' }}>•</span>
						<span style={{ opacity: 0.7, fontWeight: 400 }}>
							{canvasContent.compositionId}
						</span>
					</>
				)}
			</div>
			<div style={messagesContainer}>
				{messages.map((message, index) => (
					<div
						key={index}
						style={
							message.sender === 'user'
								? userMessageStyle
								: message.sender === 'status'
									? statusStyle
									: botMessageStyle
						}
					>
						<div className="markdown-content">
							<ReactMarkdown
								remarkPlugins={[remarkGfm]}
								rehypePlugins={[rehypeHighlight]}
							>
								{message.text}
							</ReactMarkdown>
						</div>
					</div>
				))}
				{isLoading && (
					<div style={loadingStyle}>
						Just a min...
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>
			<div style={inputContainer}>
				{selectedCompositionId && (
					<label
						style={{
							...buttonStyle,
							opacity: connected ? 1 : 0.5,
							cursor: connected ? 'pointer' : 'not-allowed',
							marginRight: '8px',
							display: 'inline-flex',
							alignItems: 'center',
							justifyContent: 'center',
							padding: '10px 14px',
						}}
					>
						📎 Upload
						<input
							type="file"
							multiple
							onChange={handleFileUpload}
							style={{ display: 'none' }}
							disabled={!connected}
							accept="image/*,audio/*,video/*"
						/>
					</label>
				)}
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder={
						selectedCompositionId 
							? `Type your message to edit "${compositions.find(c => c.id === selectedCompositionId)?.name || 'composition'}..."` 
							: "Type your message to create a new video..."
					}
					style={inputStyle}
					disabled={!connected}
				/>
				<button
					onClick={handleSend}
					style={{
						...buttonStyle,
						opacity: connected ? 1 : 0.5,
						cursor: connected ? 'pointer' : 'not-allowed',
					}}
					disabled={!connected}
				>
					Send
				</button>
			</div>
		</div>
	);
};

