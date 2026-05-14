import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Overlay } from "./Overlay";
import { ErrorBoundary } from "./ErrorBoundary";

interface MountOptions {
	port?: number;
}

export function mount(options: MountOptions = {}) {
	const container = document.createElement("div");
	container.id = "livestylesync-root";
	document.body.appendChild(container);
	createRoot(container).render(
		createElement(ErrorBoundary, null,
			createElement(Overlay, { port: options.port ?? 3100 })
		)
	);
}
