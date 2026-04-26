import type { ReconcileResult } from './types';

/**
 * Computes a simple hash checksum for a row's data fields.
 * Used to detect manual edits in Google Sheets that don't update `updatedAt`.
 */
export function computeChecksum(fields: string[]): string {
  // Simple DJB2-style hash — fast and deterministic
  let hash = 5381;
  const str = fields.join('|');
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Reconciles local and remote entity arrays.
 *
 * Policy:
 * - Entity only in remote → download (new from sheet or local was cleared)
 * - Entity only in local → upload (pending local change)
 * - In both, checksums differ (sheet was manually edited) → remote wins
 * - In both, `updatedAt` differs → newer wins; tie → remote wins
 * - In both, identical → no action
 *
 * @param local - Entities from local IndexedDB
 * @param remote - Entities parsed from Google Sheets
 * @param remoteChecksums - Map of entityId → checksum as stored in the sheet
 * @param computeLocalChecksum - Function to compute checksum for a local entity
 */
export function reconcile<T extends { id: string; updatedAt: string }>(
  local: T[],
  remote: T[],
  remoteChecksums: Map<string, string>,
  computeLocalChecksum: (entity: T) => string
): ReconcileResult<T> {
  const localMap = new Map(local.map(e => [e.id, e]));
  const remoteMap = new Map(remote.map(e => [e.id, e]));

  const merged: T[] = [];
  const toUpload: T[] = [];
  const toDownload: T[] = [];
  const seen = new Set<string>();

  // Process all remote entities
  for (const [id, remoteEntity] of remoteMap) {
    seen.add(id);
    const localEntity = localMap.get(id);

    if (!localEntity) {
      // Only in remote → download
      merged.push(remoteEntity);
      toDownload.push(remoteEntity);
      continue;
    }

    // Both exist — check for manual sheet edits via checksum
    const storedChecksum = remoteChecksums.get(id);
    const localChecksum = computeLocalChecksum(localEntity);

    // If the remote data's computed checksum differs from the stored one,
    // someone manually edited the sheet → remote wins regardless of updatedAt
    const remoteDataChecksum = computeLocalChecksum(remoteEntity);
    if (storedChecksum && remoteDataChecksum !== storedChecksum) {
      // Sheet was manually edited: remote wins.
      // We must add it to toUpload as well so that the client repairs the mismatched checksum on the sheet,
      // un-locking the row for future local edits.
      merged.push(remoteEntity);
      toDownload.push(remoteEntity);
      toUpload.push(remoteEntity);
      continue;
    }

    // Standard timestamp comparison
    const localTime = new Date(localEntity.updatedAt).getTime();
    const remoteTime = new Date(remoteEntity.updatedAt).getTime();

    if (localTime > remoteTime) {
      // Local is newer → upload
      merged.push(localEntity);
      toUpload.push(localEntity);
    } else {
      // Remote is newer or equal → remote wins
      merged.push(remoteEntity);
      if (remoteTime > localTime) {
        toDownload.push(remoteEntity);
      }
    }
  }

  // Process local-only entities
  for (const [id, localEntity] of localMap) {
    if (!seen.has(id)) {
      // Only in local → upload
      merged.push(localEntity);
      toUpload.push(localEntity);
    }
  }

  return { merged, toUpload, toDownload };
}
