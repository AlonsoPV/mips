import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api";

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const json = await api<T>(path);
      setData(json);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo cargar la información");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
