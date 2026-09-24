import React, { useState } from 'react';
import { Radio, Search, TrendingUp, TrendingDown, Layers, Box, CheckCircle } from 'lucide-react';

interface StockSummaryCardProps {
  stockSummary: Record<string, number>;
  selectedFilterItem: string | null;
  onSelectItemFilter: (item: string | null) => void;
  totalInCount: number;
  totalOutCount: number;
}

export const StockSummaryCard: React.FC<StockSummaryCardProps> = ({
  stockSummary,
  selectedFilterItem,
  onSelectItemFilter,
  totalInCount,
  totalOutCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showStats, setShowStats] = useState(false);

  const entries = Object.entries(stockSummary).sort(([a], [b]) => a.localeCompare(b));
  const filteredEntries = entries.filter(([name]) =>
    name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const totalSKUs = entries.length;
  const netUnits = entries.reduce((acc, [, qty]) => acc + qty, 0);

  return (
    <div className="w-full bg-[#D32F2F] text-white shadow-lg rounded-b-2xl sm:rounded-2xl transition-all">
      <div className="p-4 sm:p-5">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-white animate-pulse" />
            <h2 className="text-xs sm:text-sm font-extrabold tracking-wider text-white uppercase">
              Live Stock Summary
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStats(!showStats)}
              className="text-2xs font-bold uppercase tracking-wider px-2.5 py-1 bg-white/15 hover:bg-white/25 rounded-full transition-colors text-white/90"
            >
              {showStats ? 'Hide Totals' : 'Quick Totals'}
            </button>
            {selectedFilterItem && (
              <button
                type="button"
                onClick={() => onSelectItemFilter(null)}
                className="text-2xs font-bold px-2 py-0.5 bg-white text-[#D32F2F] rounded-full hover:bg-neutral-100 transition-colors"
              >
                Clear Filter ({selectedFilterItem})
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI stats toggle */}
        {showStats && (
          <div className="grid grid-cols-4 gap-2 my-3 p-3 bg-black/15 rounded-xl border border-white/10 text-center animate-in fade-in duration-200">
            <div>
              <p className="text-2xs text-white/70 uppercase font-semibold">SKUs</p>
              <p className="text-base sm:text-lg font-black text-white">{totalSKUs}</p>
            </div>
            <div>
              <p className="text-2xs text-white/70 uppercase font-semibold">Total In</p>
              <p className="text-base sm:text-lg font-black text-emerald-300">+{totalInCount}</p>
            </div>
            <div>
              <p className="text-2xs text-white/70 uppercase font-semibold">Total Out</p>
              <p className="text-base sm:text-lg font-black text-red-200">-{totalOutCount}</p>
            </div>
            <div>
              <p className="text-2xs text-white/70 uppercase font-semibold">Net Stock</p>
              <p className="text-base sm:text-lg font-black text-amber-300">{netUnits}</p>
            </div>
          </div>
        )}

        {/* Search bar if many items */}
        {entries.length > 5 && (
          <div className="mt-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter stock items..."
              className="w-full px-3 py-1.5 pl-8 bg-black/20 text-white placeholder-white/60 rounded-xl text-xs border border-white/20 focus:outline-hidden focus:bg-black/30"
            />
            <Search className="w-3.5 h-3.5 text-white/60 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        )}

        {/* Live Stock Badges */}
        <div className="mt-3">
          {entries.length === 0 ? (
            <p className="text-xs sm:text-sm text-white/80 py-2">
              No stock records found. Click <span className="font-bold underline">+</span> to add your first transaction.
            </p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-xs text-white/80 py-1">No items match &quot;{searchQuery}&quot;</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {filteredEntries.map(([itemName, qty]) => {
                const isSelected = selectedFilterItem === itemName;
                const isNegative = qty < 0;
                const isZero = qty === 0;

                return (
                  <button
                    key={itemName}
                    type="button"
                    onClick={() => onSelectItemFilter(isSelected ? null : itemName)}
                    title={`Click to filter recent transactions for ${itemName}`}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer ${
                      isSelected
                        ? 'bg-neutral-900 text-white ring-2 ring-white scale-105'
                        : 'bg-white hover:bg-neutral-100 hover:scale-102 active:scale-98'
                    }`}
                  >
                    <span className={isSelected ? 'text-white' : 'text-neutral-900'}>
                      {itemName}:
                    </span>
                    <span
                      className={`font-black ${
                        isSelected
                          ? isNegative
                            ? 'text-red-400'
                            : 'text-emerald-400'
                          : isNegative
                          ? 'text-red-700'
                          : isZero
                          ? 'text-neutral-500'
                          : 'text-[#D32F2F]'
                      }`}
                    >
                      {qty}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
