'use client';

import React from 'react';

interface StatsGridProps {
  stats: {
    total: number;
    active: number;
    pending: number;
    past: number;
  };
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <StatCard value={stats.total} label="Total" color="text-sky-600" />
      <StatCard value={stats.active} label="Actifs" color="text-emerald-600" />
      <StatCard value={stats.pending} label="En attente" color="text-amber-600" />
      <StatCard value={stats.past} label="Passes" color="text-slate-600" />
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="p-4 bg-white border border-slate-200 rounded-xl text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
