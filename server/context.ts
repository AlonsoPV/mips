import { AsyncLocalStorage } from "node:async_hooks";
export interface AccessContext { restaurantId: string; role: "owner" | "viewer" | "connector"; userId?: string; channel?: string }
export const accessContext = new AsyncLocalStorage<AccessContext>();
export function currentAccess(): AccessContext {
  const context = accessContext.getStore();
  if (!context) throw Object.assign(new Error("Contexto de acceso requerido"), { status: 401 });
  return context;
}
export function restaurantId() { return currentAccess().restaurantId; }
