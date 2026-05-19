import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: { componentStack: string }) {
		console.error("[LSS] render error:", error);
		console.error("[LSS] component stack:", info.componentStack);
	}

	render() {
		if (this.state.error) {
			return (
				<div
					style={{
						position: "fixed",
						bottom: 20,
						right: 20,
						background: "#7f1d1d",
						border: "1px solid #ef4444",
						borderRadius: 8,
						padding: "8px 12px",
						color: "#fca5a5",
						fontFamily: "monospace",
						fontSize: 11,
						zIndex: 9999,
						maxWidth: 280,
					}}
				>
					LSS error: {this.state.error.message}
				</div>
			);
		}

		return this.props.children;
	}
}
