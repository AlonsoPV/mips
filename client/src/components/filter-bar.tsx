import { cn } from "@/lib/utils";

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="tab"
          aria-selected={value === opt.id}
          onClick={() => onChange(opt.id)}
          className={cn(
            "min-h-9 rounded-md px-3 text-sm transition",
            value === opt.id ? "bg-espresso text-[#F6F1EA]" : "bg-muted text-foreground hover:bg-accent",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
