import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // DS Origami UI: retangular (raio 8px), foco visível, hover ESCURECE (cor sólida, nunca opacity)
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold leading-none ring-offset-background transition-colors duration-fast ease-ds focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-px disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:translate-y-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
        outline: "border border-input bg-background text-foreground hover:bg-muted hover:border-muted-foreground",
        secondary: "border border-input bg-card text-foreground hover:bg-muted",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        link: "font-medium text-primary underline-offset-4 hover:underline hover:text-primary-hover",
        gradient: "bg-gradient-brand text-white font-semibold hover:opacity-90",
      },
      size: {
        default: "h-10 px-4 py-2.5",
        sm: "h-9 px-3 text-[0.8125rem]",
        lg: "h-11 px-[22px] text-[0.9375rem]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
