import { type ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div';
  spacing?: 'sm' | 'md' | 'lg';
}

export function Section({
  children,
  className = '',
  as: Component = 'section',
  spacing = 'md',
}: SectionProps) {
  const spacingClasses = {
    sm: 'py-8 sm:py-12',
    md: 'py-12 sm:py-16 lg:py-20',
    lg: 'py-16 sm:py-24 lg:py-32',
  };

  return (
    <Component className={`w-full ${spacingClasses[spacing]} ${className}`}>
      {children}
    </Component>
  );
}
