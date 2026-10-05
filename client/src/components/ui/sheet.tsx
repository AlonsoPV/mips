import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({ children, ...props }: Dialog.DialogProps) {
  return <Dialog.Root {...props}>{children}</Dialog.Root>;
}
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  className,
  children,
  side = "left",
}: {
  className?: string;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-espresso/40" />
      <Dialog.Content
        className={cn(
          "fixed z-50 h-full w-72 bg-espresso p-4 text-[#F6F1EA] shadow-soft",
          side === "left" ? "left-0 top-0" : "right-0 top-0",
          className,
        )}
      >
        {children}
        <Dialog.Close className="absolute right-3 top-3 rounded p-2 hover:bg-white/10" aria-label="Cerrar">
          <X className="h-4 w-4" />
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
