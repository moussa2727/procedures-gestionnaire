'use client';


export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterBarProps {
  filters: FilterOption[];
  activeFilter: string;
  onFilterChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function FilterBar({ filters, activeFilter, onFilterChange, label = 'Filtrer :', className = '' }: FilterBarProps) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 text-xs ${className}`}>
      {label && <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">{label}</span>}
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onFilterChange(filter.value)}
          className={`px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap border ${
            activeFilter === filter.value
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {filter.label} {filter.count !== undefined && `(${filter.count})`}
        </button>
      ))}
    </div>
  );
}