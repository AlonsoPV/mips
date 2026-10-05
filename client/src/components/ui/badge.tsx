import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "success" | "warning" | "danger" | "copper" }) {
  const tones = {
    neutral: "bg-muted text-foreground",
    success: "bg-olive/15 text-olive",
    warning: "bg-amber/15 text-amber",
    danger: "bg-merlot/15 text-merlot",
    copper: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
