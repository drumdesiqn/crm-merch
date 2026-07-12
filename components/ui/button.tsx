import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-teal-cpm text-white hover:bg-teal-cpm/85 shadow",
        destructive: "bg-red-mars text-white hover:bg-red-700",
        outline: "border border-slate-200 dark:border-[#2e2e30] bg-white dark:bg-[#1a1a1b] hover:bg-slate-50 dark:hover:bg-[#222223] text-slate-900 dark:text-zinc-100",
        secondary: "bg-slate-100 dark:bg-[#222223] text-slate-900 dark:text-zinc-100 hover:bg-slate-200 dark:hover:bg-[#2e2e30]",
        ghost: "hover:bg-slate-100 dark:hover:bg-[#222223] text-slate-700 dark:text-zinc-300 hover:text-teal-cpm",
        link: "text-teal-cpm underline-offset-4 hover:underline",
        success: "bg-green-cpm text-white hover:bg-green-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
