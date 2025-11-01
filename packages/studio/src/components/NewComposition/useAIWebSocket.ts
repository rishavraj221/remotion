import {useEffect, useRef, useState} from 'react';

export const useAIWebSocket = () => {
	const wsRef = useRef<WebSocket | null>(null);
	const [connected, setConnected] = useState(false);

	useEffect(() => {
		const ws = new WebSocket('ws://localhost:3000/ai-ws');
		
		ws.onopen = () => {
			setConnected(true);
		};

		ws.onclose = () => {
			setConnected(false);
		};

		ws.onerror = () => {
			setConnected(false);
		};

		wsRef.current = ws;

		return () => {
			ws.close();
		};
	}, []);

	const sendMessage = (message: any): Promise<any> => {
		const ws = wsRef.current;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			return Promise.reject(new Error('WebSocket not connected'));
		}

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error('Request timed out'));
			}, 10000);

			const messageHandler = (event: MessageEvent) => {
				try {
					const data = JSON.parse(event.data.toString());
					
					// Handle different response types
					if (data.type === 'error') {
						clearTimeout(timeout);
						ws.removeEventListener('message', messageHandler);
						reject(new Error(data.content || 'Operation failed'));
					} else if (
						data.type === 'composition-deleted' ||
						data.type === 'composition-renamed' ||
						data.type === 'composition-duplicated'
					) {
						clearTimeout(timeout);
						ws.removeEventListener('message', messageHandler);
						resolve(data);
					}
				} catch (err) {
					// Ignore parse errors, keep waiting
				}
			};

			ws.addEventListener('message', messageHandler);
			ws.send(JSON.stringify(message));
		});
	};

	return {connected, sendMessage};
};

