export interface AssetTransaction {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  itemName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  remarks: string;
  timestamp?: number;
  sheetRowIndex?: number;
}

export interface ItemStockInfo {
  name: string;
  totalIn: number;
  totalOut: number;
  currentStock: number;
  lastUpdated?: string;
}

export interface SpreadsheetMeta {
  id: string;
  name: string;
  url: string;
  modifiedTime?: string;
  sheets?: string[];
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error';
