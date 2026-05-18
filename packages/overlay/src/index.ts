import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Overlay } from "./Overlay";
import { ErrorBoundary } from "./ErrorBoundary";

interface MountOptions {
	port?: number;
}

export function mount(options: MountOptions = {}) {
	const host = document.createElement("div");
	host.id = "livestylesync-root";
	document.body.appendChild(host);
	const shadow = host.attachShadow({ mode: "open" });
	createRoot(shadow).render(
		createElement(ErrorBoundary, null,
			createElement(Overlay, { port: options.port ?? 3100 })
		)
	);
}
