import { ChannelIcon } from "@/components/channel-icon";
import { channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export type ChannelBadgeVariant = "soft" | "outline" | "plain";
export type ChannelBadgeSize = "sm" | "md";

/**
 * Identidad de canal: icono + nombre + acento. Es la unidad mínima de reconocimiento
 * y la única forma de etiquetar la fuente de un dato en toda la aplicación.
 *
 * - soft     píldora con fondo suave (encabezados, KPIs, tarjetas)
 * - outline  píldora con borde (sobre fondos ya tintados)
 * - plain    icono + texto sin fondo (tablas, listas, estados; menos ruido)
 *
 * Acepta las claves de la API (`uber_eats`, `ot`, `wa`) además de las del sistema.
 */
export function ChannelBadge({
  channel,
  variant = "soft",
  size = "sm",
  showLabel = true,
  label,
  onDark = false,
  className,
}: {
  channel: ChannelKey | string;
  variant?: ChannelBadgeVariant;
  size?: ChannelBadgeSize;
  showLabel?: boolean;
  /** Sobrescribe el nombre (p. ej. "Míps" en lugar de "Míps POS"). */
  label?: string;
  onDark?: boolean;
  className?: string;
}) {
  const key = toChannelKey(channel);
  const cfg = channelConfig[key];
  const text = label ?? cfg.label;
  const color = onDark ? cfg.accentOnDark : cfg.accent;

  const base = cn(
    "inline-flex shrink-0 items-center whitespace-nowrap font-medium leading-none",
    size === "sm" ? "gap-1 text-[11px]" : "gap-1.5 text-xs",
  );

  const shape =
    variant === "plain"
      ? ""
      : cn(
          "rounded-full",
          size === "sm" ? (showLabel ? "px-2 py-[3px]" : "p-1") : showLabel ? "px-2.5 py-1" : "p-1.5",
          variant === "soft" && cn(cfg.softBackground, color),
          variant === "outline" && cn("border bg-card", cfg.border, color),
        );

  return (
    <span
      className={cn(base, shape, variant === "plain" && (onDark ? "text-[#E8DFD4]" : "text-foreground"), className)}
      title={showLabel ? undefined : text}
      aria-label={showLabel ? undefined : text}
    >
      <ChannelIcon channel={key} size={size === "sm" ? "xs" : "sm"} onDark={onDark} className={variant === "plain" ? color : undefined} />
      {showLabel && <span>{text}</span>}
    </span>
  );
}
