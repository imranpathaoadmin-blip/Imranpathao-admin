import React, { useState } from 'react';
import { X, Calendar, ArrowDownLeft, ArrowUpRight, Sparkles } from 'lucide-react';
import { AssetTransaction } from '../types';

interface NewEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Omit<AssetTransaction, 'id'>) => Promise<void>;
  existingItemNames: string[];
}

export const NewEntryModal: React.FC<NewEntryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingItemNames,
}) => {
  const [itemName, setItemName] = useState('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = itemName.trim();
    const parsedQty = parseInt(quantity.trim(), 10);

    // Validation from original Flutter app:
    // if (name.isEmpty || qty == null || qty <= 0) => 'Sothik Item Name ebang Quantity din!'
    if (!trimmedName || isNaN(parsedQty) || parsedQty <= 0) {
      setErrorMessage('Sothik Item Name ebang Quantity din!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSave({
        itemName: trimmedName.toUpperCase(),
        type,
        quantity: parsedQty,
        remarks: remarks.trim(),
        date: date || new Date().toISOString().split('T')[0],
      });

      // Clear form
      setItemName('');
      setQuantity('');
      setRemarks('');
      setType('IN');
      setDate(new Date().toISOString().split('T')[0]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving entry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuggestions = existingItemNames
    .filter(
      (name) =>
        itemName.trim().length > 0 &&
        name.toLowerCase().includes(itemName.toLowerCase()) &&
        name.toLowerCase() !== itemName.trim().toLowerCase()
    )
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in slide-in-from-bottom duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header matching Flutter style */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#D32F2F] tracking-tight">
            New Asset Entry
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-full hover:bg-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-2 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl animate-shake">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset Item Name */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Asset Item Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="e.g. LAPTOP DELL XPS 15, CHAIR, MONITOR..."
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-sm font-medium transition-all"
              autoFocus
              required
            />
            {filteredSuggestions.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Suggestions:
                </span>
                {filteredSuggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setItemName(sug)}
                    className="text-xs px-2 py-0.5 bg-neutral-100 hover:bg-red-50 hover:text-[#D32F2F] text-neutral-700 rounded-md font-medium transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type and Quantity row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-xl border border-neutral-200">
                <button
                  type="button"
                  onClick={() => setType('IN')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    type === 'IN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-emerald-700'
                  }`}
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  IN (Stock +)
                </button>
                <button
                  type="button"
                  onClick={() => setType('OUT')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    type === 'OUT'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-neutral-600 hover:text-red-700'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  OUT (Stock -)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. 5"
                className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-sm font-bold text-neutral-900 transition-all"
                required
              />
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Transaction Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 pl-10 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-sm font-medium transition-all"
              />
              <Calendar className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Remarks (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Purchased from Vendor X / Issued to Imran"
              className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#D32F2F]/20 focus:border-[#D32F2F] text-sm font-medium transition-all"
            />
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-[#D32F2F] hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-base tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  SAVING...
                </>
              ) : (
                'SAVE ENTRY'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
