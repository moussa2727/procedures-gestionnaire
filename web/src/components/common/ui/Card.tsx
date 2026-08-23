import { type ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'bordered' | 'elevated';
  className?: string;
  padding?: boolean;
}

export function Card({
  children,
  variant = 'default',
  className = '',
  padding = true,
}: CardProps) {
  const base = 'rounded-xl bg-white transition-shadow duration-200';

  const variants = {
    default: 'border border-slate-200 shadow-sm',
    bordered: 'border border-slate-200',
    elevated: 'shadow-md',
  };

  const paddingClass = padding ? 'p-4 sm:p-6' : '';

  return (
    <div className={`${base} ${variants[variant]} ${paddingClass} ${className}`}>
      {children}
    </div>
  );
}
