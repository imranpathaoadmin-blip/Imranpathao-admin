import { AssetTransaction, SpreadsheetMeta } from '../types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';

/**
 * Searches user's Google Drive for existing spreadsheets.
 */
export async function listUserSpreadsheets(accessToken: string): Promise<SpreadsheetMeta[]> {
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
    const res = await fetch(
      `${DRIVE_API_BASE}?q=${query}&fields=${fields}&pageSize=20&orderBy=modifiedTime%20desc`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Authentication expired. Please sign in again.');
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to list spreadsheets (${res.status})`);
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
      modifiedTime: f.modifiedTime,
    }));
  } catch (error) {
    console.error('listUserSpreadsheets error:', error);
    throw error;
  }
}

/**
 * Fetches spreadsheet metadata including title and sheet tab names.
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SpreadsheetMeta> {
  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Authentication expired. Please sign in again.');
    if (res.status === 404) throw new Error('Spreadsheet not found or permission denied.');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title || '').filter(Boolean);

  return {
    id: data.spreadsheetId,
    name: data.properties?.title || 'Untitled Spreadsheet',
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets,
  };
}

/**
 * Creates a brand new "Asset Live Stock Ledger" spreadsheet in the user's Google Drive.
 */
export async function createAssetSpreadsheet(
  accessToken: string,
  title = 'Asset Live Stock - Inventory Ledger'
): Promise<SpreadsheetMeta> {
  const requestBody = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Transactions',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Transaction ID' } },
                  { userEnteredValue: { stringValue: 'Date' } },
                  { userEnteredValue: { stringValue: 'Item Name' } },
                  { userEnteredValue: { stringValue: 'Type' } },
                  { userEnteredValue: { stringValue: 'Quantity' } },
                  { userEnteredValue: { stringValue: 'Remarks' } },
                  { userEnteredValue: { stringValue: 'Logged At' } },
                ],
              },
            ],
          },
        ],
      },
      {
        properties: {
          title: 'Live Stock Summary',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Item Name' } },
                  { userEnteredValue: { stringValue: 'Total IN' } },
                  { userEnteredValue: { stringValue: 'Total OUT' } },
                  { userEnteredValue: { stringValue: 'Current Stock' } },
                  { userEnteredValue: { stringValue: 'Status' } },
                  { userEnteredValue: { stringValue: 'Last Updated' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to create spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return {
    id: data.spreadsheetId,
    name: data.properties?.title || title,
    url: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: ['Transactions', 'Live Stock Summary'],
  };
}

/**
 * Loads all transactions from the spreadsheet.
 */
export async function loadTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  preferredSheetTitle?: string
): Promise<AssetTransaction[]> {
  // First ensure we have a valid sheet tab name
  let sheetName = preferredSheetTitle || 'Transactions';
  try {
    const meta = await getSpreadsheetDetails(accessToken, spreadsheetId);
    if (!meta.sheets?.includes(sheetName)) {
      sheetName = meta.sheets?.[0] || 'Sheet1';
    }
  } catch {
    // If metadata fetch fails, fallback to Transactions
  }

  const range = `${sheetName}!A2:G`;
  const res = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Authentication expired. Please sign in again.');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read sheet data (${res.status})`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  const transactions: AssetTransaction[] = [];

  rows.forEach((row, index) => {
    // Row format: [ID, Date, Item Name, Type, Quantity, Remarks, Logged At]
    // If sheet format is simpler [Date, Item Name, Type, Quantity, Remarks]:
    let id = '';
    let date = '';
    let itemName = '';
    let type: 'IN' | 'OUT' = 'IN';
    let quantity = 0;
    let remarks = '';

    if (row.length >= 5) {
      if (row[3] === 'IN' || row[3] === 'OUT') {
        // Standard format: [id, date, itemName, type, quantity, remarks]
        id = String(row[0] || `tx-${Date.now()}-${index}`);
        date = String(row[1] || new Date().toISOString().split('T')[0]);
        itemName = String(row[2] || '').trim();
        type = row[3] === 'OUT' ? 'OUT' : 'IN';
        quantity = Math.abs(parseInt(String(row[4]), 10)) || 0;
        remarks = String(row[5] || '');
      } else if (row[2] === 'IN' || row[2] === 'OUT') {
        // Alternative format: [date, itemName, type, quantity, remarks]
        id = `tx-${Date.now()}-${index}`;
        date = String(row[0] || new Date().toISOString().split('T')[0]);
        itemName = String(row[1] || '').trim();
        type = row[2] === 'OUT' ? 'OUT' : 'IN';
        quantity = Math.abs(parseInt(String(row[3]), 10)) || 0;
        remarks = String(row[4] || '');
      }
    }

    if (itemName && quantity > 0) {
      transactions.push({
        id: id || `tx-${index}`,
        date,
        itemName,
        type,
        quantity,
        remarks,
        sheetRowIndex: index + 2, // 1-indexed row number in Google Sheet
      });
    }
  });

  // Sort descending by date / order
  return transactions.reverse();
}

/**
 * Appends a new transaction row to the Google Sheet.
 */
export async function appendTransactionToSheet(
  accessToken: string,
  spreadsheetId: string,
  tx: AssetTransaction,
  sheetTitle = 'Transactions'
): Promise<void> {
  const range = `${sheetTitle}!A:G`;
  const rowValues = [
    tx.id,
    tx.date,
    tx.itemName.toUpperCase().trim(),
    tx.type,
    tx.quantity,
    tx.remarks || '',
    new Date().toISOString(),
  ];

  const res = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to append transaction (${res.status})`);
  }
}

/**
 * Overwrites all transactions in the sheet (e.g. after a deletion).
 * WARNING: Destructive operation - requires user confirmation before calling!
 */
export async function overwriteAllTransactionsInSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: AssetTransaction[],
  sheetTitle = 'Transactions'
): Promise<void> {
  // 1. Clear existing rows A2:G5000
  const clearRange = `${sheetTitle}!A2:G5000`;
  await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (transactions.length === 0) return;

  // 2. Prepare chronological rows
  const rows = [...transactions].reverse().map((tx) => [
    tx.id,
    tx.date,
    tx.itemName.toUpperCase().trim(),
    tx.type,
    tx.quantity,
    tx.remarks || '',
    new Date().toISOString(),
  ]);

  const updateRange = `${sheetTitle}!A2:G${rows.length + 1}`;
  const res = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update transactions (${res.status})`);
  }
}

