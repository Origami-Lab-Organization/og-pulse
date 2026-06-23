import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // DS Origami UI: pill, gap p/ dot, semântica em par subtle (fundo) + emphasis (texto)
  "inline-flex items-center gap-1.5 rounded-pill border border-transparent px-2.5 py-1 text-xs font-semibold leading-none transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-muted text-muted-foreground",
        neutral: "bg-muted text-muted-foreground",
        success: "bg-success-subtle text-success-emphasis",
        warning: "bg-warning-subtle text-warning-emphasis",
        destructive: "bg-destructive-subtle text-destructive-emphasis",
        info: "bg-info-subtle text-info-emphasis",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
