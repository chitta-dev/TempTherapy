import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface TableSortHeaderProps {
  label: string;
  field: string;
  currentSortField: string;
  currentSortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  label,
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  className = '',
  align = 'left'
}) => {
  const isActive = currentSortField === field;

  return (
    <th
      onClick={() => onSort(field)}
      className={`p-4 cursor-pointer select-none transition hover:bg-slate-100/80 group ${
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
      } ${className}`}
      title={`Click to sort by ${label} (${isActive ? (currentSortDirection === 'asc' ? 'Currently Ascending' : 'Currently Descending') : 'Unsorted'})`}
    >
      <div
        className={`inline-flex items-center space-x-1.5 ${
          align === 'right' ? 'flex-row-reverse space-x-reverse' : ''
        }`}
      >
        <span
          className={`font-extrabold text-[11px] uppercase tracking-wider transition ${
            isActive ? 'text-teal-900 font-black' : 'text-slate-500 group-hover:text-slate-800'
          }`}
        >
          {label}
        </span>
        <span
          className={`p-0.5 rounded transition ${
            isActive ? 'text-teal-700 bg-teal-50' : 'text-slate-300 group-hover:text-slate-500'
          }`}
        >
          {isActive ? (
            currentSortDirection === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5" />
          )}
        </span>
      </div>
    </th>
  );
};
