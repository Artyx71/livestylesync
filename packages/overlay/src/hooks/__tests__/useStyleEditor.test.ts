import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/preact";
import { useStyleEditor } from "../useStyleEditor";
import type { RuleGroup } from "../../types";

const mockSend = vi.fn();

vi.mock("../../css", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../../css")>();
	return {
		...actual,
		findAllSourceStyles: vi.fn(() => []),
	};
});

import { findAllSourceStyles } from "../../css";
const mockFind = findAllSourceStyles as ReturnType<typeof vi.fn>;

const group = (overrides: Partial<RuleGroup> = {}): RuleGroup => ({
	fileUrl: "/src/App.css",
	selector: "h1",
	label: "h1",
	styles: { color: "blue", "font-size": "16px" },
	...overrides,
});

beforeEach(() => {
	mockSend.mockClear();
	mockFind.mockReturnValue([]);
});

describe("useStyleEditor", () => {
	describe("инициализация при смене selected", () => {
		it("загружает группы при выборе элемента", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			const { result } = renderHook(() => useStyleEditor(el, mockSend));
			expect(result.current.ruleGroups).toHaveLength(1);
			expect(result.current.ruleGroups[0].selector).toBe("h1");
		});

		it("сбрасывает состояние при смене элемента", () => {
			mockFind.mockReturnValue([group()]);
			const el1 = document.createElement("h1");
			const { result, rerender } = renderHook(
				({ el }: { el: Element | null }) => useStyleEditor(el, mockSend),
				{ initialProps: { el: el1 } }
			);

			act(() => result.current.handleChange("color", "red"));
			expect(Object.keys(result.current.allPending)).toHaveLength(1);

			mockFind.mockReturnValue([group({ selector: "p" })]);
			const el2 = document.createElement("p");
			rerender({ el: el2 });
			expect(result.current.allPending).toEqual({});
			expect(result.current.activeIdx).toBe(0);
		});

		it("не делает ничего при selected = null", () => {
			const { result } = renderHook(() => useStyleEditor(null, mockSend));
			expect(result.current.ruleGroups).toHaveLength(0);
			expect(result.current.activeGroup).toBeNull();
		});
	});

	describe("handleChange", () => {
		it("обновляет pending и groupStyles", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			Object.defineProperty(el, "style", { value: { setProperty: vi.fn() }, writable: false });
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.handleChange("color", "red"));
			const key = result.current.ruleGroups[0].fileUrl + "|||" + result.current.ruleGroups[0].selector + "|||" + (result.current.ruleGroups[0].mediaQuery ?? "");
			expect(result.current.totalPending).toBe(1);
		});

		it("no-op если нет activeGroup", () => {
			const { result } = renderHook(() => useStyleEditor(null, mockSend));
			act(() => result.current.handleChange("color", "red"));
			expect(result.current.totalPending).toBe(0);
		});
	});

	describe("refresh", () => {
		it("сбрасывает activeIdx если текущий индекс вышел за пределы", () => {
			mockFind.mockReturnValue([group(), group({ selector: "p", label: "p" })]);
			const el = document.createElement("div");
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.setActiveIdx(1));
			expect(result.current.activeIdx).toBe(1);

			// после refresh с одной группой индекс 1 → сброс в 0
			mockFind.mockReturnValue([group()]);
			act(() => result.current.refresh());
			expect(result.current.activeIdx).toBe(0);
		});

		it("сохраняет activeIdx если он валиден", () => {
			mockFind.mockReturnValue([group(), group({ selector: "p", label: "p" })]);
			const el = document.createElement("div");
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.setActiveIdx(1));

			// refresh с двумя группами — индекс 1 остаётся
			mockFind.mockReturnValue([group(), group({ selector: "p", label: "p" })]);
			act(() => result.current.refresh());
			expect(result.current.activeIdx).toBe(1);
		});

		it("сбрасывает allPending после refresh", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			Object.defineProperty(el, "style", { value: { setProperty: vi.fn() }, writable: false });
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.handleChange("color", "red"));
			expect(result.current.totalPending).toBe(1);

			act(() => result.current.refresh());
			expect(result.current.totalPending).toBe(0);
		});
	});

	describe("applyToFile", () => {
		it("отправляет WS сообщения для каждого pending изменения", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			Object.defineProperty(el, "style", { value: { setProperty: vi.fn() }, writable: false });
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.handleChange("color", "red"));
			act(() => result.current.applyToFile(result.current.groupStyles));

			expect(mockSend).toHaveBeenCalledWith(
				expect.objectContaining({ fileUrl: "/src/App.css", selector: "h1", prop: "color", value: "red" })
			);
		});

		it("очищает allPending после apply", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			Object.defineProperty(el, "style", { value: { setProperty: vi.fn() }, writable: false });
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.handleChange("color", "red"));
			act(() => result.current.applyToFile(result.current.groupStyles));
			expect(result.current.totalPending).toBe(0);
		});
	});

	describe("handleAdd", () => {
		it("добавляет новое свойство в pending", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			Object.defineProperty(el, "style", { value: { setProperty: vi.fn() }, writable: false });
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => {
				result.current.setNewProp("letter-spacing");
				result.current.setNewValue("0.05em");
			});
			act(() => result.current.handleAdd());
			expect(result.current.totalPending).toBe(1);
			expect(result.current.newProp).toBe("");
			expect(result.current.newValue).toBe("");
		});

		it("no-op при пустом prop или value", () => {
			mockFind.mockReturnValue([group()]);
			const el = document.createElement("h1");
			const { result } = renderHook(() => useStyleEditor(el, mockSend));

			act(() => result.current.setNewProp("color"));
			act(() => result.current.handleAdd());
			expect(result.current.totalPending).toBe(0);
		});
	});
});
