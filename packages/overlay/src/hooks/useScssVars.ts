import { useState } from "react";
import type { ScssVar } from "../types";

export function useScssVars(send: (data: object) => void) {
	const [vars, setVars] = useState<ScssVar[]>([]);
	const [pending, setPending] = useState<Record<string, string>>({});

	const load = () => send({ type: "list-scss-vars" });

	const handleVars = (incoming: ScssVar[]) => setVars(incoming);

	const handleChange = (fileUrl: string, name: string, value: string) => {
		setPending((p) => ({ ...p, [`${fileUrl}|||${name}`]: value }));
	};

	const apply = () => {
		for (const [key, value] of Object.entries(pending)) {
			const sep = key.indexOf("|||");
			const fileUrl = key.slice(0, sep);
			const name = key.slice(sep + 3);
			send({ type: "patch-scss-var", fileUrl, name, value });
		}
		setVars((prev) =>
			prev.map((v) => {
				const key = `${v.fileUrl}|||${v.name}`;
				return key in pending ? { ...v, value: pending[key] } : v;
			})
		);
		setPending({});
	};

	const reset = () => setPending({});

	return {
		vars,
		pending,
		handleVars,
		handleChange,
		apply,
		reset,
		load,
		hasPending: Object.keys(pending).length > 0,
	};
}
