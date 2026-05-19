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

export interface RawRule {
	selectorText: string;
	parentSelectors: string[];
	mediaQuery?: string;
	style: CSSStyleDeclaration;
}
