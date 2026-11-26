import { SchoolSettings, Student } from '../types';
import { DEFAULT_SCHOOL_SETTINGS, DEMO_STUDENTS } from '../constants/initialData';

const STORAGE_KEYS = {
  STUDENTS: 'scholarcard_students_v1',
  SETTINGS: 'scholarcard_settings_v1',
  IS_DEMO: 'scholarcard_is_demo_mode_v1',
};

export const getStoredStudents = (): { students: Student[]; isDemo: boolean } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const isDemoRaw = localStorage.getItem(STORAGE_KEYS.IS_DEMO);
    if (!raw) {
      // By default start with demo students for an immediately impressive, testable operational workflow
      return { students: DEMO_STUDENTS, isDemo: true };
    }
    const parsed = JSON.parse(raw);
    return {
      students: Array.isArray(parsed) ? parsed : DEMO_STUDENTS,
      isDemo: isDemoRaw === 'true',
    };
  } catch (e) {
    console.error('Error reading students from localStorage', e);
    return { students: DEMO_STUDENTS, isDemo: true };
  }
};

export const saveStoredStudents = (students: Student[], isDemo: boolean = false): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, String(isDemo));
    return true;
  } catch (e) {
    console.error('Error writing students to localStorage', e);
    return false;
  }
};

export const getStoredSettings = (): SchoolSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SCHOOL_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SCHOOL_SETTINGS,
      ...parsed,
      visibleFields: {
        ...DEFAULT_SCHOOL_SETTINGS.visibleFields,
        ...(parsed.visibleFields || {}),
      },
      cardDimensions: {
        ...DEFAULT_SCHOOL_SETTINGS.cardDimensions,
        ...(parsed.cardDimensions || {}),
      },
    };
  } catch (e) {
    console.error('Error reading settings from localStorage', e);
    return DEFAULT_SCHOOL_SETTINGS;
  }
};

export const saveStoredSettings = (settings: SchoolSettings): boolean => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    return true;
  } catch (e) {
    console.error('Error saving settings to localStorage', e);
    return false;
  }
};

export const resetStoredDataToDemo = (): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEMO_STUDENTS));
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, 'true');
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SCHOOL_SETTINGS));
  } catch (e) {
    console.error('Error resetting to demo', e);
  }
};

export const clearAllStudents = (): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, 'false');
  } catch (e) {
    console.error('Error clearing students', e);
  }
};
