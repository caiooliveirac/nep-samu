import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--samu-blue)] text-white",
        success: "bg-[var(--status-success)] text-white",
        warning: "bg-[var(--status-warning)] text-white",
        danger: "bg-[var(--status-danger)] text-white",
        info: "bg-[var(--status-info)] text-white",
        neutral: "bg-[var(--status-neutral)] text-white",
        promoted: "bg-[var(--status-promoted)] text-white",
        outline:
          "border border-[var(--border-default)] text-[var(--text-secondary)]",
        orange: "bg-[var(--samu-orange)] text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
