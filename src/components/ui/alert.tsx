import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  className?: string
}

const config = {
  info: { icon: Info, classes: 'bg-blue-50 border-blue-200 text-blue-800' },
  success: { icon: CheckCircle, classes: 'bg-green-50 border-green-200 text-green-800' },
  warning: { icon: AlertTriangle, classes: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  error: { icon: AlertCircle, classes: 'bg-red-50 border-red-200 text-red-800' },
}

export function Alert({ type = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, classes } = config[type]
  return (
    <div className={cn('flex gap-3 rounded-lg border p-4', classes, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex flex-col gap-0.5">
        {title && <p className="font-medium">{title}</p>}
        <p className="text-sm">{children}</p>
      </div>
    </div>
  )
}
