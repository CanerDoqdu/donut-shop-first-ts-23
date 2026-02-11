import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default:
          'bg-linear-to-r from-[#FF6BBF] to-[#FF8C42] text-white shadow-lg hover:shadow-xl hover:from-[#FF5BAF] hover:to-[#FF7D32]',
        secondary:
          'bg-linear-to-r from-[#FF8C42] to-[#FFD93D] text-white shadow-lg hover:shadow-xl hover:from-[#FF7D32] hover:to-[#FFC92D]',
        outline:
          'border-2 border-[#FF6BBF] bg-transparent text-[#FF6BBF] hover:bg-[#FF6BBF] hover:text-white',
        ghost: 'hover:bg-[#FFF8E7] hover:text-[#FF6BBF]',
        link: 'text-[#FF6BBF] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-8 py-2',
        sm: 'h-9 px-6 rounded-full',
        lg: 'h-14 px-10 text-base rounded-full',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
