export interface RuleGroup {
	fileUrl: string;
	selector: string;
	label: string;
	styles: Record<string, string>;
	mediaQuery?: string;
	isTailwind?: boolean;
}

export interface RootVar {
	name: string;
	value: string;
	fileUrl: string;
	selector: string;
}

export interface ScssVar {
	name: string;
	value: string;
	fileUrl: string;
}

export interface RawRule {
	selectorText: string;
	parentSelectors: string[];
	mediaQuery?: string;
	style: CSSStyleDeclaration;
}

export type LogEntry = {
	fileUrl: string;
	selector: string;
	prop: string;
	value: string;
	oldValue: string;
	mediaQuery?: string;
	timestamp: number;
	isScssVar?: boolean;
};

export type LogBatch = { id: number; entries: LogEntry[] };
