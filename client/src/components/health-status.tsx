import { ChannelStatus } from "@/components/channel-status";

/** Alias histórico. La barra de estado vive en ChannelStatus. */
export function HealthStatus(props: Parameters<typeof ChannelStatus>[0]) {
  return <ChannelStatus {...props} />;
}
