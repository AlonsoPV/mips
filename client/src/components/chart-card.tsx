import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border bg-card p-4 shadow-soft", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
