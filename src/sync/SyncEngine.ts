import type { Account, PaymentMethod, Category, Transaction, Budget, SyncOperation, SyncEntityType } from '../types';
import { SheetClient } from './SheetClient';
import { reconcile, computeChecksum } from './ConflictResolver';
import { SHEET_NAMES, SHEET_HEADERS, DEFAULT_SYNC_CONFIG, type SyncConfig, type RowIndex, type RowIndexMap, type SyncStatus } from './types';
import {
  getAll, putMany, clearStore, addToSyncQueue,
  getAllSyncQueue, removeSyncOp, clearSyncQueue, clearRemoteSnapshot,
  setMeta, getMeta,
} from '../lib/db';

// ── Utility helpers ──────────────────────────────────────────────

/**
 * Converts a Google Sheets serial date (number of days since 1899-12-30) 
 * back into an ISO YYYY-MM-DD date string.
 */
function unserialDate(val: any): string {
  if (!val || typeof val !== 'string' || !/^\d+(\.\d+)?$/.test(val.trim())) {
    return val || '';
  }
  
  const serial = parseFloat(val.trim());
  if (serial < 30000 || serial > 60000) return val; // Likely not a serial date within our range

  // Excel/Sheets serial dates start from Dec 30, 1899
  const baseDate = new Date(1899, 11, 30);
  const targetDate = new Date(baseDate.getTime() + serial * 86400000);
  
  return targetDate.toISOString().split('T')[0];
}

function getValue(row: string[], header: string[], field: string): string {
  const idx = header.indexOf(field);
  if (idx === -1) return '';
  return row[idx] || '';
}

// ── Serialization helpers ────────────────────────────────────────

function serializeTransaction(t: Transaction): string[] {
  return [
    t.id, t.groupId || '', t.uiType, JSON.stringify(t.entries),
    String(t.amount), t.date, t.methodId || '', t.note || '',
    (t.tags || []).join(','),
    t.isDeleted ? 'TRUE' : 'FALSE', t.createdAt, t.updatedAt, '',
  ];
}

function serializeAccount(a: Account): string[] {
  return [
    a.id, a.name, a.type, a.description || '',
    a.isSavings ? 'TRUE' : 'FALSE', String(a.initialBalance),
    a.excludeFromNet ? 'TRUE' : 'FALSE', a.isActive ? 'TRUE' : 'FALSE',
    a.createdAt, a.updatedAt, '',
  ];
}

function serializeMethod(m: PaymentMethod): string[] {
  return [
    m.id, m.name, m.linkedAccountId || '',
    m.isActive ? 'TRUE' : 'FALSE', m.createdAt, m.updatedAt, '',
  ];
}

function serializeCategory(c: Category): string[] {
  return [
    c.id, c.group, c.head, c.subHead || '',
    String(c.initialBalance || 0), c.isActive ? 'TRUE' : 'FALSE',
    c.createdAt, c.updatedAt, '',
  ];
}

function serializeBudget(b: Budget): string[] {
  return [
    b.id, b.categoryId, b.period, String(b.amount),
    b.createdAt, b.updatedAt, '',
  ];
}

// ── Deserialization helpers ──────────────────────────────────────

function deserializeTransaction(row: string[], header: string[]): Transaction {
  const entriesRaw = getValue(row, header, 'Entries JSON');
  return {
    id: getValue(row, header, 'ID'),
    groupId: getValue(row, header, 'Group ID'),
    uiType: (getValue(row, header, 'UI Type') as Transaction['uiType']) || 'expense',
    entries: entriesRaw ? JSON.parse(entriesRaw) : [],
    amount: Number(getValue(row, header, 'Amount')) || 0,
    date: unserialDate(getValue(row, header, 'Date')),
    methodId: getValue(row, header, 'Method ID') || undefined,
    note: getValue(row, header, 'Note'),
    tags: getValue(row, header, 'Tags').split(',').filter(Boolean),
    isDeleted: getValue(row, header, 'Is Deleted') === 'TRUE',
    createdAt: getValue(row, header, 'Created At'),
    updatedAt: getValue(row, header, 'Updated At') || getValue(row, header, 'Created At'),
  };
}

