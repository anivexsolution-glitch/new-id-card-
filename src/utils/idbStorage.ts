import { SavedCustomTemplate, SchoolSettings, Student } from '../types';
import { DEFAULT_SCHOOL_SETTINGS, DEMO_STUDENTS } from '../constants/initialData';

const DB_NAME = 'ScholarCardPro_DB';
const DB_VERSION = 1;
const STORE_SETTINGS = 'school_settings';
const STORE_STUDENTS = 'students_roster';
const STORE_METADATA = 'app_metadata';

const LOCAL_STORAGE_KEYS = {
  SETTINGS: 'scholarcard_settings_v2',
  STUDENTS: 'scholarcard_students_v2',
  IS_DEMO: 'scholarcard_is_demo_v2',
  CUSTOM_TEMPLATES: 'scholarcard_custom_templates_v2',
};

// Open IndexedDB database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_STUDENTS)) {
        db.createObjectStore(STORE_STUDENTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Persistent Settings
export async function idbSaveSettings(settings: SchoolSettings): Promise<boolean> {
  try {
    // 1. Save to LocalStorage for instant synchronous startup
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('LocalStorage quota reached for settings, relying on IndexedDB', e);
    }

    // 2. Save full object (including high-res logo & signature) to IndexedDB
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      store.put({ id: 'primary_school_settings', ...settings });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Failed to save settings to IndexedDB', err);
    return false;
  }
}

export async function idbGetSettings(): Promise<SchoolSettings> {
  try {
    const db = await openDB();
    const settingsFromDb: any = await new Promise((resolve) => {
      const tx = db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get('primary_school_settings');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (settingsFromDb) {
      return {
        ...DEFAULT_SCHOOL_SETTINGS,
        ...settingsFromDb,
        visibleFields: {
          ...DEFAULT_SCHOOL_SETTINGS.visibleFields,
          ...(settingsFromDb.visibleFields || {}),
        },
      };
    }
  } catch (err) {
    console.warn('Could not read settings from IndexedDB, checking localStorage', err);
  }

  // Fallback to LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SCHOOL_SETTINGS,
        ...parsed,
        visibleFields: {
          ...DEFAULT_SCHOOL_SETTINGS.visibleFields,
          ...(parsed.visibleFields || {}),
        },
      };
    }
  } catch (e) {
    console.error('Error reading settings from localStorage', e);
  }

  return DEFAULT_SCHOOL_SETTINGS;
}

// Persistent Students Roster
export async function idbSaveStudents(students: Student[], isDemo: boolean = false): Promise<boolean> {
  try {
    // 1. Save to LocalStorage (without full base64 photos if size too large)
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      localStorage.setItem(LOCAL_STORAGE_KEYS.IS_DEMO, String(isDemo));
    } catch (e) {
      console.warn('LocalStorage quota reached for students, relying on IndexedDB', e);
    }

    // 2. Save to IndexedDB
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_STUDENTS, STORE_METADATA], 'readwrite');
      const studentStore = tx.objectStore(STORE_STUDENTS);
      const metaStore = tx.objectStore(STORE_METADATA);

      studentStore.clear();
      students.forEach((s) => studentStore.put(s));
      metaStore.put({ key: 'is_demo', value: isDemo });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Failed to save students to IndexedDB', err);
    return false;
  }
}

export async function idbGetStudents(): Promise<{ students: Student[]; isDemo: boolean }> {
  try {
    const db = await openDB();
    const studentsFromDb: Student[] = await new Promise((resolve) => {
      const tx = db.transaction(STORE_STUDENTS, 'readonly');
      const store = tx.objectStore(STORE_STUDENTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const isDemoVal: boolean = await new Promise((resolve) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const req = store.get('is_demo');
      req.onsuccess = () => resolve(req.result ? req.result.value : true);
      req.onerror = () => resolve(true);
    });

    if (studentsFromDb && studentsFromDb.length > 0) {
      return { students: studentsFromDb, isDemo: isDemoVal };
    }
  } catch (err) {
    console.warn('Could not read students from IndexedDB, checking localStorage', err);
  }

  // Fallback to LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
    const isDemoRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.IS_DEMO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { students: parsed, isDemo: isDemoRaw === 'true' };
      }
    }
  } catch (e) {
    console.error('Error reading students from localStorage', e);
  }

  // Initial default: Demo Students
  return { students: DEMO_STUDENTS, isDemo: true };
}

// Persistent Custom Saved Templates
export async function idbSaveCustomTemplates(templates: SavedCustomTemplate[]): Promise<boolean> {
  try {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.warn('LocalStorage error saving custom templates', e);
    }

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_METADATA, 'readwrite');
      const store = tx.objectStore(STORE_METADATA);
      store.put({ key: 'user_custom_templates', value: templates });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Failed to save custom templates to IndexedDB', err);
    return false;
  }
}

export async function idbGetCustomTemplates(): Promise<SavedCustomTemplate[]> {
  try {
    const db = await openDB();
    const result: any = await new Promise((resolve) => {
      const tx = db.transaction(STORE_METADATA, 'readonly');
      const store = tx.objectStore(STORE_METADATA);
      const req = store.get('user_custom_templates');
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });

    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('Could not read custom templates from IndexedDB, fallback to localStorage', err);
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CUSTOM_TEMPLATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading custom templates from localStorage', e);
  }

  return [];
}

