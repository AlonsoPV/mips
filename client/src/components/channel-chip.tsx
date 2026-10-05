import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  uber_eats: "bg-[#06C167]/15 text-[#047a3e]",
  opentable: "bg-[#DA3743]/12 text-[#9b242c]",
  whatsapp: "bg-[#25D366]/15 text-[#128C4A]",
  mips: "bg-primary/10 text-primary",
};

export function ChannelChip({ channel, label }: { channel: string; label?: string }) {
  const names: Record<string, string> = {
    uber_eats: "Uber Eats",
    opentable: "OpenTable",
    whatsapp: "WhatsApp",
    mips: "Míps POS",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", colors[channel] ?? "bg-muted")}>
      {label ?? names[channel] ?? channel}
    </span>
  );
}
