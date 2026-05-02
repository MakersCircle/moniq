import { googleService } from '../lib/google';
import { useDataStore } from '../store/dataStore';
import type { UserSettings } from '../types';

const BACKUP_FOLDER_NAME = 'Moniq Backups';

const RETENTION_LIMITS = {
  daily: 7,
  weekly: 5,
  monthly: 12,
  yearly: 999, // Practically infinite
};

/**
 * BackupManager handles the tiered backup logic for Moniq.
 * It interfaces with Google Drive to clone the spreadsheet and manages retention.
 */
export class BackupManager {
  private static instance: BackupManager | null = null;

  static getInstance() {
    if (!this.instance) this.instance = new BackupManager();
    return this.instance;
  }

  /**
   * Main entry point called by SyncEngine after successful sync.
   * Evaluates if any tier needs a backup and performs it.
   */
  async runBackupCycle(force: boolean = false): Promise<void> {
    const state = useDataStore.getState();
    const { spreadsheetId, settings } = state;
    if (!spreadsheetId) return;

    const requiredTiers = force
      ? ['daily', 'weekly', 'monthly', 'yearly']
      : this.getRequiredTiers(settings);

    if (requiredTiers.length === 0) return;

    // console.log('[BackupManager] Starting backup cycle for tiers:', requiredTiers);

    try {
      const folderId = await this.ensureBackupFolder();

      for (const tier of requiredTiers) {
        // console.log(`[BackupManager] Creating ${tier} backup...`);
        await this.performBackup(tier, spreadsheetId, folderId);
        await this.cleanupOldBackups(tier, folderId);
      }

      // console.log('[BackupManager] Backup cycle completed successfully.');
    } catch (error) {
      console.error('[BackupManager] Backup cycle failed:', error);
    }
  }

  /** Ensures the "Moniq Backups" folder exists in Drive. */
  private async ensureBackupFolder(): Promise<string> {
    const existingId = await googleService.findFolder(BACKUP_FOLDER_NAME);
    if (existingId) return existingId;
    return await googleService.createFolder(BACKUP_FOLDER_NAME);
  }

  /** Determines which backup tiers are due based on current settings and date. */
  private getRequiredTiers(settings: UserSettings): string[] {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const tiers: string[] = [];

    // 1. Daily: If not backed up today
    if (settings.lastDailyBackup !== todayStr) {
      tiers.push('daily');
    }

    // 2. Weekly: Every Monday
    const isMonday = now.getDay() === 1;
    if (isMonday) {
      const weekStr = this.getWeekString(now);
      if (settings.lastWeeklyBackup !== weekStr) {
        tiers.push('weekly');
      }
    }

    // 3. Monthly: 1st of every month
    const isFirstOfMonth = now.getDate() === 1;
    if (isFirstOfMonth) {
      const monthStr = todayStr.substring(0, 7); // YYYY-MM
      if (settings.lastMonthlyBackup !== monthStr) {
        tiers.push('monthly');
      }
    }

    // 4. Yearly: Start of Fiscal Year (respects user settings)
    const currentMonth = now.getMonth() + 1;
    const isFiscalStart = currentMonth === settings.fiscalYearStartMonth && now.getDate() === 1;
    if (isFiscalStart) {
      const yearStr = String(now.getFullYear());
      if (settings.lastYearlyBackup !== yearStr) {
        tiers.push('yearly');
      }
    }

    return tiers;
  }

  /** Performs the file copy and updates local settings. */
  private async performBackup(
    tier: string,
    spreadsheetId: string,
    folderId: string
  ): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const newName = `moniq-backup-${tier}-${dateStr}`;

    await googleService.copyFile(spreadsheetId, folderId, newName);

    // Update settings in store (which triggers a sync to the remote Settings sheet)
    const patch: Partial<UserSettings> = {};
    if (tier === 'daily') patch.lastDailyBackup = dateStr;
    if (tier === 'weekly') patch.lastWeeklyBackup = this.getWeekString(now);
    if (tier === 'monthly') patch.lastMonthlyBackup = dateStr.substring(0, 7);
    if (tier === 'yearly') patch.lastYearlyBackup = String(now.getFullYear());

    useDataStore.getState().updateSettings(patch);
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
}
