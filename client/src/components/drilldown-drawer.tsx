import { Sheet, SheetContent } from "@/components/ui/sheet";

export function DrilldownDrawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto bg-card text-foreground">
        <h2 className="pr-8 font-serif text-xl">{title}</h2>
        <div className="mt-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
