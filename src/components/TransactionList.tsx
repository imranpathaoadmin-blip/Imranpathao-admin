import React, { useState } from 'react';
import {
  Trash2,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { AssetTransaction } from '../types';

interface TransactionListProps {
  transactions: AssetTransaction[];
  selectedFilterItem: string | null;
  onClearItemFilter: () => void;
  onRequestDelete: (tx: AssetTransaction) => void;
  isSheetConnected: boolean;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  selectedFilterItem,
  onClearItemFilter,
  onRequestDelete,
  isSheetConnected,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedFilterItem && tx.itemName.toUpperCase() !== selectedFilterItem.toUpperCase()) {
      return false;
    }
    if (typeFilter !== 'ALL' && tx.type !== typeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = tx.itemName.toLowerCase().includes(q);
      const matchRemarks = (tx.remarks || '').toLowerCase().includes(q);
      const matchDate = (tx.date || '').toLowerCase().includes(q);
      return matchName || matchRemarks || matchDate;
    }
    return true;
  });

  const exportCSV = () => {
    if (filteredTransactions.length === 0) return;
    const headers = ['ID', 'Date', 'Item Name', 'Type', 'Quantity', 'Remarks'];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.date}"`,
      `"${tx.itemName.replace(/"/g, '""')}"`,
      `"${tx.type}"`,
      tx.quantity,
      `"${(tx.remarks || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `asset_live_stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-neutral-50">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-white border-b border-neutral-200 shadow-2xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-neutral-800">
              Recent Transactions
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-neutral-100 text-neutral-600 rounded-full">
              {filteredTransactions.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2 py-1 rounded-md transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-white text-neutral-900 shadow-2xs'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('IN')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                  typeFilter === 'IN'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                IN
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('OUT')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                  typeFilter === 'OUT'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-red-700 hover:bg-red-50'
                }`}
              >
                OUT
              </button>
            </div>

            {/* Export CSV button */}
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={exportCSV}
                title="Export filtered records to CSV"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter badge if item selected */}
        {selectedFilterItem && (
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-neutral-600">
            <span>Filtered by item:</span>
            <span className="px-2 py-0.5 bg-[#D32F2F]/10 text-[#D32F2F] rounded-md font-bold">
              {selectedFilterItem}
            </span>
            <button
              type="button"
              onClick={onClearItemFilter}
              className="text-neutral-400 hover:text-neutral-700 underline text-2xs"
            >
              Reset
            </button>
          </div>
        )}

        {/* Search bar */}
        {transactions.length > 3 && (
          <div className="mt-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item name, remarks, or date..."
              className="w-full px-3 py-1.5 pl-8 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#D32F2F]"
            />
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>
        )}
      </div>

      {/* List content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTransactions.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-neutral-700">No transactions to display</p>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs">
              {transactions.length === 0
                ? 'Tap the + button below to log incoming or outgoing assets.'
                : 'Try adjusting your search or category filter.'}
            </p>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isIn = tx.type === 'IN';
            return (
              <div
                key={tx.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-2xs hover:border-neutral-300 hover:shadow-xs transition-all p-3.5 flex items-center gap-3 group"
              >
                {/* Circle Avatar matching Flutter's CircleAvatar */}
                <div
                  className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center text-xs font-black tracking-wider ${
                    isIn
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {tx.type}
                </div>

                {/* Details (Item Name, Remarks, Date) */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-neutral-900 truncate">
                      {tx.itemName}
                    </h4>
                    {isSheetConnected && (
                      <span
                        title="Synced with connected Google Sheet"
                        className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                      />
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500 space-y-0.5">
                    <p className="truncate">
                      <span className="font-semibold text-neutral-600">Remarks:</span>{' '}
                      {tx.remarks && tx.remarks.trim() ? tx.remarks : 'N/A'}
                    </p>
                    <p className="flex items-center gap-1 text-2xs text-neutral-400">
                      <Calendar className="w-3 h-3" />
                      Date: {tx.date}
                    </p>
                  </div>
                </div>

                {/* Trailing Quantity matching Flutter trailing */}
                <div className="text-right shrink-0 flex items-center gap-3">
                  <span
                    className={`text-lg font-black tracking-tight ${
                      isIn ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {isIn ? `+${tx.quantity}` : `-${tx.quantity}`}
                  </span>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => onRequestDelete(tx)}
                    title="Delete transaction entry"
                    className="opacity-60 group-hover:opacity-100 p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
