import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ButtonVariant = 'primary' | 'secondary'
type ButtonSize = 'md' | 'icon'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:pointer-events-none disabled:opacity-50'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary:
    'border border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50',
}

const sizes: Record<ButtonSize, string> = {
  md: 'h-10 px-4',
  icon: 'h-10 w-10',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
