import { useSearchParams } from "react-router-dom";

export const RANGES = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "custom", label: "Personalizado" },
] as const;

export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const range = params.get("range") || "30d";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  const qs = (() => {
    const p = new URLSearchParams();
    if (range === "custom" && from && to) {
      p.set("from", from);
      p.set("to", to);
    } else {
      p.set("range", range === "custom" ? "30d" : range);
    }
    return `?${p.toString()}`;
  })();

  function setRange(next: string) {
    const p = new URLSearchParams(params);
    p.set("range", next);
    if (next !== "custom") {
      p.delete("from");
      p.delete("to");
    }
    setParams(p);
  }

  function setCustom(nextFrom: string, nextTo: string) {
    const p = new URLSearchParams(params);
    p.set("range", "custom");
    p.set("from", nextFrom);
    p.set("to", nextTo);
    setParams(p);
  }

  return { range, from, to, qs, setRange, setCustom };
}
