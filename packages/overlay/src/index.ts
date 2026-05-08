import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { Overlay } from "./Overlay";

export function mount() {
	const container = document.createElement("div");
	container.id = "livestylesync-root";
	document.body.appendChild(container);
	createRoot(container).render(createElement(Overlay));
}
