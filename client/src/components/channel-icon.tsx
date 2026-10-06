import { channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export type ChannelIconSize = "xs" | "sm" | "md" | "lg";

const SIZE: Record<ChannelIconSize, string> = {
  xs: "h-3 w-3",
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const RING: Record<ChannelIconSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/**
 * Icono del canal con su acento. `ring` lo envuelve en un círculo con el fondo suave
 * del canal (para encabezados, flujo del Hub y navegación).
 */
export function ChannelIcon({
  channel,
  size = "sm",
  ring = false,
  onDark = false,
  className,
}: {
  channel: ChannelKey | string;
  size?: ChannelIconSize;
  ring?: boolean;
  onDark?: boolean;
  className?: string;
}) {
  const cfg = channelConfig[toChannelKey(channel)];
  const Icon = cfg.icon;
  const color = onDark ? cfg.accentOnDark : cfg.accent;

  if (ring) {
    return (
      <span
        className={cn("inline-flex shrink-0 items-center justify-center rounded-full", RING[size], cfg.softBackground, className)}
        aria-hidden
      >
        <Icon className={cn(SIZE[size], color)} strokeWidth={2} />
      </span>
    );
  }
  return <Icon className={cn("shrink-0", SIZE[size], color, className)} strokeWidth={2} aria-hidden />;
}
