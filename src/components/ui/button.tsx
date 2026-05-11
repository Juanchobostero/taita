import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:     'bg-primary text-primary-foreground hover:bg-primary/90 rounded-full',
        destructive: 'bg-destructive text-white hover:bg-destructive/90 rounded-full',
        outline:     'border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-full',
        secondary:   'bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full',
        ghost:       'hover:bg-accent hover:text-accent-foreground rounded-xl',
        link:        'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm:      'h-8 px-4 text-xs',
        lg:      'h-12 px-8 text-base',
        icon:    'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
