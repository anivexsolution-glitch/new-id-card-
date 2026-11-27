import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Load Firebase projectId from public config for ID token audience/issuer verification
interface FirebaseAppletConfig {
  projectId?: string;
}
let firebaseProjectId = '';
try {
  const rawConfig = fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8');
  const parsedConfig = JSON.parse(rawConfig) as FirebaseAppletConfig;
  firebaseProjectId = String(parsedConfig.projectId || '').trim();
} catch {
  firebaseProjectId = '';
}

// Cache Google public x509 certificates for Firebase Auth ID token verification
let cachedCerts: Record<string, string> = {};
let certsExpiryMs = 0;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (now < certsExpiryMs && Object.keys(cachedCerts).length > 0) {
    return cachedCerts;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Unable to fetch Firebase authentication public certificates.');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiryMs = now + maxAgeSec * 1000;
  return cachedCerts;
}

function decodeBase64UrlJson<T>(segment: string): T {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as T;
}

interface VerifiedFirebaseClaims {
  uid: string;
  email?: string;
}

async function verifyFirebaseBearerToken(authHeader?: string): Promise<VerifiedFirebaseClaims | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const header = decodeBase64UrlJson<{ alg?: string; kid?: string }>(parts[0]);
    const payload = decodeBase64UrlJson<{
      aud?: string;
      iss?: string;
      sub?: string;
      exp?: number;
      iat?: number;
      email?: string;
    }>(parts[1]);

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (!firebaseProjectId || payload.aud !== firebaseProjectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${firebaseProjectId}`) return null;
    if (!payload.sub || typeof payload.sub !== 'string') return null;

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= nowSec) return null;
    if (payload.iat && payload.iat > nowSec + 300) return null;

    const certs = await getFirebasePublicCerts();
    const certPem = certs[header.kid];
    if (!certPem) return null;

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    verifier.end();

    const sigNormalized = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    const sigBuf = Buffer.from(
      sigNormalized + '='.repeat((4 - (sigNormalized.length % 4)) % 4),
      'base64'
    );
    const isValid = verifier.verify(certPem, sigBuf);
    if (!isValid) return null;

    return { uid: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

const VALID_PORTRAIT_TEMPLATES = [
  'portrait_red_magenta_curved',
  'portrait_navy_gold_premium',
  'portrait_charcoal_orange_geom',
  'portrait_royal_blue_inst',
  'portrait_tricolour_accent',
  'portrait_emerald_green',
  'portrait_burgundy_ivory',
  'portrait_white_minimal',
  'portrait_red_white_modern',
  'portrait_dark_premium_geom',
  'portrait_blue_diagonal',
  'portrait_school_crest',
  'portrait_colorful_primary',
  'portrait_black_gold',
  'portrait_modern_curved',
] as const;

const VALID_LANDSCAPE_TEMPLATES = [
  'landscape_red_curved_school',
  'landscape_navy_gold_inst',
  'landscape_charcoal_orange',
  'landscape_blue_split',
  'landscape_tricolour_horiz',
  'landscape_green_cream',
  'landscape_burgundy_premium',
  'landscape_minimal_white_grid',
  'landscape_royal_blue_geom',
  'landscape_dark_charcoal',
  'landscape_red_diagonal',
  'landscape_classic_border',
  'landscape_photo_panel',
  'landscape_crest_header',
  'landscape_modern_asymmetric',
] as const;

const ALL_VALID_TEMPLATES = new Set<string>([
  ...VALID_PORTRAIT_TEMPLATES,
  ...VALID_LANDSCAPE_TEMPLATES,
]);

const VALID_FONT_IDS = new Set([
  'plus_jakarta',
  'montserrat',
  'poppins',
  'inter',
  'roboto_condensed',
  'nunito_sans',
  'outfit',
  'playfair',
  'cinzel',
  'arial',
]);

const VALID_LOGO_SHAPES = new Set(['circle', 'rounded', 'square', 'none']);
const VALID_BADGE_STYLES = new Set(['gold-ring', 'white', 'tinted', 'minimal']);
const ALLOWED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function normalizeHex(raw: unknown, fallback: string): string {
  const str = String(raw || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(str)) {
    return str.toLowerCase();
  }
  return fallback;
}

const TEMPLATE_CATALOG_GUIDE = `
Available Portrait Templates (53.98 x 85.60 mm):
- portrait_red_magenta_curved: Curved Academic flowing masthead with circular photo & ribbon badges
- portrait_navy_gold_premium: Heritage aristocrat layout with chevron pinstripes & gold trim
- portrait_charcoal_orange_geom: Geometric Modern dark slate header with bold angled shapes
- portrait_royal_blue_inst: Institutional Indian convent style with multi-tier crest curves
- portrait_tricolour_accent: Institutional sweeping top/bottom bands with crisp emblem framing
- portrait_emerald_green: Heritage convent layout with sweeping header curves & framed badge
- portrait_burgundy_ivory: Heritage archival arched header bands with warm parchment tone
- portrait_white_minimal: Minimal pure-white executive card with crisp accent rail
- portrait_red_white_modern: Geometric Modern dynamic diagonal angle header
- portrait_dark_premium_geom: Geometric Modern obsidian masthead with sharp edge accents
- portrait_blue_diagonal: Curved Academic dual-tone diagonal swoop header
- portrait_school_crest: Heritage traditional academic double border & centered crest
- portrait_colorful_primary: Curved Academic vibrant friendly curves & rounded photo badge
- portrait_black_gold: Heritage presidential solid dark band & metallic accent borders
- portrait_modern_curved: Curved Academic undulating organic wave composition

Available Landscape Templates (85.60 x 53.98 mm):
- landscape_red_curved_school: Curved Academic flowing horizontal curves & dual-column dossier
- landscape_navy_gold_inst: Institutional left identity pillar with divider & framed portrait
- landscape_charcoal_orange: Geometric Modern diagonal cutouts with clean horizontal dossier
- landscape_blue_split: Institutional dual-tone split header with curved ribbon
- landscape_tricolour_horiz: Institutional horizontal wave top & bottom band composition
- landscape_green_cream: Heritage left pillar with trim & crisp student dossier body
- landscape_burgundy_premium: Heritage double-rail ornate academic border
- landscape_minimal_white_grid: Minimal executive white grid with razor-sharp accent rail
- landscape_royal_blue_geom: Geometric Modern dynamic angled header & footer band
- landscape_dark_charcoal: Geometric Modern dark left rail beside bright white student grid
- landscape_red_diagonal: Geometric Modern bold diagonal header band
- landscape_classic_border: Heritage traditional double-pinstripe academic frame
- landscape_photo_panel: Curved Academic photo-centric left wing with wave panel
- landscape_crest_header: Heritage centered collegiate crest header band
- landscape_modern_asymmetric: Curved Academic undulating waves with balanced landscape layout

Available Font IDs:
- plus_jakarta (crisp studio sans), montserrat (authoritative display), poppins (geometric friendly),
- inter (ultra legible), roboto_condensed (compact dense), nunito_sans (primary/junior friendly),
- outfit (modern sharp tech), playfair (classic heritage serif), cinzel (royal crest serif), arial (universal)
`.trim();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  app.post('/api/smart-template', async (req: Request, res: Response) => {
    try {
      const claims = await verifyFirebaseBearerToken(req.headers.authorization);
      if (!claims) {
        res.status(401).json({
          error: 'Authentication required. Please sign in to generate smart templates.',
        });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || !apiKey.trim()) {
        res.status(503).json({
          error:
            'Gemini API key is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      const body = (req.body || {}) as Record<string, unknown>;
      const logoBase64 = typeof body.logoBase64 === 'string' ? body.logoBase64.trim() : '';
      const logoMimeType =
        typeof body.logoMimeType === 'string' ? body.logoMimeType.trim().toLowerCase() : 'image/png';
      const schoolName = String(body.schoolName || 'School Institution')
        .trim()
        .slice(0, 180);
      const tagline = String(body.tagline || '')
        .trim()
        .slice(0, 200);
      const orientationPreference =
        body.orientationPreference === 'portrait' || body.orientationPreference === 'landscape'
          ? body.orientationPreference
          : 'all';
      const stylePreference = String(body.stylePreference || 'auto')
        .trim()
        .slice(0, 40);

      if (!logoBase64 || !ALLOWED_IMAGE_MIMES.has(logoMimeType)) {
        res.status(400).json({
          error: 'A valid PNG, JPEG, or WebP school logo is required for color analysis.',
        });
        return;
      }

      if (!/^[A-Za-z0-9+/=]+$/.test(logoBase64) || logoBase64.length > 2_800_000) {
        res.status(400).json({
          error: 'Uploaded school logo exceeds size limits or is malformed.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const orientationDirective =
        orientationPreference === 'portrait'
          ? 'All 3 suggestions MUST use portrait_* template IDs and orientation "portrait".'
          : orientationPreference === 'landscape'
          ? 'All 3 suggestions MUST use landscape_* template IDs and orientation "landscape".'
          : 'Provide a balanced mix across both portrait and landscape (e.g., 2 portrait and 1 landscape, or 1 portrait and 2 landscape) showcasing complementary compositions.';

      const styleDirective =
        stylePreference !== 'auto'
          ? `Prioritize "${stylePreference}" templates when matching the crest aesthetic.`
          : 'Choose varied layout archetypes (e.g. Heritage, Institutional, Curved Academic, Geometric Modern, Minimal) that harmonize with the crest design.';

      const promptText = [
        `Inspect the attached school crest/logo for "${schoolName}"${tagline ? ` (tagline: "${tagline}")` : ''}.`,
        'Step 1: Identify the exact dominant brand color, secondary supporting color, and accent highlight color directly from the logo artwork (ignore pure white canvas background). Ensure primaryColor has strong visual weight and high contrast with white text (>= 4.5:1 where headers are dark, or crisp dark-on-light contrast where appropriate).',
        `Step 2: Suggest exactly 3 distinct, production-ready ID card layouts from the catalog below. ${orientationDirective} ${styleDirective}`,
        'For each suggestion, pair the most fitting templateId, harmonious primary/secondary/accent/surface hex palette derived from the logo, ideal headingFontId + bodyFontId pairing, logoShape, logoBadgeStyle, and photoRadius.',
        'Do not pick 3 identical templates—give the school administrator 3 genuinely distinct professional directions.',
        '',
        TEMPLATE_CATALOG_GUIDE,
      ].join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: logoMimeType,
                data: logoBase64,
              },
            },
            { text: promptText },
          ],
        },
        config: {
          systemInstruction:
            'You are a senior institutional print & brand designer specializing in CR80 school identity cards. Analyze the school crest image colors carefully and output crisp, high-contrast, print-ready layout specifications strictly matching the JSON schema.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extractedPalette: {
                type: Type.OBJECT,
                properties: {
                  dominantHex: { type: Type.STRING, description: '6-digit hex e.g. #1e3a8a' },
                  secondaryHex: { type: Type.STRING, description: '6-digit hex e.g. #0f172a' },
                  accentHex: { type: Type.STRING, description: '6-digit hex e.g. #d97706' },
                  colorMood: {
                    type: Type.STRING,
                    description: 'Concise 3-5 word palette summary',
                  },
                },
                required: ['dominantHex', 'secondaryHex', 'accentHex', 'colorMood'],
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    rationale: { type: Type.STRING },
                    templateId: { type: Type.STRING },
                    orientation: { type: Type.STRING },
                    primaryColor: { type: Type.STRING },
                    secondaryColor: { type: Type.STRING },
                    accentColor: { type: Type.STRING },
                    surfaceColor: { type: Type.STRING },
                    headingFontId: { type: Type.STRING },
                    bodyFontId: { type: Type.STRING },
                    logoShape: { type: Type.STRING },
                    logoBadgeStyle: { type: Type.STRING },
                    photoRadius: { type: Type.INTEGER },
                  },
                  required: [
                    'title',
                    'rationale',
                    'templateId',
                    'orientation',
                    'primaryColor',
                    'secondaryColor',
                    'accentColor',
                    'surfaceColor',
                    'headingFontId',
                    'bodyFontId',
                    'logoShape',
                    'logoBadgeStyle',
                    'photoRadius',
                  ],
                },
              },
            },
            required: ['extractedPalette', 'suggestions'],
          },
        },
      });

      const rawJson = (response.text || '').trim();
      if (!rawJson) {
        res.status(502).json({
          error: 'The AI model returned an empty response. Please try again.',
        });
        return;
      }

      const parsed = JSON.parse(rawJson) as {
        extractedPalette?: {
          dominantHex?: string;
          secondaryHex?: string;
          accentHex?: string;
          colorMood?: string;
        };
        suggestions?: Array<Record<string, unknown>>;
      };

      const dominantHex = normalizeHex(parsed.extractedPalette?.dominantHex, '#24364b');
      const secondaryHex = normalizeHex(parsed.extractedPalette?.secondaryHex, '#182433');
      const accentHex = normalizeHex(parsed.extractedPalette?.accentHex, '#a77c50');
      const colorMood = String(
        parsed.extractedPalette?.colorMood || 'Institutional Crest Harmony'
      ).slice(0, 80);

      const fallbackTemplates =
        orientationPreference === 'landscape'
          ? ['landscape_navy_gold_inst', 'landscape_red_curved_school', 'landscape_minimal_white_grid']
          : orientationPreference === 'portrait'
          ? ['portrait_school_crest', 'portrait_navy_gold_premium', 'portrait_white_minimal']
          : ['portrait_school_crest', 'landscape_navy_gold_inst', 'portrait_white_minimal'];

      const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];
      const suggestions = rawSuggestions.map((item, idx) => {
        const rawTpl = String(item.templateId || '').trim();
        let templateId = ALL_VALID_TEMPLATES.has(rawTpl) ? rawTpl : fallbackTemplates[idx];
        if (orientationPreference === 'portrait' && !templateId.startsWith('portrait_')) {
          templateId = fallbackTemplates[idx];
        } else if (orientationPreference === 'landscape' && !templateId.startsWith('landscape_')) {
          templateId = fallbackTemplates[idx];
        }
        const orientation = templateId.startsWith('portrait_') ? 'portrait' : 'landscape';

        const headingFontId = VALID_FONT_IDS.has(String(item.headingFontId))
          ? String(item.headingFontId)
          : 'montserrat';
        const bodyFontId = VALID_FONT_IDS.has(String(item.bodyFontId))
          ? String(item.bodyFontId)
          : 'plus_jakarta';
        const logoShape = VALID_LOGO_SHAPES.has(String(item.logoShape))
          ? (String(item.logoShape) as 'circle' | 'rounded' | 'square' | 'none')
          : 'circle';
        const logoBadgeStyle = VALID_BADGE_STYLES.has(String(item.logoBadgeStyle))
          ? (String(item.logoBadgeStyle) as 'gold-ring' | 'white' | 'tinted' | 'minimal')
          : 'white';
        const numericRadius = Number(item.photoRadius);
        const photoRadius = Number.isFinite(numericRadius)
          ? Math.max(0, Math.min(90, Math.round(numericRadius)))
          : 12;

        return {
          id: `smart_${idx + 1}`,
          title: String(item.title || `Smart Layout ${idx + 1}`).slice(0, 80),
          rationale: String(
            item.rationale ||
              'Balanced layout pairing extracted school crest colors with crisp institutional typography.'
          ).slice(0, 260),
          templateId,
          orientation,
          primaryColor: normalizeHex(item.primaryColor, dominantHex),
          secondaryColor: normalizeHex(item.secondaryColor, secondaryHex),
          accentColor: normalizeHex(item.accentColor, accentHex),
          surfaceColor: normalizeHex(item.surfaceColor, '#ffffff'),
          headingFontId,
          bodyFontId,
          logoShape,
          logoBadgeStyle,
          photoRadius,
        };
      });

      if (suggestions.length === 0) {
        res.status(502).json({
          error: 'Could not construct valid template recommendations. Please retry.',
        });
        return;
      }

      res.json({
        extractedPalette: {
          dominantHex,
          secondaryHex,
          accentHex,
          colorMood,
        },
        suggestions,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Smart template generation failed.';
      console.error('Smart template API error:', message);
      if (message.includes('PERMISSION_DENIED') || message.includes('API_KEY_INVALID')) {
        res.status(403).json({
          error:
            'Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }
      if (message.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Gemini API rate limit or quota reached. Please wait a moment and try again.',
        });
        return;
      }
      res.status(500).json({
        error: `Smart Template service error: ${message}`,
      });
    }
  });

  if (IS_PROD) {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScholarCard server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
