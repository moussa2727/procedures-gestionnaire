'use client';

import { Banknote, Sparkles } from 'lucide-react';

interface DestinationCardProps {
  destination: {
    id: string;
    name: string;
    description: string;
    advantages: string[];
    matchPercentage: number;
    flag: string;
    costLevel: 'low' | 'medium' | 'high';
    language: string[];
  };
  rank: number;
}

export function DestinationCard({ destination, rank }: DestinationCardProps) {
  const rankColors = {
    1: 'border-sky-200 bg-sky-50/50',
    2: 'border-sky-100 bg-white',
    3: 'border-slate-200 bg-white',
  };

  const rankBadgeColors = {
    1: 'bg-sky-600 text-white',
    2: 'bg-slate-500 text-white',
    3: 'bg-slate-400 text-white',
  };

  const costLabel = {
    low: 'Faible cout',
    medium: 'Cout moyen',
    high: 'Eleve',
  };

  return (
    <div
      className={`relative border rounded-xl p-4 text-left flex flex-col h-full transition-all duration-200 hover:shadow-md ${rankColors[rank as keyof typeof rankColors] || 'border-slate-200 bg-white'}`}
    >
      <div
        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm ${rankBadgeColors[rank as keyof typeof rankBadgeColors] || 'bg-slate-500'}`}
      >
        #{rank}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{destination.flag}</span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">{destination.name}</h3>
            <div className="flex items-center space-x-1 mt-0.5">
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                  destination.costLevel === 'low'
                    ? 'bg-emerald-50 text-emerald-700'
                    : destination.costLevel === 'medium'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Banknote className="w-3 h-3" />
                  {costLabel[destination.costLevel]}
                </div>
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center bg-sky-50 px-2 py-1 rounded-full">
          <Sparkles className="h-3 w-3 text-sky-600 mr-1" />
          <span className="text-xs font-semibold text-sky-700">{destination.matchPercentage}%</span>
        </div>
      </div>

      <p className="text-slate-600 text-xs mb-3 grow">{destination.description}</p>

      <div className="mb-2">
        <div className="flex items-center text-xs font-medium text-sky-600 mb-1">
          Langues : {destination.language.join(', ')}
        </div>
      </div>

      <div className="mt-1">
        <h4 className="font-semibold text-sky-600 text-xs mb-2 flex items-center">
          Points forts :
        </h4>
        <ul className="space-y-1.5">
          {destination.advantages.slice(0, 3).map((advantage, i) => (
            <li key={i} className="flex items-start">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 mr-2 mt-1 shrink-0" />
              <span className="text-slate-600 text-xs leading-relaxed">{advantage}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
