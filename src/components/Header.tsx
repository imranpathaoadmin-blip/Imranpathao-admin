import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  Smartphone,
  Monitor,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { SpreadsheetMeta, SyncState } from '../types';

interface HeaderProps {
  user: User | null;
  activeSheet: SpreadsheetMeta | null;
  syncState: SyncState;
  isMobilePreview: boolean;
  onToggleMobilePreview: () => void;
  onOpenSheetsModal: () => void;
  onSyncNow: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeSheet,
  syncState,
  isMobilePreview,
  onToggleMobilePreview,
  onOpenSheetsModal,
  onSyncNow,
  onSignOut,
  onSignIn,
}) => {
  return (
    <header className="bg-[#D32F2F] text-white shadow-md relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Left: Brand Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-white text-base">
            AL
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight leading-tight">
              Asset Live Stock
            </h1>
            <p className="text-2xs text-white/70 hidden sm:block">
              Inventory Tracker &amp; Google Sheets Ledger
            </p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile frame toggle */}
          <button
            type="button"
            onClick={onToggleMobilePreview}
            title={isMobilePreview ? 'Switch to Full Dashboard' : 'Switch to Mobile App Preview'}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-black/15 hover:bg-black/25 text-white text-xs font-semibold rounded-lg transition-colors border border-white/15"
          >
            {isMobilePreview ? (
              <>
                <Monitor className="w-3.5 h-3.5" /> Desktop View
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" /> Mobile App Frame
              </>
            )}
          </button>

          {/* Google Sheets button / badge */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#D32F2F] hover:bg-neutral-100 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="max-w-28 sm:max-w-44 truncate">
                  {activeSheet ? activeSheet.name : 'Connect Sheets'}
                </span>
                {activeSheet && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
              </button>

              {activeSheet && (
                <>
                  <button
                    type="button"
                    onClick={onSyncNow}
                    disabled={syncState === 'syncing'}
                    title="Synchronize data with Google Sheets"
                    className="p-1.5 bg-black/15 hover:bg-black/25 text-white rounded-lg transition-colors border border-white/15 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                  </button>

                  <a
                    href={activeSheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open spreadsheet in Google Sheets"
                    className="hidden sm:inline-flex p-1.5 bg-black/15 hover:bg-black/25 text-white rounded-lg transition-colors border border-white/15"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              Sign In
            </button>
          )}

          {/* User Profile / Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-1 border-l border-white/20">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-white/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.email ? user.email.charAt(0) : 'U'}
                </div>
              )}

              <button
                type="button"
                onClick={onSignOut}
                title={`Sign out (${user.email})`}
                className="p-1.5 text-white/80 hover:text-white hover:bg-black/15 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