function deserializeAccount(row: string[], header: string[]): Account {
  return {
    id: getValue(row, header, 'ID'),
    name: getValue(row, header, 'Name'),
    type: (getValue(row, header, 'Type') as Account['type']) || 'Asset',
    description: getValue(row, header, 'Description') || undefined,
    isSavings: getValue(row, header, 'Is Savings') === 'TRUE',
    initialBalance: Number(getValue(row, header, 'Initial Balance')) || 0,
    excludeFromNet: getValue(row, header, 'Exclude Net') === 'TRUE',
    isActive: getValue(row, header, 'Is Active') === 'TRUE',
    createdAt: getValue(row, header, 'Created At'),
    updatedAt: getValue(row, header, 'Updated At') || getValue(row, header, 'Created At'),
  };
}

function deserializeMethod(row: string[], header: string[]): PaymentMethod {
  return {
    id: getValue(row, header, 'ID'),
    name: getValue(row, header, 'Name'),
    linkedAccountId: getValue(row, header, 'Linked Account ID') || undefined,
    isActive: getValue(row, header, 'Is Active') === 'TRUE',
    createdAt: getValue(row, header, 'Created At'),
    updatedAt: getValue(row, header, 'Updated At') || getValue(row, header, 'Created At'),
  };
}

function deserializeCategory(row: string[], header: string[]): Category {
  return {
    id: getValue(row, header, 'ID'),
    group: (getValue(row, header, 'Group') as Category['group']) || 'Needs',
    head: getValue(row, header, 'Head'),
    subHead: getValue(row, header, 'Sub Head') || undefined,
    initialBalance: Number(getValue(row, header, 'Initial Balance')) || undefined,
    isActive: getValue(row, header, 'Is Active') === 'TRUE',
    createdAt: getValue(row, header, 'Created At'),
    updatedAt: getValue(row, header, 'Updated At') || getValue(row, header, 'Created At'),
  };
}

function deserializeBudget(row: string[], header: string[]): Budget {
  return {
    id: getValue(row, header, 'ID'),
    categoryId: getValue(row, header, 'Category ID'),
    period: getValue(row, header, 'Period'),
    amount: Number(getValue(row, header, 'Amount')) || 0,
    createdAt: getValue(row, header, 'Created At'),
    updatedAt: getValue(row, header, 'Updated At') || getValue(row, header, 'Created At'),
  };
}

// ── Checksum helpers ─────────────────────────────────────────────

/** Compute checksum from a serialized row (excluding the checksum column itself) */
function checksumFromRow(row: string[]): string {
  const fieldsWithoutChecksum = row.slice(0, -1);
  return computeChecksum(fieldsWithoutChecksum);
}

/** Compute checksum for a typed entity by serializing it first */
function makeEntityChecksumFn<T>(serializeFn: (entity: T) => string[]): (entity: T) => string {
  return (entity: T) => {
    const row = serializeFn(entity);
    return checksumFromRow(row);
  };
}

// ── Sync Engine ──────────────────────────────────────────────────

type SyncListener = (status: SyncStatus, pendingCount: number, error?: string) => void;

export class SyncEngine {
  private static instance: SyncEngine | null = null;

  private client: SheetClient | null = null;
  private config: SyncConfig;
  private rowIndexes: RowIndexMap;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: SyncStatus = 'idle';
  private _pendingCount = 0;
  private _lastError: string | undefined;
  private listeners: Set<SyncListener> = new Set();
  private isInitialized = false;

  private constructor(config?: Partial<SyncConfig>) {
    this.config = { ...DEFAULT_SYNC_CONFIG, ...config };
    this.rowIndexes = {
      transactions: new Map(),
      accounts: new Map(),
      methods: new Map(),
      categories: new Map(),
      budgets: new Map(),
      settings: new Map(),
    };
  }

