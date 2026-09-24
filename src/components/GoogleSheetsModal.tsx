import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  ExternalLink,
  RefreshCw,
  X,
  CheckCircle2,
  FolderOpen,
  Link as LinkIcon,
  AlertCircle,
  Unlink,
} from 'lucide-react';
import { SpreadsheetMeta } from '../types';
import {
  listUserSpreadsheets,
  createAssetSpreadsheet,
  getSpreadsheetDetails,
} from '../services/googleSheets';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  activeSheet: SpreadsheetMeta | null;
  onSelectSheet: (sheet: SpreadsheetMeta) => Promise<void>;
  onDisconnectSheet: () => void;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  activeSheet,
  onSelectSheet,
  onDisconnectSheet,
  onSyncNow,
  isSyncing,
}) => {
  const [tab, setTab] = useState<'create' | 'drive' | 'custom'>('create');
  const [newTitle, setNewTitle] = useState('Asset Live Stock - Inventory Ledger');
  const [customInput, setCustomInput] = useState('');
  const [driveSheets, setDriveSheets] = useState<SpreadsheetMeta[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken && tab === 'drive') {
      fetchDriveFiles();
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, tab, accessToken]);

  const fetchDriveFiles = async () => {
    if (!accessToken) return;
    setLoadingDrive(true);
    setErrorMsg(null);
    try {
      const files = await listUserSpreadsheets(accessToken);
      setDriveSheets(files);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load spreadsheets from Google Drive');
    } finally {
      setLoadingDrive(false);
    }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setErrorMsg('Please sign in to Google first.');
      return;
    }
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const created = await createAssetSpreadsheet(accessToken, newTitle.trim() || undefined);
      await onSelectSheet(created);
      setSuccessMsg(`Spreadsheet created: "${created.name}"`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create spreadsheet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectDriveFile = async (sheet: SpreadsheetMeta) => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onSelectSheet(sheet);
      setSuccessMsg(`Connected to: "${sheet.name}"`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect spreadsheet');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) {
      setErrorMsg('Please sign in with Google first.');
      return;
    }
    const input = customInput.trim();
    if (!input) {
      setErrorMsg('Please enter a valid Google Spreadsheet ID or URL');
      return;
    }

    // Extract ID from full URL if provided: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
    let sheetId = input;
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const details = await getSpreadsheetDetails(accessToken, sheetId);
      await onSelectSheet(details);
      setSuccessMsg(`Successfully connected to: "${details.name}"`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not access spreadsheet. Please check permissions or ID.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Google Sheets Cloud Sync</h2>
              <p className="text-xs text-neutral-400">Live inventory synchronization &amp; export</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Sheet Banner */}
        {activeSheet && (
          <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                  Active Spreadsheet Connected
                </p>
                <p className="text-sm font-bold text-neutral-900 line-clamp-1">{activeSheet.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeSheet.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors shadow-2xs"
              >
                Open in Sheets <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
              </a>
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button
                type="button"
                onClick={onDisconnectSheet}
                title="Disconnect this spreadsheet"
                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Unlink className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Status / Alerts */}
        <div className="px-6 pt-4">
          {errorMsg && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="px-6 border-b border-neutral-200">
          <div className="flex gap-4">
            <button
              onClick={() => setTab('create')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                tab === 'create'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <PlusCircle className="w-4 h-4" /> Create New Sheet
            </button>
            <button
              onClick={() => setTab('drive')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                tab === 'drive'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <FolderOpen className="w-4 h-4" /> Pick from Google Drive
            </button>
            <button
              onClick={() => setTab('custom')}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
                tab === 'custom'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <LinkIcon className="w-4 h-4" /> Custom Link / ID
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'create' && (
            <form onSubmit={handleCreateNew} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Spreadsheet Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Asset Live Stock - Inventory Ledger"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 text-sm font-medium transition-all"
                  required
                />
              </div>

              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-xs text-neutral-600 space-y-2">
                <p className="font-semibold text-neutral-800">What will be created:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <span className="font-medium text-neutral-900">Transactions Tab:</span> logs ID, Date, Item Name, Type (IN/OUT), Quantity, Remarks, Timestamp.
                  </li>
                  <li>
                    <span className="font-medium text-neutral-900">Live Stock Summary Tab:</span> auto-calculated current inventory balances, total IN, total OUT, and stock status.
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !accessToken}
                className="w-full py-3 bg-[#D32F2F] hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Creating Ledger in Google Sheets...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" /> Create &amp; Connect Ledger Sheet
                  </>
                )}
              </button>
            </form>
          )}

          {tab === 'drive' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-600">Your Recent Google Sheets:</p>
                <button
                  type="button"
                  onClick={fetchDriveFiles}
                  disabled={loadingDrive}
                  className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingDrive ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {loadingDrive ? (
                <div className="py-12 text-center text-sm text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-red-600" />
                  Loading spreadsheets from your Google Drive...
                </div>
              ) : driveSheets.length === 0 ? (
                <div className="py-8 text-center text-sm text-neutral-500 bg-neutral-50 rounded-xl border border-dashed border-neutral-300">
                  No spreadsheets found. Create a new one using the "Create New Sheet" tab!
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {driveSheets.map((sheet) => {
                    const isCurrent = activeSheet?.id === sheet.id;
                    return (
                      <div
                        key={sheet.id}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white hover:bg-neutral-50 border-neutral-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-neutral-900 truncate">{sheet.name}</p>
                          <p className="text-xs text-neutral-400">
                            {sheet.modifiedTime ? `Modified ${new Date(sheet.modifiedTime).toLocaleDateString()}` : 'Google Sheet'}
                          </p>
                        </div>
                        {isCurrent ? (
                          <span className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">
                            Connected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectDriveFile(sheet)}
                            disabled={isProcessing}
                            className="px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 rounded-lg bg-neutral-100 transition-colors"
                          >
                            Use this Sheet
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'custom' && (
            <form onSubmit={handleConnectCustom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Spreadsheet URL or ID
                </label>
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit or Spreadsheet ID"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-600 text-sm font-medium transition-all"
                  required
                />
                <p className="mt-1.5 text-xs text-neutral-500">
                  Paste the full URL from your browser address bar when viewing your sheet.
                </p>
              </div>

              <button
                type="submit"
                disabled={isProcessing || !accessToken}
                className="w-full py-3 bg-[#D32F2F] hover:bg-red-700 text-white font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Sheet...
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" /> Connect Spreadsheet
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
          <span>Connected via Google Workspace Sheets API</span>
          <button
            onClick={onClose}
            className="text-neutral-700 hover:text-neutral-900 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
