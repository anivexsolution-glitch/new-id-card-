import QRCode from 'qrcode';
import { SchoolSettings, Student } from '../types';

// In-memory cache for generated QR code data URLs
export const qrCache = new Map<string, string>();

/**
 * Creates an opaque, compact verification token containing authentic student data.
 * This ensures cross-device verification works instantly on any smartphone scanner,
 * even when the phone has never visited the admin console before.
 */
export function createStudentVerificationToken(student: Student, schoolSettings: SchoolSettings): string {
  const payload = {
    id: student.id,
    icn: student.idCardNumber || student.id,
    nm: student.name,
    fn: student.fatherName,
    mn: student.motherName,
    ph: student.contactNumber,
    db: student.dob,
    ad: student.address,
    cv: student.conveyance,
    ss: student.session,
    cg: student.classGrade || '',
    rn: student.rollNo || '',
    bg: student.bloodGroup || '',
    sn: schoolSettings.schoolName,
    sc: schoolSettings.schoolCode || '',
    sa: schoolSettings.address || '',
    sp: schoolSettings.contactNumber || '',
    v: 1,
  };

  try {
    const jsonStr = JSON.stringify(payload);
    // Standard Base64 encode safe for UTF-8
    return btoa(encodeURIComponent(jsonStr));
  } catch {
    return student.id;
  }
}

/**
 * Decodes the verification token back into student verification record
 */
export function decodeStudentVerificationToken(token: string): {
  student: Partial<Student>;
  schoolName?: string;
  schoolAddress?: string;
  schoolContact?: string;
} | null {
  try {
    const jsonStr = decodeURIComponent(atob(token));
    const data = JSON.parse(jsonStr);
    return {
      student: {
        id: data.id,
        idCardNumber: data.icn,
        name: data.nm,
        fatherName: data.fn,
        motherName: data.mn,
        contactNumber: data.ph,
        dob: data.db,
        address: data.ad,
        conveyance: data.cv,
        session: data.ss,
        classGrade: data.cg,
        rollNo: data.rn,
        bloodGroup: data.bg,
      },
      schoolName: data.sn,
      schoolAddress: data.sa,
      schoolContact: data.sp,
    };
  } catch (err) {
    console.warn('Failed to decode verification token', err);
    return null;
  }
}

/**
 * Returns the public verification URL for a student.
 * Uses window.location.origin or environment URL so it is never hardcoded to localhost.
 */
export function getStudentVerificationUrl(student: Student, schoolSettings: SchoolSettings): string {
  const token = createStudentVerificationToken(student, schoolSettings);
  const identifier = student.idCardNumber || student.id;

  let origin = '';
  if (typeof window !== 'undefined' && window.location) {
    origin = window.location.origin + window.location.pathname;
  } else if (import.meta.env.VITE_APP_URL) {
    origin = import.meta.env.VITE_APP_URL;
  } else {
    origin = 'https://delhipublicacademy.edu.in';
  }

  // Ensure origin doesn't end with slash if adding query
  const cleanOrigin = origin.replace(/\/$/, '');
  return `${cleanOrigin}?verify=${encodeURIComponent(identifier)}&token=${encodeURIComponent(token)}`;
}

/**
 * Generates a high-contrast, clean 2D QR Code data URL with appropriate error correction.
 */
export async function generateStudentQRDataUrl(url: string): Promise<string> {
  if (qrCache.has(url)) {
    return qrCache.get(url)!;
  }

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 256,
      color: {
        dark: '#1e293b', // Deep slate for high-contrast crisp scanning
        light: '#ffffff',
      },
    });
    qrCache.set(url, dataUrl);
    return dataUrl;
  } catch (err) {
    console.error('Error generating QR code', err);
    return '';
  }
}
