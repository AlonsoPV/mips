import { useEffect, useState } from "react";
import { AppShell } from "./app-shell";
import { api } from "@/lib/api";

/**
 * La demo no pide cuenta. Carga el restaurante simulado y entra directo.
 */
export function SessionGate() {
  const [restaurantName, setRestaurantName] = useState("Restaurante Demo");
  useEffect(() => {
    void api<{ restaurantName?: string }>("/api/auth/me")
      .then((s) => {
        if (s.restaurantName) setRestaurantName(s.restaurantName);
      })
      .catch(() => undefined);
  }, []);
  return <AppShell restaurantName={restaurantName} mode="demo" />;
}
