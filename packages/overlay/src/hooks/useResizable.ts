import { useCallback, useRef, useState } from "react";

export function useResizable(initialWidth: number, min = 200, max = 600) {
	const [width, setWidth] = useState(initialWidth);
	const startX = useRef(0);
	const startW = useRef(0);

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		startX.current = e.clientX;
		startW.current = width;

		const onMove = (ev: MouseEvent) => {
			const next = Math.min(max, Math.max(min, startW.current + ev.clientX - startX.current));
			setWidth(next);
		};
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	}, [width, min, max]);

	return { width, onResizeMouseDown: onMouseDown };
}
