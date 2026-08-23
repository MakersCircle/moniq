/** Message types broadcast between tabs during migration. */
export type MigrationMessage =
  { type: 'MIGRATION_STARTED'; version: number } | { type: 'MIGRATION_DONE'; version: number };

type MigrationListener = (msg: MigrationMessage) => void;

/**
 * Thin wrapper around BroadcastChannel for migration coordination.
 *
 * When a migration starts in one tab, all other tabs are notified so they
 * can gate their sync flush loops. When the migration completes, all tabs
 * are unblocked.
 *
 * Falls back gracefully if BroadcastChannel is not available.
 */
class MigrationChannel {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<MigrationListener> = new Set();

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('moniq-migration');
      this.channel.onmessage = (event: MessageEvent<MigrationMessage>) => {
        for (const listener of this.listeners) {
          listener(event.data);
        }
      };
    }
  }

  /** Send a message to all other tabs. */
  broadcast(msg: MigrationMessage): void {
    try {
      this.channel?.postMessage(msg);
    } catch (err) {
      console.warn('[MigrationChannel] postMessage failed:', err);
    }
  }

  /** Subscribe to messages from other tabs. Returns an unsubscribe function. */
  subscribe(listener: MigrationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy(): void {
    this.channel?.close();
    this.channel = null;
    this.listeners.clear();
  }
}

export const migrationChannel = new MigrationChannel();
