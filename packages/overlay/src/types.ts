export interface RuleGroup {
	fileUrl: string;
	selector: string;
	label: string;
	styles: Record<string, string>;
	mediaQuery?: string;
}

export interface RawRule {
	selectorText: string;
	parentSelectors: string[];
	mediaQuery?: string;
	style: CSSStyleDeclaration;
}
