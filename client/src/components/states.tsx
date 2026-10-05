import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export function PageLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-5 w-[32rem] max-w-full" />
      <div className="grid gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-8">
      <h2 className="font-serif text-2xl">No se pudo cargar esta vista</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 p-10 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function Disclaimer({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted-foreground">{children}</p>;
}
