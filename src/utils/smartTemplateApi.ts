import { auth } from '../firebase';
import { CARD_FONT_OPTIONS } from '../constants/initialData';
import {
  CardCustomization,
  SmartTemplateResponse,
  SmartTemplateSuggestion,
} from '../types';

export interface LogoAnalysisPayload {
  base64: string;
  mimeType: 'image/png';
}

/**
 * Normalizes any uploaded or bundled school logo image (PNG/JPG/WebP/SVG)
 * into a clean 256x256 PNG base64 string on canvas for fast Gemini visual analysis.
 */
export async function prepareLogoBase64ForAnalysis(
  logoUrl: string
): Promise<LogoAnalysisPayload> {
  const cleanUrl = (logoUrl || '').trim();
  if (!cleanUrl) {
    throw new Error('No school logo found. Please upload your school logo first.');
  }

  return new Promise<LogoAnalysisPayload>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not initialize image canvas for logo inspection.'));
          return;
        }
        ctx.clearRect(0, 0, size, size);

        const scale = Math.min(size / (img.width || size), size / (img.height || size));
        const drawW = Math.max(1, Math.round((img.width || size) * scale));
        const drawH = Math.max(1, Math.round((img.height || size) * scale));
        const offsetX = Math.round((size - drawW) / 2);
        const offsetY = Math.round((size - drawH) / 2);
        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        const pngDataUrl = canvas.toDataURL('image/png');
        const base64 = pngDataUrl.split(',')[1] || '';
        if (!base64) {
          reject(new Error('Failed to encode school logo for analysis.'));
          return;
        }
        resolve({ base64, mimeType: 'image/png' });
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('Unable to read pixel data from school logo.')
        );
      }
    };
    img.onerror = () => {
      reject(
        new Error(
          'Could not load the school logo image. Please re-upload a PNG, JPG, or WebP logo.'
        )
      );
    };
    img.src = cleanUrl;
  });
}

export interface RequestSmartTemplatesOptions {
  logoUrl: string;
  schoolName: string;
  tagline?: string;
  orientationPreference: 'all' | 'portrait' | 'landscape';
  stylePreference: string;
}

export async function requestSmartTemplates(
  options: RequestSmartTemplatesOptions
): Promise<SmartTemplateResponse> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in before generating Smart Templates.');
  }

  const [{ base64, mimeType }, idToken] = await Promise.all([
    prepareLogoBase64ForAnalysis(options.logoUrl),
    user.getIdToken(),
  ]);

  const response = await fetch('/api/smart-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      logoBase64: base64,
      logoMimeType: mimeType,
      schoolName: options.schoolName,
      tagline: options.tagline || '',
      orientationPreference: options.orientationPreference,
      stylePreference: options.stylePreference,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<SmartTemplateResponse> & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.error || `Smart Template request failed with status ${response.status}.`
    );
  }

  if (!payload.extractedPalette || !Array.isArray(payload.suggestions)) {
    throw new Error('Unexpected response format from Smart Template generator.');
  }

  return {
    extractedPalette: payload.extractedPalette,
    suggestions: payload.suggestions,
  };
}

export function resolveFontFamilyById(fontId?: string): string {
  const match = CARD_FONT_OPTIONS.find((f) => f.id === fontId);
  return match?.cssFamily || CARD_FONT_OPTIONS[0].cssFamily;
}

export function resolveFontLabelById(fontId?: string): string {
  const match = CARD_FONT_OPTIONS.find((f) => f.id === fontId);
  return match?.label.split('(')[0].trim() || 'Plus Jakarta Sans';
}

export function buildCustomizationFromSuggestion(
  suggestion: SmartTemplateSuggestion
): CardCustomization {
  return {
    templateId: suggestion.templateId,
    orientation: suggestion.orientation,
    side: 'front',
    headingFontFamily: resolveFontFamilyById(suggestion.headingFontId),
    fontFamily: resolveFontFamilyById(suggestion.bodyFontId),
    primaryColorOverride: suggestion.primaryColor,
    accentColorOverride: suggestion.accentColor,
    surfaceColorOverride: suggestion.surfaceColor,
    logoShape: suggestion.logoShape,
    logoBadgeStyle: suggestion.logoBadgeStyle,
    photoRadius: suggestion.photoRadius,
    watermarkEnabled: true,
    watermarkOpacity: 0.08,
  };
}
