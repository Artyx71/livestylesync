import { useEffect, useRef } from "react";

export function useWebSocket(url: string) {
	const ws = useRef<WebSocket | null>(null);

	useEffect(() => {
		ws.current = new WebSocket(url);

		ws.current.onopen = () => {
			console.log("[LSS] connected");
		};

		ws.current.onclose = () => {
			console.log("[LSS] disconnected");
		};

		return () => {
			ws.current?.close();
		};
	}, [url]);

	const send = (data: object) => {
		if (ws.current?.readyState === WebSocket.OPEN) {
			ws.current.send(JSON.stringify(data));
		}
	};
	return { send };
}
