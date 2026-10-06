import { ChannelBadge } from "@/components/channel-badge";
import { SOURCE_CHANNELS, channelConfig, type ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

/**
 * Leyenda inline y discreta: qué fuentes contiene una gráfica o agregado.
 * No es una leyenda global; se usa sólo donde se mezclan canales.
 */
export function ChannelLegend({
  channels = SOURCE_CHANNELS,
  showUnit = true,
  className,
}: {
  channels?: ChannelKey[];
  showUnit?: boolean;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground", className)}>
      {channels.map((c) => (
        <li key={c} className="inline-flex items-center gap-1">
          <ChannelBadge channel={c} variant="plain" />
          {showUnit && <span>· {channelConfig[c].unit.plural}</span>}
        </li>
      ))}
    </ul>
  );
}
