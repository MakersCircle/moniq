import { googleService } from '../lib/google';
import { useDataStore } from '../store/dataStore';
import type { UserSettings } from '../types';

const BACKUP_FOLDER_NAME = 'Moniq Backups';

const RETENTION_LIMITS = {
  manual: 5,
  daily: 7,
  weekly: 5,
  monthly: 12,
  yearly: 999, // Practically infinite
};

export interface BackupSnapshot {
  id: string;
  name: string;
  date: string; // The parsed suffix (e.g. 2026-06-20)
  timestamp: string; // The actual file createdTime from Drive
  tier: string;
}

/**
 * BackupManager handles the tiered backup logic for Moniq.
 * It interfaces with Google Drive to clone the spreadsheet and manages retention.
 */
export class BackupManager {
  private static instance: BackupManager | null = null;
  private isRunning = false;

  static getInstance() {
    if (!this.instance) this.instance = new BackupManager();
    return this.instance;
  }

  /**
   * Main entry point called by SyncEngine after successful sync.
   * Evaluates if any tier needs a backup and performs it.
   */
  async runBackupCycle(force: boolean = false): Promise<void> {
    if (this.isRunning) {
      console.log('[BackupManager] Cycle already in progress — skipping concurrent call.');
      return;
    }

    const state = useDataStore.getState();
    const { spreadsheetId, settings } = state;
    if (!spreadsheetId) return;

    const requiredTiers = force
      ? ['manual']
      : await this.getRequiredTiers(settings);

    if (requiredTiers.length === 0) return;

    this.isRunning = true;
    try {
      const folderId = await this.ensureBackupFolder();

      for (const tier of requiredTiers) {
        await this.performBackup(tier, spreadsheetId, folderId);
        await this.cleanupOldBackups(tier, folderId);
      }
    } catch (error) {
      console.error('[BackupManager] Backup cycle failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Ensures the "Moniq Backups" folder exists in Drive.
   *
   * Uses the persisted `backupFolderId` from the store to avoid a Drive-wide
   * search (which is blocked under the `drive.file` scope). Falls back to
   * creating a new folder if the ID is missing or the folder has been deleted.
   */
  private async ensureBackupFolder(): Promise<string> {
    const { backupFolderId: storedId, folderId, setBackupFolderId } = useDataStore.getState();

    if (storedId) {
      // Verify the folder is still alive.
      const verifyRes = await googleService.driveRequest(`/files/${storedId}?fields=id,trashed`);
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        if (!verifyData.trashed) return storedId;
      }
      // Stale – fall through to re-create.
      console.warn('[BackupManager] Backup folder ID stale, searching for existing...');
      setBackupFolderId(null);
    }

    if (folderId) {
      // Search for the folder within the parent moniq folder
      const q = encodeURIComponent(
        `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and '${folderId}' in parents and trashed=false`
      );
      const searchRes = await googleService.driveRequest(`/files?q=${q}&fields=files(id)&pageSize=1`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files?.length > 0) {
          const foundId = searchData.files[0].id;
          await setBackupFolderId(foundId);
          console.log('[BackupManager] Found existing backup folder via search:', foundId);
          return foundId;
        }
      }
    }

    // Create the backup folder. Nest it inside the moniq root folder if we
    // know it, otherwise create it at the Drive root (still accessible via
    // drive.file since we are creating it).
    const body: Record<string, unknown> = {
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (folderId) body.parents = [folderId];

    const createRes = await googleService.driveRequest('/files', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!createRes.ok) throw new Error('Failed to create backup folder');

    const newId: string = (await createRes.json()).id;
    await setBackupFolderId(newId);
    console.log('[BackupManager] Created new backup folder:', newId);
    return newId;
  }

  /** Determines which backup tiers are due based on actual Drive contents. */
  private async getRequiredTiers(settings: UserSettings): Promise<string[]> {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tiers: string[] = [];
    
    const latestBackups = await this.getLatestBackups();
    const getTimestamp = (tier: string) => latestBackups[tier] ? new Date(latestBackups[tier]!.timestamp) : new Date(0);

    // 1. Daily: If no backup from today
    const lastDaily = getTimestamp('daily');
    const lastDailyStr = lastDaily.getTime() === 0 ? '' : lastDaily.toISOString().split('T')[0];
    if (lastDailyStr !== todayStr) {
      tiers.push('daily');
    }

    // 2. Weekly: If no backup from current ISO week
    const currentWeekStr = this.getWeekString(now);
    const lastWeekly = getTimestamp('weekly');
    const lastWeeklyStr = lastWeekly.getTime() === 0 ? '' : this.getWeekString(lastWeekly);
    if (lastWeeklyStr !== currentWeekStr) {
      tiers.push('weekly');
    }

    // 3. Monthly: If no backup from current month
    const currentMonthStr = todayStr.substring(0, 7); // YYYY-MM
    const lastMonthly = getTimestamp('monthly');
    const lastMonthlyStr = lastMonthly.getTime() === 0 ? '' : lastMonthly.toISOString().substring(0, 7);
    if (lastMonthlyStr !== currentMonthStr) {
      tiers.push('monthly');
    }

    // 4. Yearly: If no backup from current fiscal year
    const currentFY = this.getFiscalYearString(now, settings.fiscalYearStartMonth);
    const lastYearly = getTimestamp('yearly');
    const lastYearlyStr = lastYearly.getTime() === 0 ? '' : this.getFiscalYearString(lastYearly, settings.fiscalYearStartMonth);
    if (lastYearlyStr !== currentFY) {
      tiers.push('yearly');
    }

    return tiers;
  }

  /** Performs the file copy (Google Drive is now the absolute source of truth, so we don't patch local settings). */
  private async performBackup(
    tier: string,
    spreadsheetId: string,
    folderId: string
  ): Promise<void> {
    const now = new Date();
    
    // Always include the full timestamp to avoid any collisions and track exact time
    const suffix = now.toISOString().replace(/[:.]/g, '-');
    const newName = `moniq-backup-${tier}-${suffix}`;

    await googleService.copyFile(spreadsheetId, folderId, newName);
  }

  /** Removes old backups for a tier if the retention limit is exceeded. */
  private async cleanupOldBackups(tier: string, folderId: string): Promise<void> {
    const limit = RETENTION_LIMITS[tier as keyof typeof RETENTION_LIMITS];
    if (!limit || limit > 100) return;

    // listFiles returns files sorted by createdTime desc
    const files = await googleService.listFiles(folderId, `moniq-backup-${tier}-`);
    if (files.length > limit) {
      const toDelete = files.slice(limit);
      for (const file of toDelete) {
        // console.log(`[BackupManager] Deleting old ${tier} backup: ${file.name}`);
        await googleService.deleteFile(file.id);
      }
    }
  }

  /** Helper to get an ISO-like week string (YYYY-Www). */
  private getWeekString(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }

  /** Helper to get the fiscal year string. */
  private getFiscalYearString(date: Date, startMonth: number): string {
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    // If the current month is before the fiscal start month, we're in the previous fiscal year
    return String(month >= startMonth ? year : year - 1);
  }

  /**
   * Fetches the actual list of backups from Google Drive, returning
   * the most recent snapshot for each tier.
   */
  async getLatestBackups(): Promise<Record<string, BackupSnapshot | null>> {
    const folderId = await this.ensureBackupFolder();
    if (!folderId) return {};

    // Get all files with 'moniq-backup-' prefix
    // listFiles sorts by createdTime desc, so the first match per tier is the latest.
    const files = await googleService.listFiles(folderId, 'moniq-backup-');
    
    const results: Record<string, BackupSnapshot | null> = {
      manual: null,
      daily: null,
      weekly: null,
      monthly: null,
      yearly: null,
    };

    for (const file of files) {
      const match = file.name.match(/^moniq-backup-(manual|daily|weekly|monthly|yearly)-(.*)$/);
      if (match) {
        const tier = match[1];
        const dateSuffix = match[2];
        if (!results[tier]) {
          results[tier] = {
            id: file.id,
            name: file.name,
            date: dateSuffix,
            timestamp: file.createdTime || new Date().toISOString(),
            tier
          };
        }
      }
    }
    
    return results;
  }
}
