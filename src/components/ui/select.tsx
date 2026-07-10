import { cn } from '@/lib/utils'
import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'block h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-base sm:text-sm text-gray-900',
            'transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
