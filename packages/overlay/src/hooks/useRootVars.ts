import { useState } from "react";
import { findRootVars } from "../css";
import type { RootVar } from "../types";

export function useRootVars(send: (data: object) => void) {
	const [vars, setVars] = useState<RootVar[]>([]);
	const [pending, setPending] = useState<Record<string, string>>({});

	const load = () => setVars(findRootVars());

	const handleChange = (name: string, value: string) => {
		setPending((p) => ({ ...p, [name]: value }));
	};

	const apply = () => {
		for (const [name, value] of Object.entries(pending)) {
			const def = vars.find((v) => v.name === name);
			if (!def) continue;
			send({ fileUrl: def.fileUrl, selector: def.selector, prop: name, value });
		}
		setPending({});
	};

	const reset = () => setPending({});

	return {
		vars,
		pending,
		handleChange,
		apply,
		reset,
		load,
		hasPending: Object.keys(pending).length > 0,
	};
}
