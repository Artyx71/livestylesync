import { useState, useEffect, useRef } from "react";

export function Overlay() {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Element | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const overlayRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!picking) {
      if (highlightRef.current) highlightRef.current.style.display = "none";
      return;
    }

    document.body.style.cursor = "crosshair";

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (overlayRootRef.current?.contains(target)) return;

      const rect = target.getBoundingClientRect();
      const h = highlightRef.current;
      if (!h) return;
      h.style.display = "block";
      h.style.top = rect.top + window.scrollY + "px";
      h.style.left = rect.left + window.scrollX + "px";
      h.style.width = rect.width + "px";
      h.style.height = rect.height + "px";
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (overlayRootRef.current?.contains(target)) return;

      e.preventDefault();
      e.stopPropagation();
      setSelected(target);
      setPicking(false);
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("click", handleClick, true);

    return () => {
      document.body.style.cursor = "";
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("click", handleClick, true);
    };
  }, [picking]);

  return (
    <>
      <div
        ref={highlightRef}
        style={{
          display: "none",
          position: "absolute",
          pointerEvents: "none",
          outline: "2px solid #3B82F6",
          background: "rgba(59,130,246,0.08)",
          zIndex: 9998,
        }}
      />

      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: open ? "#5B21B6" : "#7C3AED",
          border: "none",
          cursor: "pointer",
          zIndex: 9999,
          padding: 0,
        }}
      />

      {open && (
        <div
          ref={overlayRootRef}
          style={{
            position: "fixed",
            bottom: 44,
            right: 20,
            width: 280,
            background: "#1a1a2e",
            border: "1px solid #7C3AED",
            borderRadius: 8,
            padding: 16,
            zIndex: 9999,
            color: "#fff",
            fontFamily: "monospace",
            fontSize: 13,
          }}
        >
          <p style={{ margin: "0 0 12px" }}>LiveStyleSync</p>

          <button
            onClick={() => setPicking((v) => !v)}
            style={{
              width: "100%",
              padding: "8px 0",
              background: picking ? "#3B82F6" : "#2d2d4e",
              color: "#fff",
              border: "1px solid " + (picking ? "#3B82F6" : "#555"),
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 12,
            }}
          >
            {picking ? "⊙ Кликни на элемент..." : "↖ Выбрать элемент"}
          </button>

          {selected && (
            <div style={{ marginTop: 12, color: "#aaa", fontSize: 11 }}>
              <p style={{ margin: "0 0 4px", color: "#7C3AED" }}>
                {selected.tagName.toLowerCase()}
                {selected.className ? "." + String(selected.className).split(" ")[0] : ""}
              </p>
              <p style={{ margin: 0 }}>элемент выбран — редактор стилей здесь</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
