export interface ComponentInfo {
	name: string;
	props: Record<string, string | number | boolean>;
}

const SKIP = new Set(["children", "className", "style", "ref", "key", "__source", "__self"]);

function primitiveProps(raw: Record<string, unknown>): Record<string, string | number | boolean> {
	const out: Record<string, string | number | boolean> = {};
	for (const [k, v] of Object.entries(raw)) {
		if (SKIP.has(k)) continue;
		if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
	}
	return out;
}

function fromVue(el: Element): ComponentInfo | null {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const r = el as any;
	const v3 = r.__vueParentComponent;
	if (v3) {
		const name = v3.type?.name || v3.type?.__name || "Anonymous";
		return { name, props: primitiveProps(v3.props ?? {}) };
	}
	const v2 = r.__vue__;
	if (v2) {
		const name = v2.$options?.name || "Anonymous";
		return { name, props: primitiveProps(v2.$props ?? {}) };
	}
	return null;
}

function fromReact(el: Element): ComponentInfo | null {
	const fiberKey = Object.keys(el).find((k) => k.startsWith("__reactFiber"));
	if (!fiberKey) return null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let fiber: any = (el as any)[fiberKey];
	while (fiber) {
		const type = fiber.type;
		if (typeof type === "function" && /^[A-Z]/.test(type.displayName || type.name || "")) {
			const name: string = type.displayName || type.name;
			const props = primitiveProps(fiber.memoizedProps ?? {});
			return { name, props };
		}
		fiber = fiber.return ?? null;
	}
	return null;
}

export function useComponentInfo(selected: Element | null): ComponentInfo | null {
	if (!selected) return null;
	try {
		return fromVue(selected) ?? fromReact(selected);
	} catch {
		return null;
	}
}