/**
 * Updates the "Live Stock Summary" sheet tab with real-time stock balances and status.
 */
export async function updateStockSummaryTab(
  accessToken: string,
  spreadsheetId: string,
  summary: Record<string, { totalIn: number; totalOut: number; currentStock: number }>,
  sheetTitle = 'Live Stock Summary'
): Promise<void> {
  try {
    const sortedItems = Object.entries(summary).sort(([a], [b]) => a.localeCompare(b));
    const nowStr = new Date().toLocaleString();

    const rows = sortedItems.map(([name, data]) => {
      let status = 'In Stock';
      if (data.currentStock < 0) status = 'Negative Stock';
      else if (data.currentStock === 0) status = 'Out of Stock';
      else if (data.currentStock <= 5) status = 'Low Stock';

      return [
        name,
        data.totalIn,
        data.totalOut,
        data.currentStock,
        status,
        nowStr,
      ];
    });

    // Clear previous summary data
    const clearRange = `${sheetTitle}!A2:F500`;
    await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (rows.length > 0) {
      const updateRange = `${sheetTitle}!A2:F${rows.length + 1}`;
      await fetch(
        `${SHEETS_API_BASE}/${spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }
      );
    }
  } catch (err) {
    // Non-critical background update for summary tab; log warning
    console.warn('Could not sync Live Stock Summary tab (sheet tab might not exist):', err);
  }
}
