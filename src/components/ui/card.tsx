import type { HTMLAttributes, ReactNode } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

type CardContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-3xl', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}
