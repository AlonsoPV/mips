import { ChannelIcon } from "@/components/channel-icon";
import type { ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

/**
 * Cifra protagonista: hora pico, % de conversión, ticket. El número se lee
 * antes que el texto; el canal queda a la vista.
 */
export function BigNumber({
  value,
  label,
  hint,
  channel,
  className,
}: {
  value: string;
  label: string;
  hint?: string;
  channel?: ChannelKey;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-md bg-muted/60 px-3 py-2.5", className)}>
      {channel && <ChannelIcon channel={channel} size="md" ring />}
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-serif text-3xl tabular leading-none tracking-tight md:text-4xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function PeakHour({
  hour,
  channel,
  caption,
  hint,
  className,
}: {
  hour: number;
  channel?: ChannelKey;
  caption: string;
  hint?: string;
  className?: string;
}) {
  return (
    <BigNumber
      channel={channel}
      value={`${String(hour).padStart(2, "0")}:00`}
      label={caption}
      hint={hint}
      className={className}
    />
  );
}
