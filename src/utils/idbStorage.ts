const DB_NAME = 'ScholarCardPro_DB';

const LEGACY_STORAGE_KEYS = [
  'scholarcard_auth',
  'scholarcard_settings_v1',
  'scholarcard_students_v1',
  'scholarcard_is_demo_mode_v1',
  'scholarcard_settings_v2',
  'scholarcard_students_v2',
  'scholarcard_is_demo_v2',
  'scholarcard_custom_templates_v2',
  'scholarcard_export_history_v1',
  'scholarcard_registered_users',
  'scholarcard_qr_v2_migrated',
  'scholarcard_printscale_v3_migrated',
];

/**
 * Purges legacy unscoped browser caches (localStorage, sessionStorage, and old IndexedDB)
 * so user workspaces never bleed across accounts on shared workstations.
 */
export async function clearLegacyLocalCaches(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      for (const key of LEGACY_STORAGE_KEYS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // ignore storage access errors
        }
        try {
          window.sessionStorage.removeItem(key);
        } catch {
          // ignore storage access errors
        }
      }

      if (window.indexedDB && typeof window.indexedDB.deleteDatabase === 'function') {
        await new Promise<void>((resolve) => {
          try {
            const req = window.indexedDB.deleteDatabase(DB_NAME);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          } catch {
            resolve();
          }
        });
      }
    }
  } catch {
    // non-fatal cleanup
  }
}
