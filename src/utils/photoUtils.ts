const INVALID_PHOTO_PLACEHOLDERS = new Set([
  'na',
  'n/a',
  'none',
  'null',
  'undefined',
  'no',
  'false',
  '0',
  '-',
  '--',
  '.',
  'pending',
  'missing',
  'not uploaded',
  'not available',
  'no photo',
]);

/**
 * Checks whether a student's photoUrl points to an actual uploaded/renderable image
 * (data URL, HTTP/HTTPS URL, or local asset path) rather than empty/placeholder text.
 */
export function hasValidStudentPhoto(photoUrl?: string | null): boolean {
  const raw = (photoUrl || '').trim();
  if (!raw) return false;

  const normalized = raw.toLowerCase();
  if (INVALID_PHOTO_PLACEHOLDERS.has(normalized)) return false;

  if (normalized.startsWith('data:image/')) {
    const commaIdx = raw.indexOf(',');
    return commaIdx !== -1 && raw.slice(commaIdx + 1).trim().length > 16;
  }

  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/') ||
    normalized.startsWith('./')
  );
}

/**
 * Returns the trimmed photo URL if valid, or undefined when missing/placeholder.
 */
export function sanitizeStudentPhotoUrl(photoUrl?: string | null): string | undefined {
  return hasValidStudentPhoto(photoUrl) ? (photoUrl || '').trim() : undefined;
}
