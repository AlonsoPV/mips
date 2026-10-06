import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const active = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    active.current?.abort();
    if (!path) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError(null);
    try {
      const json = await api<T>(path, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setData(json);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof ApiError ? e.message : "No se pudo cargar la información");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
    return () => active.current?.abort();
  }, [load]);

  return { data, loading, error, reload: load };
}