  static getInstance(config?: Partial<SyncConfig>): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine(config);
    }
    return SyncEngine.instance;
  }

  /** Reset the singleton (for testing or logout) */
  static reset(): void {
    if (SyncEngine.instance) {
      SyncEngine.instance.destroy();
      SyncEngine.instance = null;
    }
  }

  // ── Status Management ──────────────────────────────────────────

  get status(): SyncStatus { return this._status; }
  get pendingCount(): number { return this._pendingCount; }
  get lastError(): string | undefined { return this._lastError; }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: SyncStatus, error?: string) {
    this._status = status;
    this._lastError = error;
    this.notifyListeners();
  }

  private async updatePendingCount() {
    const queue = await getAllSyncQueue();
    this._pendingCount = queue.length;
    this.notifyListeners();
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(this._status, this._pendingCount, this._lastError);
    }
  }

  // ── Initialization (Pull + Reconcile) ──────────────────────────

  /**
   * Initialize the sync engine. On first load:
   * 1. Read all sheets from Google
   * 2. Write to IDB remote_snapshot
   * 3. Reconcile with local IDB
   * 4. Return reconciled data for Zustand hydration
   */
  async initialize(
    accessToken: string,
    spreadsheetId: string,
  ): Promise<{
    accounts: Account[];
    methods: PaymentMethod[];
    categories: Category[];
    transactions: Transaction[];
    budgets: Budget[];
    settings: Record<string, string>;
  } | null> {
    this.client = new SheetClient(accessToken, spreadsheetId);
    this.setStatus('pulling');

    try {
      // Ensure all sheet tabs exist
      await this.client.ensureSheetTabs(Object.values(SHEET_NAMES));

      // Check for legacy sheets (e.g., "Sources")
      const legacyRows = await this.client.readSheet('Sources');
      if (legacyRows.length > 1) {
        // Only migrate if we haven't already
        const methodsRes = await this.client.readSheet('Methods');
        if (methodsRes.length <= 1) {
          console.warn('Found legacy "Sources" sheet and "Methods" is empty. Attempting migration...');
          await this.migrateLegacySources(legacyRows);
        }
      }

      // Ensure headers exist on each sheet
      for (const sheetName of Object.values(SHEET_NAMES)) {
        await this.client.ensureHeaders(sheetName);
      }

      // Pull all data from sheets
      const [txRows, accRows, metRows, catRows, budRows, setRows] = await Promise.all([
        this.client.readSheet('Transactions'),
        this.client.readSheet('Accounts'),
        this.client.readSheet('Methods'),
        this.client.readSheet('Categories'),
        this.client.readSheet('Budgets'),
        this.client.readSheet('Settings'),
      ]);

      // Parse remote data (skip header rows)
      const txHeader = txRows[0] || [];
      const accHeader = accRows[0] || [];
      const metHeader = metRows[0] || [];
      const catHeader = catRows[0] || [];
      const budHeader = budRows[0] || [];

      const remoteTxns = txRows.slice(1).filter(r => r[0]).map(r => deserializeTransaction(r, txHeader));
      const remoteAccs = accRows.slice(1).filter(r => r[0]).map(r => deserializeAccount(r, accHeader));
      const remoteMets = metRows.slice(1).filter(r => r[0]).map(r => deserializeMethod(r, metHeader));
      const remoteCats = catRows.slice(1).filter(r => r[0]).map(r => deserializeCategory(r, catHeader));
      const remoteBuds = budRows.slice(1).filter(r => r[0]).map(r => deserializeBudget(r, budHeader));

      // Parse remote settings
      const remoteSettings: Record<string, string> = {};
      for (const row of setRows.slice(1)) {
        if (row[0]) remoteSettings[row[0]] = row[1] || '';
      }

      // Build remote checksum maps
      const buildChecksumMap = (rows: string[][]): Map<string, string> => {
        const map = new Map<string, string>();
        for (const row of rows.slice(1)) {
          if (row[0]) {
            const storedChecksum = row[row.length - 1] || '';
            map.set(row[0], storedChecksum);
          }
        }
        return map;
      };

      const txChecksums = buildChecksumMap(txRows);
      const accChecksums = buildChecksumMap(accRows);
      const metChecksums = buildChecksumMap(metRows);
      const catChecksums = buildChecksumMap(catRows);
      const budChecksums = buildChecksumMap(budRows);

      // Check for header mismatches and trigger repairs if needed
      const repairs: Promise<void>[] = [];
      const checkAndRepair = (name: string, rows: string[][], target: string[]) => {
        const current = rows[0] || [];
        const mismatch = current.length !== target.length || current.some((h, i) => h !== target[i]);
        if (mismatch && rows.length > 0) {
          console.warn(`Header mismatch in "${name}". Triggering repair...`);
          repairs.push(this.client!.overwriteSheet(name, rows.slice(1)));
        }
      };
      
      checkAndRepair('Transactions', txRows, SHEET_HEADERS.Transactions);
      checkAndRepair('Accounts', accRows, SHEET_HEADERS.Accounts);
      checkAndRepair('Methods', metRows, SHEET_HEADERS.Methods);
      checkAndRepair('Categories', catRows, SHEET_HEADERS.Categories);
      checkAndRepair('Budgets', budRows, SHEET_HEADERS.Budgets);

      if (repairs.length > 0) {
        await Promise.all(repairs);
        // If we repaired, we should probably re-read or just trust the next sync will be clean.
        // For now, let's just proceed with the data we already parsed (which was using the dynamic header mapping anyway).
      }

      // Read local data from Zustand store
      const { useDataStore } = await import('../store/dataStore');
      const state = useDataStore.getState();
      
      // De-duplicate remote data before reconciliation
      const remoteTxnsDeduped = this.deduplicate(remoteTxns);
      const remoteAccsDeduped = this.deduplicate(remoteAccs);
      const remoteMetsDeduped = this.deduplicate(remoteMets);
      const remoteCatsDeduped = this.deduplicate(remoteCats);
      const remoteBudsDeduped = this.deduplicate(remoteBuds);

      const localTxns = state.transactions;
      const localAccs = state.accounts;
      const localMets = state.methods;
      const localCats = state.categories;
      const localBuds = state.budgets;

      // Reconcile each entity type
      const txResult = reconcile(localTxns, remoteTxnsDeduped, txChecksums, makeEntityChecksumFn(serializeTransaction));
      const accResult = reconcile(localAccs, remoteAccsDeduped, accChecksums, makeEntityChecksumFn(serializeAccount));
      const metResult = reconcile(localMets, remoteMetsDeduped, metChecksums, makeEntityChecksumFn(serializeMethod));
      const catResult = reconcile(localCats, remoteCatsDeduped, catChecksums, makeEntityChecksumFn(serializeCategory));
      const budResult = reconcile(localBuds, remoteBudsDeduped, budChecksums, makeEntityChecksumFn(serializeBudget));

      // Hydration will be handled by App.tsx using the returned reconciled data

      // Build row indexes from current sheet data
      this.buildRowIndexes(txRows, accRows, metRows, catRows, budRows);

      // Push local-wins back to sheets
      await this.pushReconciled('Transactions', txResult.toUpload, serializeTransaction);
      await this.pushReconciled('Accounts', accResult.toUpload, serializeAccount);
      await this.pushReconciled('Methods', metResult.toUpload, serializeMethod);
      await this.pushReconciled('Categories', catResult.toUpload, serializeCategory);
      await this.pushReconciled('Budgets', budResult.toUpload, serializeBudget);

      // The sync_queue tracks delta mutations (dirty state).
      // Since we just ran object-by-object global reconciliation and pushed all local-wins
      // back to Google Sheets, the entire dataset is clean. Pending tracking is redundant 
      // and flushing it now could cause duplicate appends.
      await clearSyncQueue();

      await setMeta('lastSyncedAt', new Date().toISOString());
      this.isInitialized = true;
      this.setStatus('idle');

      return {
        accounts: accResult.merged,
        methods: metResult.merged,
        categories: catResult.merged,
        transactions: txResult.merged,
        budgets: budResult.merged,
        settings: remoteSettings,
      };
    } catch (err: any) {
      console.error('[SyncEngine] Initialization failed:', err);
      this.setStatus('error', err.message || 'Initialization failed');
      // Return null — the app should still work with local data
      return null;
    }
  }

  // ── Row Index Management ───────────────────────────────────────

  private buildRowIndexes(
    txRows: string[][], accRows: string[][], metRows: string[][],
    catRows: string[][], budRows: string[][],
  ) {
    this.rowIndexes.transactions = this.buildIndex(txRows);
    this.rowIndexes.accounts = this.buildIndex(accRows);
    this.rowIndexes.methods = this.buildIndex(metRows);
    this.rowIndexes.categories = this.buildIndex(catRows);
    this.rowIndexes.budgets = this.buildIndex(budRows);
  }

  private buildIndex(rows: string[][]): RowIndex {
    const map = new Map<string, number>();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0]) {
        map.set(rows[i][0], i + 1); // 1-based row index (sheet row numbers)
      }
    }
    return map;
  }

  private getEntityStore(entity: SyncEntityType): keyof RowIndexMap {
    const mapping: Record<SyncEntityType, keyof RowIndexMap> = {
      transaction: 'transactions',
      account: 'accounts',
      method: 'methods',
      category: 'categories',
      budget: 'budgets',
      settings: 'settings',
    };
    return mapping[entity];
  }

  // ── Dirty Tracking ─────────────────────────────────────────────

  /**
   * Called by the data store after each mutation.
   * Adds an operation to the sync queue and schedules a debounced flush.
   */
  async markDirty(entity: SyncEntityType, entityId: string, action: 'create' | 'update' | 'delete'): Promise<void> {
    const op: SyncOperation = {
      id: crypto.randomUUID(),
      entity,
      action,
      entityId,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    await addToSyncQueue(op);
    await this.updatePendingCount();
    this.scheduleDebouncedFlush();
  }

  private scheduleDebouncedFlush() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.flush();
    }, this.config.debounceMs);
  }

  // ── Flush (Push to Sheets) ─────────────────────────────────────

  /** Force an immediate flush of all pending operations. */
  async forceSync(): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    await this.flush();
  }

  private async flush(): Promise<void> {
    if (!this.client || this._status === 'syncing') return;

    const queue = await getAllSyncQueue();
    if (queue.length === 0) {
      this.setStatus('idle');
      return;
    }

    this.setStatus('syncing');

    try {
      // Deduplicate: if multiple ops for the same entity, keep the latest
      const dedupedOps = this.deduplicateQueue(queue);

      // Group by entity type
      const grouped = new Map<SyncEntityType, SyncOperation[]>();
      for (const op of dedupedOps) {
        const existing = grouped.get(op.entity) || [];
        existing.push(op);
        grouped.set(op.entity, existing);
      }

      // Process each entity type
      for (const [entityType, ops] of grouped) {
        await this.flushEntityOps(entityType, ops);
      }

      // Clear the queue on success
      const syncTime = new Date().toISOString();
      await clearSyncQueue();
      await setMeta('lastSyncedAt', syncTime);
      await this.updatePendingCount();
      this.setStatus('idle');
      
      const { useDataStore } = await import('../store/dataStore');
      useDataStore.getState().setLastSyncedAt(syncTime);
    } catch (err: any) {
      console.error('[SyncEngine] Flush failed:', err);
      this.setStatus('error', err.message || 'Sync failed');
      this.scheduleRetry();
    }
  }

  private async flushEntityOps(entityType: SyncEntityType, ops: SyncOperation[]): Promise<void> {
    if (!this.client) return;

    // Settings are handled differently (key-value, not entity rows)
    if (entityType === 'settings') {
      await this.flushSettings();
      return;
    }

    const sheetName = SHEET_NAMES[entityType];
    const storeName = this.getEntityStore(entityType);
    const rowIndex = this.rowIndexes[storeName as keyof RowIndexMap] as RowIndex;
    const serializeFn = this.getSerializeFn(entityType);

    const newRows: string[] [] = [];
    const updateBatch: { rowIndex: number; data: string[] }[] = [];

    const { useDataStore } = await import('../store/dataStore');
    const state = useDataStore.getState() as any;
    const entityArray = state[storeName] || [];

    for (const op of ops) {
      if (op.action === 'create') {
        // Read entity from Zustand state
        const entity = entityArray.find((e: any) => e.id === op.entityId);
        if (!entity) continue;

        const row = serializeFn(entity as any);
        // Set checksum
        row[row.length - 1] = checksumFromRow(row);
        newRows.push(row);
      } else if (op.action === 'update' || op.action === 'delete') {
        const existingRowIdx = rowIndex.get(op.entityId);
        const entity = entityArray.find((e: any) => e.id === op.entityId);
        if (!entity) continue;

        const row = serializeFn(entity as any);
        row[row.length - 1] = checksumFromRow(row);

        if (existingRowIdx) {
          updateBatch.push({ rowIndex: existingRowIdx, data: row });
        } else {
          // Entity exists locally but has no sheet row — append it
          newRows.push(row);
        }
      }
    }

    // Execute writes
    if (updateBatch.length > 0) {
      await this.client.batchUpdateRows(sheetName, updateBatch);
    }
    if (newRows.length > 0) {
      const appendedCount = await this.client.appendRows(sheetName, newRows);
      // Update row index for newly appended rows
      const currentRowCount = await this.client.getRowCount(sheetName);
      const startRow = currentRowCount - appendedCount + 2; // +2: 1-based + header
      for (let i = 0; i < newRows.length; i++) {
        const entityId = newRows[i][0];
        rowIndex.set(entityId, startRow + i);
      }
    }
  }

  private async flushSettings(): Promise<void> {
    if (!this.client) return;

    // For settings, we do a full overwrite of the Settings sheet since it's small
    const { getAllSettings } = await import('../lib/db');
    const settings = await getAllSettings();

    const rows = Object.entries(settings).map(([k, v]) => {
      const row = [k, String(v), ''];
      row[2] = computeChecksum([k, String(v)]);
      return row;
    });

    await this.client.overwriteSheet('Settings', rows);
  }

  private async flushQueue(): Promise<void> {
    const queue = await getAllSyncQueue();
    if (queue.length > 0) {
      await this.flush();
    }
  }

  /** Push reconciliation results (local-wins) back to sheets. */
  private async pushReconciled<T extends { id: string }>(
    sheetName: string,
    toUpload: T[],
    serializeFn: (entity: T) => string[],
  ): Promise<void> {
    if (!this.client || toUpload.length === 0) return;

    const storeName = sheetName.toLowerCase() as keyof RowIndexMap;
    const rowIndex = this.rowIndexes[storeName];

    const newRows: string[][] = [];
    const updateBatch: { rowIndex: number; data: string[] }[] = [];

    for (const entity of toUpload) {
      const row = serializeFn(entity);
      row[row.length - 1] = checksumFromRow(row);

      const existingRowIdx = rowIndex?.get(entity.id);
      if (existingRowIdx) {
        updateBatch.push({ rowIndex: existingRowIdx, data: row });
      } else {
        newRows.push(row);
      }
    }

    if (updateBatch.length > 0) {
      await this.client.batchUpdateRows(sheetName, updateBatch);
    }
    if (newRows.length > 0) {
      await this.client.appendRows(sheetName, newRows);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────

  private async migrateLegacySources(sources: string[][]): Promise<void> {
    const header = sources[0] || [];
    const methodsHeader = SHEET_HEADERS.Methods;
    const migratedMethods: string[][] = [];

    for (const row of sources.slice(1)) {
      if (!row[0]) continue;
      // Map legacy Source to Method
      // Sources: ID, Name, Type, Initial Balance, Currency, Is Active, Created At
      // Methods: ID, Name, Linked Account ID, Is Active, Created At, Updated At, Checksum
      const name = getValue(row, header, 'Name');
      const id = getValue(row, header, 'ID');
      const isActive = getValue(row, header, 'Is Active') === 'TRUE' ? 'TRUE' : 'FALSE';
      const createdAt = getValue(row, header, 'Created At');

      const migratedRow = [
        id, name, '', isActive, createdAt, createdAt, '',
      ];
      migratedRow[6] = checksumFromRow(migratedRow);
      migratedMethods.push(migratedRow);
    }

    if (migratedMethods.length > 0) {
      await this.client!.appendRows('Methods', migratedMethods);
      // Optional: Rename or clear Sources to prevent re-migration
      // For safety, let's just leave it but it won't be read again if Methods is populated now.
    }
  }

  private deduplicate<T extends { id: string; updatedAt: string }>(items: T[]): T[] {
    const latest = new Map<string, T>();
    for (const item of items) {
      const existing = latest.get(item.id);
      if (!existing || new Date(item.updatedAt) > new Date(existing.updatedAt)) {
        latest.set(item.id, item);
      }
    }
    return Array.from(latest.values());
  }

  private deduplicateQueue(queue: SyncOperation[]): SyncOperation[] {
    // For each entity+entityId combo, keep only the latest operation
    const latest = new Map<string, SyncOperation>();
    for (const op of queue) {
      const key = `${op.entity}:${op.entityId}`;
      const existing = latest.get(key);
      if (!existing || new Date(op.timestamp) > new Date(existing.timestamp)) {
        latest.set(key, op);
      }
    }
    return Array.from(latest.values());
  }

  private getSerializeFn(entityType: SyncEntityType): (entity: any) => string[] {
    switch (entityType) {
      case 'transaction': return serializeTransaction;
      case 'account': return serializeAccount;
      case 'method': return serializeMethod;
      case 'category': return serializeCategory;
      case 'budget': return serializeBudget;
      default: return () => [];
    }
  }

  // ── Retry with Backoff ─────────────────────────────────────────

  private scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);

    // Simple exponential backoff based on pending queue
    const delay = Math.min(
      this.config.baseRetryDelayMs * 2,
      this.config.maxRetryDelayMs,
    );

    this.retryTimer = setTimeout(() => {
      this.flush();
    }, delay);
  }

  // ── Cleanup ────────────────────────────────────────────────────

  destroy() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.listeners.clear();
    this.client = null;
    this.isInitialized = false;
  }
}
