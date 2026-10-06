import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

export const RANGES = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "90d", label: "90 días" },
  { id: "custom", label: "Personalizado" },
] as const;

const STORAGE_KEY = "mips.period";

interface StoredPeriod {
  range: string;
  from: string;
  to: string;
}

function readStored(): StoredPeriod | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPeriod) : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredPeriod) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Periodo activo. Vive en la URL (?range=…) y se recuerda durante la sesión,
 * así cambiar de pantalla no regresa a "Hoy" cuando el usuario ya eligió otro corte.
 */
export function usePeriod() {
  const [params, setParams] = useSearchParams();
  const urlRange = params.get("range");
  const stored = urlRange ? null : readStored();

  const range = urlRange || stored?.range || "today";
  const from = params.get("from") || stored?.from || "";
  const to = params.get("to") || stored?.to || "";

  useEffect(() => {
    if (urlRange) writeStored({ range: urlRange, from: params.get("from") || "", to: params.get("to") || "" });
  }, [urlRange, params]);

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
    writeStored({ range: next, from: next === "custom" ? from : "", to: next === "custom" ? to : "" });
    setParams(p);
  }

  function setCustom(nextFrom: string, nextTo: string) {
    const p = new URLSearchParams(params);
    p.set("range", "custom");
    p.set("from", nextFrom);
    p.set("to", nextTo);
    writeStored({ range: "custom", from: nextFrom, to: nextTo });
    setParams(p);
  }

  return { range, from, to, qs, setRange, setCustom };
}
