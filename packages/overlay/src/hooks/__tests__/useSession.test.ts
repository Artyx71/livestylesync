import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useRef } from "react";
import { useSession } from "../useSession";
import type { LogEntry } from "../../types";

const mockSend = vi.fn();

const entry = (overrides: Partial<LogEntry> = {}): LogEntry => ({
	fileUrl: "/src/App.css",
	selector: "h1",
	prop: "color",
	value: "red",
	oldValue: "blue",
	timestamp: 1,
	...overrides,
});

function renderSession(selected: Element | null = null) {
	return renderHook(() => {
		const selectedRef = useRef(selected);
		selectedRef.current = selected;
		return useSession({ send: mockSend, selected, selectedRef });
	});
}

beforeEach(() => {
	mockSend.mockClear();
	Object.assign(navigator, {
		clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
	});
});

describe("useSession", () => {
	describe("pushBatch", () => {
		it("добавляет batch с инкрементным id", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry()]));
			expect(result.current.batches).toHaveLength(1);
			expect(result.current.batches[0].id).toBe(1);
			expect(result.current.hasBatches).toBe(true);
		});

		it("игнорирует пустой массив", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([]));
			expect(result.current.batches).toHaveLength(0);
			expect(result.current.hasBatches).toBe(false);
		});

		it("накапливает несколько batches", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry()]));
			act(() => result.current.pushBatch([entry({ prop: "font-size", value: "24px", oldValue: "16px" })]));
			expect(result.current.batches).toHaveLength(2);
		});
	});

	describe("appliedState", () => {
		it("trackApplied/getApplied работают", () => {
			const { result } = renderSession();
			const key = "/src/App.css|||h1|||color|||";
			act(() => result.current.appliedState.current.set(key, "#fff"));
			expect(result.current.appliedState.current.get(key)).toBe("#fff");
		});

		it("очищается при смене selected", () => {
			const el1 = document.createElement("div");
			const { result, rerender } = renderHook(
				({ selected }: { selected: Element | null }) => {
					const selectedRef = useRef(selected);
					selectedRef.current = selected;
					return useSession({ send: mockSend, selected, selectedRef });
				},
				{ initialProps: { selected: el1 } }
			);
			act(() => result.current.appliedState.current.set("key1", "red"));
			expect(result.current.appliedState.current.get("key1")).toBe("red");

			const el2 = document.createElement("span");
			rerender({ selected: el2 });
			expect(result.current.appliedState.current.get("key1")).toBeUndefined();
		});
	});

	describe("undoLast", () => {
		it("убирает последний batch", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry()]));
			act(() => result.current.undoLast());
			expect(result.current.batches).toHaveLength(0);
		});

		it("no-op при пустом списке", () => {
			const { result } = renderSession();
			act(() => result.current.undoLast());
			expect(result.current.batches).toHaveLength(0);
			expect(mockSend).not.toHaveBeenCalled();
		});

		it("отправляет WS патч со старым значением", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry({ value: "red", oldValue: "blue" })]));
			act(() => result.current.undoLast());
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({ prop: "color", value: "blue", selector: "h1" })
			);
		});

		it("для SCSS var отправляет patch-scss-var", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry({ isScssVar: true, selector: "$scss-var", prop: "$primary", value: "#fff", oldValue: "#000" })]));
			act(() => result.current.undoLast());
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({ type: "patch-scss-var", name: "$primary", value: "#000" })
			);
		});

		it("обновляет appliedState на oldValue", () => {
			const { result } = renderSession();
			act(() => {
				result.current.appliedState.current.set("/src/App.css|||h1|||color|||", "red");
				result.current.pushBatch([entry({ value: "red", oldValue: "blue" })]);
			});
			act(() => result.current.undoLast());
			expect(result.current.appliedState.current.get("/src/App.css|||h1|||color|||")).toBe("blue");
		});
	});

	describe("restore", () => {
		it("отправляет WS и добавляет обратный batch", () => {
			const { result } = renderSession();
			const batch = { id: 1, entries: [entry({ value: "red", oldValue: "blue" })] };
			act(() => result.current.restore(batch));
			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({ prop: "color", value: "blue" })
			);
			expect(result.current.batches).toHaveLength(1);
			// обратный batch: value и oldValue меняются местами
			expect(result.current.batches[0].entries[0].value).toBe("blue");
			expect(result.current.batches[0].entries[0].oldValue).toBe("red");
		});
	});

	describe("exportDiff", () => {
		it("копирует diff в clipboard", async () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry()]));
			await act(async () => result.current.exportDiff());
			expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining("LiveStyleSync session diff")
			);
		});

		it("diff содержит selector и prop", async () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry({ selector: "h1", prop: "color", value: "red" })]));
			await act(async () => result.current.exportDiff());
			const text = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
			expect(text).toContain("h1");
			expect(text).toContain("color: red");
		});

		it("SCSS vars идут в отдельный комментарий", async () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry({ isScssVar: true, selector: "$scss-var", prop: "$primary", value: "#fff" })]));
			await act(async () => result.current.exportDiff());
			const text = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
			expect(text).toContain("SCSS variables changed");
			expect(text).toContain("$primary: #fff");
		});
	});

	describe("pendingRefresh", () => {
		it("устанавливается в true после undoLast", () => {
			const { result } = renderSession();
			act(() => result.current.pushBatch([entry()]));
			act(() => result.current.undoLast());
			expect(result.current.pendingRefresh.current).toBe(true);
		});

		it("устанавливается в true после restore", () => {
			const { result } = renderSession();
			const batch = { id: 1, entries: [entry()] };
			act(() => result.current.restore(batch));
			expect(result.current.pendingRefresh.current).toBe(true);
		});
	});
});
