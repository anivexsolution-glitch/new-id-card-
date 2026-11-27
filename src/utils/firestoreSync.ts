import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  CardCustomization,
  ExportHistoryRecord,
  SavedCustomTemplate,
  SchoolSettings,
  Student,
} from '../types';
import { DEFAULT_SCHOOL_SETTINGS, DEMO_STUDENTS } from '../constants/initialData';

const MAX_DATA_URL_CHARS = 240000;

export function sanitizeDocId(rawId: string, prefix = 'doc'): string {
  const cleaned = String(rawId || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return cleaned || `${prefix}_${Date.now()}`;
}

function clampStr(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val : val == null ? fallback : String(val);
  return str.slice(0, maxLen);
}

function stripUndefinedDeep<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (input && typeof input === 'object' && !(input instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return input;
}

/**
 * Compresses oversized base64 image data URLs so every document fits comfortably
 * well below Firestore's 1MB limit while preserving high-DPI CR80 print clarity.
 */
export async function compressImageForFirestore(
  url: string | undefined,
  options: { maxDim?: number; preserveAlpha?: boolean } = {}
): Promise<string> {
  if (!url) return '';
  if (!url.startsWith('data:image/')) {
    return clampStr(url, MAX_DATA_URL_CHARS);
  }
  if (url.length <= MAX_DATA_URL_CHARS) {
    return url;
  }

  const maxDim = options.maxDim ?? 440;
  const preserveAlpha = options.preserveAlpha ?? url.startsWith('data:image/png');

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width || maxDim;
        let h = img.naturalHeight || img.height || maxDim;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.max(32, Math.round(w * ratio));
          h = Math.max(32, Math.round(h * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(url.slice(0, MAX_DATA_URL_CHARS));
          return;
        }
        if (!preserveAlpha) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);

        const mime = preserveAlpha ? 'image/webp' : 'image/jpeg';
        let quality = 0.84;
        let out = canvas.toDataURL(mime, quality);
        while (out.length > MAX_DATA_URL_CHARS && quality > 0.35) {
          quality -= 0.12;
          out = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(out.length <= MAX_DATA_URL_CHARS ? out : '');
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

function buildSanitizedSettingsFields(
  uid: string,
  settings: SchoolSettings,
  isDemoMode: boolean
) {
  const safeCustomBrand = settings.customBrandColors
    ? {
        enabled: Boolean(settings.customBrandColors.enabled),
        primary: clampStr(settings.customBrandColors.primary || '#be123c', 24),
        secondary: clampStr(settings.customBrandColors.secondary || '#881337', 24),
        accent: clampStr(settings.customBrandColors.accent || '#fbbf24', 24),
      }
    : undefined;

  const safeVisibleFields: Record<string, boolean> = {
    fatherName: settings.visibleFields?.fatherName !== false,
    motherName: settings.visibleFields?.motherName !== false,
    contactNumber: settings.visibleFields?.contactNumber !== false,
    dob: settings.visibleFields?.dob !== false,
    address: settings.visibleFields?.address !== false,
    conveyance: settings.visibleFields?.conveyance !== false,
    session: settings.visibleFields?.session !== false,
    rollNo: settings.visibleFields?.rollNo !== false,
    classGrade: settings.visibleFields?.classGrade !== false,
    bloodGroup: false,
    principalSignature: settings.visibleFields?.principalSignature !== false,
    logo: settings.visibleFields?.logo !== false,
    schoolAddress: settings.visibleFields?.schoolAddress !== false,
    schoolContact: settings.visibleFields?.schoolContact !== false,
    barcode: settings.visibleFields?.barcode !== false,
  };

  const payload: Record<string, unknown> = {
    ownerId: uid,
    schoolName: clampStr(settings.schoolName || DEFAULT_SCHOOL_SETTINGS.schoolName, 180) || 'My School',
    tagline: clampStr(settings.tagline ?? '', 240),
    schoolCode: clampStr(settings.schoolCode ?? '', 80),
    address: clampStr(settings.address ?? '', 320),
    contactNumber: clampStr(settings.contactNumber ?? '', 80),
    email: clampStr(settings.email ?? '', 254),
    website: clampStr(settings.website ?? '', 254),
    academicSession: clampStr(settings.academicSession || '2025-26', 40),
    logoUrl: clampStr(settings.logoUrl ?? '', 260000),
    principalSignatureUrl: clampStr(settings.principalSignatureUrl ?? '', 260000),
    principalName: clampStr(settings.principalName ?? '', 120),
    defaultTemplateId: clampStr(settings.defaultTemplateId || 'portrait_red_magenta_curved', 64),
    defaultOrientation: settings.defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
    cardDimensions: {
      widthMm: Number(settings.cardDimensions?.widthMm) || 53.98,
      heightMm: Number(settings.cardDimensions?.heightMm) || 85.6,
    },
    visibleFields: safeVisibleFields,
    isDemoMode: Boolean(isDemoMode),
  };

  if (safeCustomBrand) {
    payload.customBrandColors = safeCustomBrand;
  }
  if (settings.defaultCustomization) {
    payload.defaultCustomization = stripUndefinedDeep(settings.defaultCustomization);
  }
  return payload;
}

function buildSanitizedStudentFields(uid: string, student: Student) {
  const safeId = sanitizeDocId(student.id, 'std');
  const payload: Record<string, unknown> = {
    id: safeId,
    ownerId: uid,
    name: clampStr(student.name || 'Unnamed Student', 140) || 'Unnamed Student',
    fatherName: clampStr(student.fatherName ?? '', 140),
    motherName: clampStr(student.motherName ?? '', 140),
    contactNumber: clampStr(student.contactNumber ?? '', 40),
    dob: clampStr(student.dob ?? '', 32),
    address: clampStr(student.address ?? '', 320),
    conveyance: student.conveyance === 'Yes' ? 'Yes' : 'No',
    session: clampStr(student.session ?? '2025-26', 40),
    clientCreatedAt: clampStr(student.createdAt || new Date().toISOString(), 64),
  };

  if (student.rollNo !== undefined) payload.rollNo = clampStr(student.rollNo, 40);
  if (student.classGrade !== undefined) payload.classGrade = clampStr(student.classGrade, 60);
  if (student.bloodGroup !== undefined) payload.bloodGroup = clampStr(student.bloodGroup, 16);
  if (student.photoUrl !== undefined) payload.photoUrl = clampStr(student.photoUrl, 260000);
  if (student.photoCrop) {
    payload.photoCrop = {
      zoom: Number.isFinite(student.photoCrop.zoom) ? student.photoCrop.zoom : 1,
      x: Number.isFinite(student.photoCrop.x) ? student.photoCrop.x : 0,
      y: Number.isFinite(student.photoCrop.y) ? student.photoCrop.y : 0,
    };
  }
  if (student.idCardNumber !== undefined) payload.idCardNumber = clampStr(student.idCardNumber, 64);
  if (student.emergencyContact !== undefined) payload.emergencyContact = clampStr(student.emergencyContact, 40);
  if (student.isCardGenerated !== undefined) payload.isCardGenerated = Boolean(student.isCardGenerated);
  if (student.generatedDate !== undefined) payload.generatedDate = clampStr(student.generatedDate, 32);

  return { safeId, payload };
}

function hydrateSettingsFromDoc(data: Record<string, unknown>): {
  settings: SchoolSettings;
  isDemoMode: boolean;
} {
  const rawVisible = (data.visibleFields as Partial<SchoolSettings['visibleFields']>) || {};
  const settings: SchoolSettings = {
    ...DEFAULT_SCHOOL_SETTINGS,
    schoolName: (data.schoolName as string) || DEFAULT_SCHOOL_SETTINGS.schoolName,
    tagline: (data.tagline as string) ?? DEFAULT_SCHOOL_SETTINGS.tagline,
    schoolCode: (data.schoolCode as string) ?? DEFAULT_SCHOOL_SETTINGS.schoolCode,
    address: (data.address as string) ?? DEFAULT_SCHOOL_SETTINGS.address,
    contactNumber: (data.contactNumber as string) ?? DEFAULT_SCHOOL_SETTINGS.contactNumber,
    email: (data.email as string) ?? DEFAULT_SCHOOL_SETTINGS.email,
    website: (data.website as string) ?? DEFAULT_SCHOOL_SETTINGS.website,
    academicSession: (data.academicSession as string) || DEFAULT_SCHOOL_SETTINGS.academicSession,
    logoUrl: (data.logoUrl as string) ?? '',
    principalSignatureUrl: (data.principalSignatureUrl as string) ?? '',
    principalName: (data.principalName as string) ?? DEFAULT_SCHOOL_SETTINGS.principalName,
    defaultTemplateId:
      (data.defaultTemplateId as SchoolSettings['defaultTemplateId']) ||
      DEFAULT_SCHOOL_SETTINGS.defaultTemplateId,
    defaultOrientation:
      data.defaultOrientation === 'landscape' ? 'landscape' : 'portrait',
    defaultCustomization: data.defaultCustomization as SchoolSettings['defaultCustomization'],
    cardDimensions:
      (data.cardDimensions as SchoolSettings['cardDimensions']) ||
      DEFAULT_SCHOOL_SETTINGS.cardDimensions,
    customBrandColors:
      (data.customBrandColors as SchoolSettings['customBrandColors']) ||
      DEFAULT_SCHOOL_SETTINGS.customBrandColors,
    visibleFields: {
      ...DEFAULT_SCHOOL_SETTINGS.visibleFields,
      ...rawVisible,
    },
  };
  return { settings, isDemoMode: Boolean(data.isDemoMode) };
}

function hydrateStudentFromDoc(data: Record<string, unknown>): Student {
  return {
    id: String(data.id || ''),
    name: String(data.name || ''),
    fatherName: String(data.fatherName || ''),
    motherName: String(data.motherName || ''),
    contactNumber: String(data.contactNumber || ''),
    dob: String(data.dob || ''),
    address: String(data.address || ''),
    conveyance: data.conveyance === 'Yes' ? 'Yes' : 'No',
    session: String(data.session || ''),
    rollNo: data.rollNo !== undefined ? String(data.rollNo) : undefined,
    classGrade: data.classGrade !== undefined ? String(data.classGrade) : undefined,
    bloodGroup: data.bloodGroup !== undefined ? String(data.bloodGroup) : undefined,
    photoUrl: data.photoUrl !== undefined ? String(data.photoUrl) : undefined,
    photoCrop: data.photoCrop as Student['photoCrop'],
    idCardNumber: data.idCardNumber !== undefined ? String(data.idCardNumber) : undefined,
    emergencyContact: data.emergencyContact !== undefined ? String(data.emergencyContact) : undefined,
    isCardGenerated: typeof data.isCardGenerated === 'boolean' ? data.isCardGenerated : undefined,
    generatedDate:
      data.generatedDate && String(data.generatedDate).trim() !== ''
        ? String(data.generatedDate)
        : undefined,
    createdAt: String(data.clientCreatedAt || new Date().toISOString()),
  };
}

function hydrateTemplateFromDoc(data: Record<string, unknown>): SavedCustomTemplate {
  return {
    id: String(data.id || ''),
    name: String(data.name || 'Untitled Template'),
    baseTemplateId: String(data.baseTemplateId || 'portrait_red_magenta_curved') as SavedCustomTemplate['baseTemplateId'],
    orientation: data.orientation === 'landscape' ? 'landscape' : 'portrait',
    createdAt: String(data.clientCreatedAt || new Date().toISOString()),
    updatedAt: String(data.clientUpdatedAt || new Date().toISOString()),
    customization: (data.customization || {}) as CardCustomization,
  };
}

function hydrateExportFromDoc(data: Record<string, unknown>): ExportHistoryRecord {
  return {
    id: String(data.id || ''),
    timestamp: String(data.timestamp || new Date().toISOString()),
    format: (data.format as ExportHistoryRecord['format']) || 'PNG',
    fileName: String(data.fileName || 'export'),
    cardCount: Number(data.cardCount) || 0,
    templateName: String(data.templateName || ''),
    orientation: data.orientation === 'landscape' ? 'landscape' : 'portrait',
  };
}

/**
 * Ensures the authenticated user's root profile and initial isolated workspace exist in Firestore.
 * Existing users only refresh profile metadata and preserve all existing school/student cloud data.
 */
export async function ensureUserWorkspace(user: User): Promise<void> {
  const uid = user.uid;
  const userPath = `users/${uid}`;
  const settingsPath = `users/${uid}/settings/school`;

  try {
    const userRef = doc(db, 'users', uid);
    const settingsRef = doc(db, 'users', uid, 'settings', 'school');
    const [userSnap, settingsSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(settingsRef),
    ]);

    const profilePayload = {
      uid,
      email: clampStr(user.email || '', 254),
      displayName: clampStr(user.displayName || user.email?.split('@')[0] || 'Administrator', 120),
      ...(user.photoURL ? { photoURL: clampStr(user.photoURL, 1024) } : {}),
    };

    if (!userSnap.exists()) {
      const batch = writeBatch(db);
      batch.set(userRef, {
        ...profilePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (!settingsSnap.exists()) {
        const cleanLogo = await compressImageForFirestore(DEFAULT_SCHOOL_SETTINGS.logoUrl, { maxDim: 320, preserveAlpha: true });
        const cleanSig = await compressImageForFirestore(DEFAULT_SCHOOL_SETTINGS.principalSignatureUrl, { maxDim: 360, preserveAlpha: true });
        const seedSettings = buildSanitizedSettingsFields(
          uid,
          {
            ...DEFAULT_SCHOOL_SETTINGS,
            logoUrl: cleanLogo,
            principalSignatureUrl: cleanSig,
          },
          true
        );
        batch.set(settingsRef, {
          ...seedSettings,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const demo of DEMO_STUDENTS) {
          const cleanPhoto = demo.photoUrl
            ? await compressImageForFirestore(demo.photoUrl, { maxDim: 380, preserveAlpha: false })
            : undefined;
          const { safeId, payload } = buildSanitizedStudentFields(uid, {
            ...demo,
            photoUrl: cleanPhoto,
          });
          const studentRef = doc(db, 'users', uid, 'students', safeId);
          batch.set(studentRef, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
    } else {
      await updateDoc(userRef, {
        email: profilePayload.email,
        displayName: profilePayload.displayName,
        ...(profilePayload.photoURL ? { photoURL: profilePayload.photoURL } : {}),
        updatedAt: serverTimestamp(),
      });

      if (!settingsSnap.exists()) {
        const cleanLogo = await compressImageForFirestore(DEFAULT_SCHOOL_SETTINGS.logoUrl, { maxDim: 320, preserveAlpha: true });
        const cleanSig = await compressImageForFirestore(DEFAULT_SCHOOL_SETTINGS.principalSignatureUrl, { maxDim: 360, preserveAlpha: true });
        const seedSettings = buildSanitizedSettingsFields(
          uid,
          {
            ...DEFAULT_SCHOOL_SETTINGS,
            logoUrl: cleanLogo,
            principalSignatureUrl: cleanSig,
          },
          true
        );
        await setDoc(settingsRef, {
          ...seedSettings,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${userPath} / ${settingsPath}`);
  }
}

export interface WorkspaceCallbacks {
  onSettings: (settings: SchoolSettings, isDemoMode: boolean) => void;
  onStudents: (students: Student[]) => void;
  onTemplates: (templates: SavedCustomTemplate[]) => void;
  onExportHistory: (history: ExportHistoryRecord[]) => void;
}

/**
 * Attaches real-time Firestore listeners scoped strictly to the signed-in user's UID.
 */
export function subscribeUserWorkspace(uid: string, callbacks: WorkspaceCallbacks): () => void {
  const settingsQ = query(
    collection(db, 'users', uid, 'settings'),
    where('ownerId', '==', uid)
  );
  const studentsQ = query(
    collection(db, 'users', uid, 'students'),
    where('ownerId', '==', uid)
  );
  const templatesQ = query(
    collection(db, 'users', uid, 'customTemplates'),
    where('ownerId', '==', uid)
  );
  const historyQ = query(
    collection(db, 'users', uid, 'exportHistory'),
    where('ownerId', '==', uid)
  );

  const unsubSettings = onSnapshot(
    settingsQ,
    (snap) => {
      const schoolDoc = snap.docs.find((d) => d.id === 'school') || snap.docs[0];
      if (schoolDoc) {
        const { settings, isDemoMode } = hydrateSettingsFromDoc(schoolDoc.data());
        callbacks.onSettings(settings, isDemoMode);
      }
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/settings`)
  );

  const unsubStudents = onSnapshot(
    studentsQ,
    (snap) => {
      const list = snap.docs
        .map((d) => hydrateStudentFromDoc(d.data()))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      callbacks.onStudents(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/students`)
  );

  const unsubTemplates = onSnapshot(
    templatesQ,
    (snap) => {
      const list = snap.docs
        .map((d) => hydrateTemplateFromDoc(d.data()))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      callbacks.onTemplates(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/customTemplates`)
  );

  const unsubHistory = onSnapshot(
    historyQ,
    (snap) => {
      const list = snap.docs
        .map((d) => hydrateExportFromDoc(d.data()))
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
      callbacks.onExportHistory(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, `users/${uid}/exportHistory`)
  );

  return () => {
    unsubSettings();
    unsubStudents();
    unsubTemplates();
    unsubHistory();
  };
}

export async function saveUserSettingsCloud(
  uid: string,
  settings: SchoolSettings,
  isDemoMode: boolean
): Promise<void> {
  const path = `users/${uid}/settings/school`;
  try {
    const cleanLogo = await compressImageForFirestore(settings.logoUrl, {
      maxDim: 340,
      preserveAlpha: true,
    });
    const cleanSig = await compressImageForFirestore(settings.principalSignatureUrl, {
      maxDim: 380,
      preserveAlpha: true,
    });
    const fields = buildSanitizedSettingsFields(
      uid,
      {
        ...settings,
        logoUrl: cleanLogo,
        principalSignatureUrl: cleanSig,
      },
      isDemoMode
    );

    const ref = doc(db, 'users', uid, 'settings', 'school');
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const { ownerId: _o, ...updateFields } = fields;
      await updateDoc(ref, {
        ...updateFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateDemoModeCloud(uid: string, isDemoMode: boolean): Promise<void> {
  const path = `users/${uid}/settings/school`;
  try {
    const ref = doc(db, 'users', uid, 'settings', 'school');
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        isDemoMode: Boolean(isDemoMode),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertStudentCloud(uid: string, student: Student): Promise<void> {
  const cleanPhoto = student.photoUrl
    ? await compressImageForFirestore(student.photoUrl, { maxDim: 420, preserveAlpha: false })
    : undefined;
  const { safeId, payload } = buildSanitizedStudentFields(uid, {
    ...student,
    photoUrl: cleanPhoto,
  });
  const path = `users/${uid}/students/${safeId}`;
  try {
    const ref = doc(db, 'users', uid, 'students', safeId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      const { id: _i, ownerId: _o, clientCreatedAt: _c, ...updateFields } = payload;
      await updateDoc(ref, {
        ...updateFields,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudentCloud(uid: string, studentId: string): Promise<void> {
  const safeId = sanitizeDocId(studentId, 'std');
  const path = `users/${uid}/students/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'students', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteStudentsBatchCloud(uid: string, studentIds: string[]): Promise<void> {
  const path = `users/${uid}/students`;
  try {
    const chunkSize = 400;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const rawId of studentIds.slice(i, i + chunkSize)) {
        const safeId = sanitizeDocId(rawId, 'std');
        batch.delete(doc(db, 'users', uid, 'students', safeId));
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function toggleStudentCardStatusCloud(
  uid: string,
  studentId: string,
  isCardGenerated: boolean,
  generatedDate?: string
): Promise<void> {
  const safeId = sanitizeDocId(studentId, 'std');
  const path = `users/${uid}/students/${safeId}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'students', safeId), {
      isCardGenerated: Boolean(isCardGenerated),
      generatedDate: generatedDate ? clampStr(generatedDate, 32) : '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function bulkMarkGeneratedCloud(
  uid: string,
  studentIds: string[],
  generatedDate: string
): Promise<void> {
  const path = `users/${uid}/students`;
  try {
    const chunkSize = 400;
    for (let i = 0; i < studentIds.length; i += chunkSize) {
      const batch = writeBatch(db);
      for (const rawId of studentIds.slice(i, i + chunkSize)) {
        const safeId = sanitizeDocId(rawId, 'std');
        batch.update(doc(db, 'users', uid, 'students', safeId), {
          isCardGenerated: true,
          generatedDate: clampStr(generatedDate, 32),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function syncStudentsBulkCloud(
  uid: string,
  nextStudents: Student[],
  mode: 'append' | 'replace',
  existingIdsToDelete: string[] = []
): Promise<void> {
  const path = `users/${uid}/students`;
  try {
    if (mode === 'replace' && existingIdsToDelete.length > 0) {
      await deleteStudentsBatchCloud(uid, existingIdsToDelete);
    }

    const prepared = await Promise.all(
      nextStudents.map(async (student) => {
        const cleanPhoto = student.photoUrl
          ? await compressImageForFirestore(student.photoUrl, { maxDim: 420, preserveAlpha: false })
          : undefined;
        return buildSanitizedStudentFields(uid, {
          ...student,
          photoUrl: cleanPhoto,
        });
      })
    );

    const chunkSize = 350;
    for (let i = 0; i < prepared.length; i += chunkSize) {
      const batch = writeBatch(db);
      const slice = prepared.slice(i, i + chunkSize);
      for (const { safeId, payload } of slice) {
        const ref = doc(db, 'users', uid, 'students', safeId);
        if (mode === 'replace') {
          batch.set(ref, {
            ...payload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          // Check whether student doc exists so update vs create respects immutable createdAt
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const { id: _i, ownerId: _o, clientCreatedAt: _c, ...updateFields } = payload;
            batch.update(ref, {
              ...updateFields,
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.set(ref, {
              ...payload,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        }
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCustomTemplateCloud(
  uid: string,
  template: SavedCustomTemplate
): Promise<void> {
  const safeId = sanitizeDocId(template.id, 'tpl');
  const path = `users/${uid}/customTemplates/${safeId}`;
  try {
    const ref = doc(db, 'users', uid, 'customTemplates', safeId);
    const existing = await getDoc(ref);
    const cleanCustomization = stripUndefinedDeep(template.customization || {});

    if (existing.exists()) {
      await updateDoc(ref, {
        name: clampStr(template.name, 120),
        baseTemplateId: clampStr(template.baseTemplateId, 64),
        orientation: template.orientation === 'landscape' ? 'landscape' : 'portrait',
        clientUpdatedAt: clampStr(template.updatedAt || new Date().toISOString(), 64),
        customization: cleanCustomization,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        id: safeId,
        ownerId: uid,
        name: clampStr(template.name, 120),
        baseTemplateId: clampStr(template.baseTemplateId, 64),
        orientation: template.orientation === 'landscape' ? 'landscape' : 'portrait',
        clientCreatedAt: clampStr(template.createdAt || new Date().toISOString(), 64),
        clientUpdatedAt: clampStr(template.updatedAt || new Date().toISOString(), 64),
        customization: cleanCustomization,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomTemplateCloud(uid: string, templateId: string): Promise<void> {
  const safeId = sanitizeDocId(templateId, 'tpl');
  const path = `users/${uid}/customTemplates/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'customTemplates', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function appendExportHistoryCloud(
  uid: string,
  entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>
): Promise<void> {
  const safeId = sanitizeDocId(`exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'exp');
  const path = `users/${uid}/exportHistory/${safeId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'exportHistory', safeId), {
      id: safeId,
      ownerId: uid,
      timestamp: new Date().toISOString(),
      format: entry.format,
      fileName: clampStr(entry.fileName || 'export', 180),
      cardCount: Math.max(0, Math.round(Number(entry.cardCount) || 0)),
      templateName: clampStr(entry.templateName || '', 120),
      orientation: entry.orientation === 'landscape' ? 'landscape' : 'portrait',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearExportHistoryCloud(uid: string): Promise<void> {
  const path = `users/${uid}/exportHistory`;
  try {
    const q = query(collection(db, 'users', uid, 'exportHistory'), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
