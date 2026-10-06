import type { ReactNode } from "react";
import { ChannelBadge } from "@/components/channel-badge";

export function PageIntro({
  question,
  channel,
  title,
  headline,
  aside,
}: {
  question: string;
  channel?: string;
  title: string;
  headline: string;
  aside?: ReactNode;
}) {
  return (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{question}</p>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {channel && (
            <div className="mb-1.5">
              <ChannelBadge channel={channel} />
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
