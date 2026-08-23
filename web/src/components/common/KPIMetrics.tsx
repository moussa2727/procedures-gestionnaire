'use client';

import React from 'react';

interface KPI {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor?: string;
}

interface KPIMetricsProps {
  metrics: KPI[];
  className?: string;
}

export function KPIMetrics({ metrics, className = '' }: KPIMetricsProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 ${className}`}>
      {metrics.map((metric, index) => (
        <div
          key={index}
          className={`p-4 border rounded-xl shadow-sm ${metric.bgColor || 'bg-white'} ${metric.color} border-${metric.color.split('-')[1]}-200`}
        >
          <span className="text-xs font-semibold flex items-center gap-1.5">
            {metric.icon}
            {metric.label}
          </span>
          <div className="mt-2">
            <span className="text-2xl font-bold">{metric.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}