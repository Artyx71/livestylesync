import { useEffect, useRef, useState } from "react";

const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export type WsStatus = "connected" | "disconnected" | "reconnecting";

export function useWebSocket(url: string, onMessage?: (data: unknown) => void) {
	const ws = useRef<WebSocket | null>(null);
	const attempt = useRef(0);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const destroyed = useRef(false);
	const onMessageRef = useRef(onMessage);
	const queue = useRef<string[]>([]);
	const [status, setStatus] = useState<WsStatus>("disconnected");

	useEffect(() => { onMessageRef.current = onMessage; });

	useEffect(() => {
		destroyed.current = false;

		function connect() {
			if (destroyed.current) return;
			const socket = new WebSocket(url);
			ws.current = socket;

			socket.onopen = () => {
				attempt.current = 0;
				setStatus("connected");
				console.log("[LSS] connected");
				while (queue.current.length > 0) {
					socket.send(queue.current.shift()!);
				}
			};

			socket.onclose = () => {
				if (destroyed.current) return;
				const delay = BACKOFF_MS[Math.min(attempt.current, BACKOFF_MS.length - 1)];
				attempt.current += 1;
				setStatus("reconnecting");
				console.log(`[LSS] disconnected — reconnecting in ${delay}ms (attempt ${attempt.current})`);
				timer.current = setTimeout(connect, delay);
			};

			socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);
					onMessageRef.current?.(data);
				} catch { /* ignore malformed */ }
			};
		}

		connect();

		return () => {
			destroyed.current = true;
			if (timer.current) clearTimeout(timer.current);
			ws.current?.close();
		};
	}, [url]);

	const send = (data: object) => {
		const msg = JSON.stringify(data);
		if (ws.current?.readyState === WebSocket.OPEN) {
			ws.current.send(msg);
		} else {
			queue.current.push(msg);
		}
	};

	return { send, status };
}
