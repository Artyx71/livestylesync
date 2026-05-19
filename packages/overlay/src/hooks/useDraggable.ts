import { useCallback, useRef, useState } from "react";

export function useDraggable(initial: { x: number; y: number }) {
	const [pos, setPos] = useState(initial);
	const dragging = useRef(false);
	const origin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

	const onMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		dragging.current = true;
		origin.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

		const onMove = (ev: MouseEvent) => {
			if (!dragging.current) return;
			setPos({
				x: origin.current.px + ev.clientX - origin.current.mx,
				y: origin.current.py + ev.clientY - origin.current.my,
			});
		};
		const onUp = () => {
			dragging.current = false;
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	}, [pos]);

	return { pos, onMouseDown };
}
