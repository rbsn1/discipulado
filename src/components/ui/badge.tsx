import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'muted'
  dot?: boolean
}

const variantClasses = {
  default: 'bg-indigo-100/70 text-indigo-800',
  success: 'bg-emerald-100/70 text-emerald-800',
  warning: 'bg-amber-100/70 text-amber-800',
  danger: 'bg-rose-100/70 text-rose-800',
  muted: 'bg-[#EFEDE7] text-[#6B6963]',
}

const dotClasses = {
  default: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  muted: 'bg-gray-400',
}

export function Badge({ className, variant = 'default', dot, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[variant])} />}
      {children}
    </span>
  )
}
