import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  Plus,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
} from 'lucide-react';
import { AssetTransaction, SpreadsheetMeta, SyncState } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedToken,
} from './services/auth';
import {
  getSpreadsheetDetails,
  loadTransactionsFromSheet,
  appendTransactionToSheet,
  overwriteAllTransactionsInSheet,
  updateStockSummaryTab,
} from './services/googleSheets';
import { Header } from './components/Header';
import { StockSummaryCard } from './components/StockSummaryCard';
import { TransactionList } from './components/TransactionList';
import { NewEntryModal } from './components/NewEntryModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { GoogleSignInButton } from './components/GoogleSignInButton';

const STORAGE_KEY_TXS = 'asset_live_stock_transactions';
const STORAGE_KEY_SHEET = 'asset_live_stock_active_sheet';

// Initial sample data if completely fresh
const INITIAL_DEMO_TRANSACTIONS: AssetTransaction[] = [
  {
    id: 'tx-init-1',
    date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    itemName: 'DELL XPS 15 LAPTOP',
    type: 'IN',
    quantity: 12,
    remarks: 'Received from IT Procurement Batch A',
  },
  {
    id: 'tx-init-2',
    date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    itemName: 'ERGONOMIC OFFICE CHAIR',
    type: 'IN',
    quantity: 25,
    remarks: 'Warehouse delivery Floor 3',
  },
  {
    id: 'tx-init-3',
    date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0],
    itemName: 'DELL XPS 15 LAPTOP',
    type: 'OUT',
    quantity: 4,
    remarks: 'Issued to engineering onboarding team',
  },
  {
    id: 'tx-init-4',
    date: new Date().toISOString().split('T')[0],
    itemName: '27-INCH 4K MONITOR',
    type: 'IN',
    quantity: 18,
    remarks: 'Design lab allocation',
  },
  {
    id: 'tx-init-5',
    date: new Date().toISOString().split('T')[0],
    itemName: 'ERGONOMIC OFFICE CHAIR',
    type: 'OUT',
    quantity: 2,
    remarks: 'Replaced damaged chairs in Room 204',
  },
];

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Application Data state
  const [transactions, setTransactions] = useState<AssetTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TXS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved transactions:', e);
    }
    return INITIAL_DEMO_TRANSACTIONS;
  });

  const [activeSheet, setActiveSheet] = useState<SpreadsheetMeta | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SHEET);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved active sheet:', e);
    }
    return null;
  });

  // UI state
  const [selectedFilterItem, setSelectedFilterItem] = useState<string | null>(null);
  const [isNewEntryOpen, setIsNewEntryOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [statusNotification, setStatusNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Destructive Confirmation Modal state (Mandatory per Google Workspace Integration guidelines)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  // Save to localStorage whenever transactions change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TXS, JSON.stringify(transactions));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }, [transactions]);

  // Save activeSheet to localStorage
  useEffect(() => {
    try {
      if (activeSheet) {
        localStorage.setItem(STORAGE_KEY_SHEET, JSON.stringify(activeSheet));
      } else {
        localStorage.removeItem(STORAGE_KEY_SHEET);
      }
    } catch (e) {
      console.warn('LocalStorage sheet save failed:', e);
    }
  }, [activeSheet]);

  // Initialize Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        // User logged out or fresh visit
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusNotification({ message, type });
    setTimeout(() => {
      setStatusNotification(null);
    }, 4000);
  };

  // Google Sign In handler
  const handleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        showToast(`Signed in as ${result.user.displayName || result.user.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      showToast(err.message || 'Google sign in was cancelled or failed.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Sign Out handler
  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    showToast('Signed out of Google account.', 'info');
  };

  // Live Auto Stock Calculation (matching Flutter getter `_stockSummary`)
  const stockSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    for (const tx of transactions) {
      const name = tx.itemName.trim().toUpperCase();
      const currentQty = summary[name] ?? 0;
      if (tx.type === 'IN') {
        summary[name] = currentQty + tx.quantity;
      } else {
        summary[name] = currentQty - tx.quantity;
      }
    }
    return summary;
  }, [transactions]);

  // Aggregate Detailed Metrics
  const { totalInCount, totalOutCount, detailedSummary } = useMemo(() => {
    let inCount = 0;
    let outCount = 0;
    const details: Record<string, { totalIn: number; totalOut: number; currentStock: number }> = {};

    for (const tx of transactions) {
      const name = tx.itemName.trim().toUpperCase();
      if (!details[name]) {
        details[name] = { totalIn: 0, totalOut: 0, currentStock: 0 };
      }
      if (tx.type === 'IN') {
        details[name].totalIn += tx.quantity;
        details[name].currentStock += tx.quantity;
        inCount += tx.quantity;
      } else {
        details[name].totalOut += tx.quantity;
        details[name].currentStock -= tx.quantity;
        outCount += tx.quantity;
      }
    }

    return {
      totalInCount: inCount,
      totalOutCount: outCount,
      detailedSummary: details,
    };
  }, [transactions]);

  const existingItemNames = useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => tx.itemName.trim().toUpperCase())));
  }, [transactions]);

  // Add Transaction handler (matching Flutter `_addTransaction`)
  const handleAddTransaction = async (newTxData: Omit<AssetTransaction, 'id'>) => {
    const newTx: AssetTransaction = {
      ...newTxData,
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
    };

    const updatedTransactions = [newTx, ...transactions];
    setTransactions(updatedTransactions);

    // If connected to Google Sheets, sync immediately to the sheet!
    if (activeSheet && accessToken) {
      setSyncState('syncing');
      try {
        await appendTransactionToSheet(accessToken, activeSheet.id, newTx);
        // Also update the summary tab in the background
        const newDetails = { ...detailedSummary };
        const name = newTx.itemName.trim().toUpperCase();
        if (!newDetails[name]) {
          newDetails[name] = { totalIn: 0, totalOut: 0, currentStock: 0 };
        }
        if (newTx.type === 'IN') {
          newDetails[name].totalIn += newTx.quantity;
          newDetails[name].currentStock += newTx.quantity;
        } else {
          newDetails[name].totalOut += newTx.quantity;
          newDetails[name].currentStock -= newTx.quantity;
        }
        updateStockSummaryTab(accessToken, activeSheet.id, newDetails);

        setSyncState('synced');
        showToast(`Saved & synced to Google Sheet: "${activeSheet.name}"`, 'success');
      } catch (err: any) {
        console.error('Google Sheet append error:', err);
        setSyncState('error');
        showToast(`Saved locally, but Google Sheet sync failed: ${err.message}`, 'error');
      }
    } else {
      showToast('New asset transaction recorded locally.', 'success');
    }
  };

  // Delete Transaction handler - with MANDATORY user confirmation dialog!
  const handleRequestDeleteTransaction = (tx: AssetTransaction) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Delete Asset Transaction',
      message: `Are you sure you want to permanently delete this transaction?\n\n• Item: ${tx.itemName}\n• Type: ${tx.type} (${tx.quantity} units)\n• Date: ${tx.date}\n\n${
        activeSheet
          ? `This will remove the transaction from your connected Google Sheet ("${activeSheet.name}") and update the live stock summary tab.`
          : 'This will update your live stock counts.'
      }`,
      confirmLabel: 'Delete Entry',
      isDestructive: true,
      onConfirm: async () => {
        setIsConfirmLoading(true);
        try {
          const updated = transactions.filter((item) => item.id !== tx.id);
          setTransactions(updated);

          if (activeSheet && accessToken) {
            setSyncState('syncing');
            await overwriteAllTransactionsInSheet(accessToken, activeSheet.id, updated);
            // Recompute details and sync summary
            const newDetails: Record<string, { totalIn: number; totalOut: number; currentStock: number }> = {};
            for (const t of updated) {
              const name = t.itemName.trim().toUpperCase();
              if (!newDetails[name]) newDetails[name] = { totalIn: 0, totalOut: 0, currentStock: 0 };
              if (t.type === 'IN') {
                newDetails[name].totalIn += t.quantity;
                newDetails[name].currentStock += t.quantity;
              } else {
                newDetails[name].totalOut += t.quantity;
                newDetails[name].currentStock -= t.quantity;
              }
            }
            await updateStockSummaryTab(accessToken, activeSheet.id, newDetails);
            setSyncState('synced');
            showToast('Transaction deleted and Google Sheet updated.', 'success');
          } else {
            showToast('Transaction removed.', 'info');
          }
          setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          console.error('Delete error:', err);
          showToast(`Error deleting entry: ${err.message}`, 'error');
        } finally {
          setIsConfirmLoading(false);
        }
      },
    });
  };

  // Sync Now with Google Sheets
  const handleSyncNow = useCallback(async () => {
    if (!activeSheet) {
      setIsSheetsModalOpen(true);
      return;
    }
    if (!accessToken) {
      showToast('Please sign in with Google to synchronize.', 'info');
      await handleSignIn();
      return;
    }

    setSyncState('syncing');
    try {
      // 1. Fetch remote transactions from Google Sheet
      const remoteTxs = await loadTransactionsFromSheet(accessToken, activeSheet.id);

      if (remoteTxs.length > 0) {
        // Merge or replace with sheet data
        setTransactions(remoteTxs);
        setSyncState('synced');
        showToast(`Synced ${remoteTxs.length} transactions from Google Sheets!`, 'success');
      } else if (transactions.length > 0) {
        // Sheet has no data yet, push local transactions
        await overwriteAllTransactionsInSheet(accessToken, activeSheet.id, transactions);
        await updateStockSummaryTab(accessToken, activeSheet.id, detailedSummary);
        setSyncState('synced');
        showToast(`Uploaded ${transactions.length} local entries to your Google Sheet!`, 'success');
      } else {
        setSyncState('synced');
        showToast('Google Sheet is ready and connected.', 'info');
      }
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncState('error');
      showToast(err.message || 'Sync failed. Please check sheet access.', 'error');
    }
  }, [activeSheet, accessToken, transactions, detailedSummary]);

  // Connect Selected Sheet
  const handleSelectSheet = async (sheet: SpreadsheetMeta) => {
    setActiveSheet(sheet);
    if (!accessToken) return;

    setSyncState('syncing');
    try {
      const sheetTxs = await loadTransactionsFromSheet(accessToken, sheet.id);
      if (sheetTxs.length > 0) {
        setTransactions(sheetTxs);
        showToast(`Loaded ${sheetTxs.length} entries from "${sheet.name}"`, 'success');
      } else if (transactions.length > 0) {
        // Populate newly created or blank sheet with existing transactions
        await overwriteAllTransactionsInSheet(accessToken, sheet.id, transactions);
        await updateStockSummaryTab(accessToken, sheet.id, detailedSummary);
        showToast(`Ledger initialized with ${transactions.length} records in Google Sheets!`, 'success');
      }
      setSyncState('synced');
    } catch (err: any) {
      console.error('Initial sheet load failed:', err);
      setSyncState('error');
      showToast('Connected to sheet, but failed to load initial data.', 'error');
    }
  };

  const handleDisconnectSheet = () => {
    setActiveSheet(null);
    showToast('Google Sheet disconnected.', 'info');
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans">
      {/* Top App Bar Header */}
      <Header
        user={user}
        activeSheet={activeSheet}
        syncState={syncState}
        isMobilePreview={isMobilePreview}
        onToggleMobilePreview={() => setIsMobilePreview(!isMobilePreview)}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onSyncNow={handleSyncNow}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
      />

      {/* Toast Notification Banner */}
      {statusNotification && (
        <div className="fixed top-16 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2.5 ${
              statusNotification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : statusNotification.type === 'error'
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-neutral-900 text-white border-neutral-700'
            }`}
          >
            {statusNotification.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {statusNotification.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
            {statusNotification.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span>{statusNotification.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-0 sm:p-4 md:p-6 overflow-y-auto">
        {/* If Mobile Preview is toggled, wrap in smartphone mock frame */}
        <div
          className={`w-full transition-all duration-300 ${
            isMobilePreview
              ? 'max-w-md my-auto bg-white rounded-[38px] shadow-2xl border-8 border-neutral-800 overflow-hidden min-h-[720px] max-h-[880px] flex flex-col relative'
              : 'max-w-5xl bg-white sm:rounded-2xl shadow-sm border border-neutral-200 overflow-hidden flex flex-col flex-1'
          }`}
        >
          {/* Mobile Bezel speaker bar if in preview mode */}
          {isMobilePreview && (
            <div className="h-6 bg-neutral-900 w-full flex items-center justify-center">
              <div className="w-16 h-3 bg-neutral-800 rounded-full" />
            </div>
          )}

          {/* App Bar title inside container if desired */}
          <div className="bg-[#D32F2F] text-white px-4 py-3 sm:hidden flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight">Asset Live Stock</h2>
            <div className="flex items-center gap-2">
              {activeSheet && (
                <span className="text-2xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  Sheets Synced
                </span>
              )}
            </div>
          </div>

          {/* Red Header Live Stock Summary Card */}
          <StockSummaryCard
            stockSummary={stockSummary}
            selectedFilterItem={selectedFilterItem}
            onSelectItemFilter={(item) => setSelectedFilterItem(item)}
            totalInCount={totalInCount}
            totalOutCount={totalOutCount}
          />

          {/* Google Sheets Sync Quick Banner if not signed in or not connected */}
          {!user ? (
            <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sign in with Google to sync inventory directly to Google Sheets</span>
              </div>
              <GoogleSignInButton
                onClick={handleSignIn}
                loading={isLoggingIn}
                text="Sign in"
              />
            </div>
          ) : !activeSheet ? (
            <div className="mx-4 mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-neutral-700 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>No Google Sheet linked yet. Create or select a ledger to sync.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSheetsModalOpen(true)}
                className="px-3 py-1.5 bg-[#D32F2F] text-white hover:bg-red-700 rounded-lg font-bold transition-colors shrink-0 shadow-2xs"
              >
                Connect Sheet
              </button>
            </div>
          ) : null}

          {/* Transactions List */}
          <TransactionList
            transactions={transactions}
            selectedFilterItem={selectedFilterItem}
            onClearItemFilter={() => setSelectedFilterItem(null)}
            onRequestDelete={handleRequestDeleteTransaction}
            isSheetConnected={Boolean(activeSheet)}
          />

          {/* Floating Action Button (+) matching Flutter's FloatingActionButton */}
          <div className="sticky bottom-4 right-4 self-end p-4 z-10 pointer-events-none">
            <button
              type="button"
              onClick={() => setIsNewEntryOpen(true)}
              aria-label="Add new asset entry"
              className="pointer-events-auto w-14 h-14 bg-[#D32F2F] hover:bg-red-700 active:bg-red-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        </div>
      </main>

      {/* New Entry Modal */}
      <NewEntryModal
        isOpen={isNewEntryOpen}
        onClose={() => setIsNewEntryOpen(false)}
        onSave={handleAddTransaction}
        existingItemNames={existingItemNames}
      />

      {/* Google Sheets Connection Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={accessToken}
        activeSheet={activeSheet}
        onSelectSheet={handleSelectSheet}
        onDisconnectSheet={handleDisconnectSheet}
        onSyncNow={handleSyncNow}
        isSyncing={syncState === 'syncing'}
      />

      {/* Mandatory User Confirmation Modal for Destructive Workspace Operations */}
      <ConfirmationModal
        isOpen={confirmModalConfig.isOpen}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmLabel={confirmModalConfig.confirmLabel}
        isDestructive={confirmModalConfig.isDestructive}
        isLoading={isConfirmLoading}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
