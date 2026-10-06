import { ChannelBadge } from "@/components/channel-badge";
import type { ChannelKey } from "@/lib/channel-config";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  channel,
  action,
  children,
  className,
}: {
  title: string;
  /** Fuente de la gráfica. Va junto al título, antes de leer los datos. */
  channel?: ChannelKey;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card p-4 shadow-soft", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {channel && <ChannelBadge channel={channel} size="sm" />}
          <h2 className="font-serif text-lg">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
