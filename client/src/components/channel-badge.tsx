import { ChannelChip } from "@/components/channel-chip";

export function ChannelBadge({ channel, label }: { channel: string; label?: string }) {
  return <ChannelChip channel={channel} label={label} />;
}
