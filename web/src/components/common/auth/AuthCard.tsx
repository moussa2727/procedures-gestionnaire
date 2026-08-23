// components/(auth)/AuthCard.tsx
'use client';

import React from 'react';
import { motion } from 'motion/react';

interface AuthCardProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  noAnimation?: boolean;
}

export function AuthCard({ 
  children, 
  maxWidth = 'sm',
  className = '',
  noAnimation = false,
}: AuthCardProps) {
  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
  };

  const CardContent = (
    <div
      className={`w-full ${maxWidthClasses[maxWidth]} bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8 transition-all ${className}`}
    >
      {children}
    </div>
  );

  if (noAnimation) {
    return CardContent;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full flex justify-center"
    >
      {CardContent}
    </motion.div>
  );
}