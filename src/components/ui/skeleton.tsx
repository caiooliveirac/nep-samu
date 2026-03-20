import { cn } from "@/lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-[var(--bg-tertiary)]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
