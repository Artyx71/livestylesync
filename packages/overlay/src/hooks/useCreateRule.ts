import { useState } from "react";

export function useCreateRule(
	selected: Element | null,
	send: (data: object) => void,
	onCreated: () => void,
) {
	const [files, setFiles] = useState<string[]>([]);
	const [loadingFiles, setLoadingFiles] = useState(false);
	const [chosenFile, setChosenFile] = useState<string>("");
	const [prop, setProp] = useState("");
	const [value, setValue] = useState("");

	const requestFiles = () => {
		setLoadingFiles(true);
		send({ type: "list-files" });
	};

	const handleFiles = (incoming: string[]) => {
		setFiles(incoming);
		setLoadingFiles(false);
		if (incoming.length > 0) setChosenFile(incoming[0]);
	};

	const selector = (() => {
		if (!selected) return "";
		const tag = selected.tagName.toLowerCase();
		const id = selected.id ? `#${selected.id}` : "";
		const cls = selected.classList[0] ? `.${selected.classList[0]}` : "";
		return id || cls || tag;
	})();

	const create = () => {
		if (!chosenFile || !prop.trim() || !value.trim()) return;
		try { document.querySelector(selector); } catch { return; }
		send({ type: "create-rule", fileUrl: chosenFile, selector, prop: prop.trim(), value: value.trim() });
		setProp("");
		setValue("");
		setFiles([]);
		onCreated();
	};

	const reset = () => {
		setFiles([]);
		setProp("");
		setValue("");
		setChosenFile("");
		setLoadingFiles(false);
	};

	return {
		files,
		loadingFiles,
		chosenFile,
		setChosenFile,
		prop,
		setProp,
		value,
		setValue,
		selector,
		requestFiles,
		handleFiles,
		create,
		reset,
	};
}
