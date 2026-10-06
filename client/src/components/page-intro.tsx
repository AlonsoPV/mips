import type { ReactNode } from "react";
import { ChannelBadge } from "@/components/channel-badge";
import { channelConfig, toChannelKey, type ChannelKey } from "@/lib/channel-config";

/**
 * Cabecera de cada pantalla: pregunta → [canal] → título → veredicto.
 * Si la pantalla pertenece a un canal, la identidad va antes del título y el
 * badge dice qué representa ese canal en lenguaje de restaurante.
 */
export function PageIntro({
  question,
  channel,
  title,
  headline,
  aside,
}: {
  question: string;
  channel?: ChannelKey | string;
  title: string;
  headline: string;
  aside?: ReactNode;
}) {
  const key = channel ? toChannelKey(channel) : null;
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{question}</p>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {key && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <ChannelBadge channel={key} size="md" />
              <span className="text-[11px] text-muted-foreground">{channelConfig[key].describes}</span>
            </div>
          )}
          <h1 className="font-serif text-2xl leading-tight md:text-[1.75rem]">{title}</h1>
          <p className="mt-1 text-sm font-medium text-foreground">{headline}</p>
        </div>
        {aside}
      </header>
    </>
  );
}
