export interface Student {
  id: string;
  name: string;
  fatherName: string;
  motherName: string;
  contactNumber: string;
  dob: string; // DD/MM/YYYY format
  address: string;
  conveyance: 'Yes' | 'No';
  session: string;
  rollNo?: string;
  classGrade?: string;
  bloodGroup?: string;
  photoUrl?: string;
  photoCrop?: {
    zoom: number; // 1 to 2.5
    x: number; // -50 to 50 %
    y: number; // -50 to 50 %
  };
  idCardNumber?: string;
  emergencyContact?: string;
  isCardGenerated?: boolean;
  generatedDate?: string;
  createdAt: string;
}

export interface SchoolSettings {
  schoolName: string;
  tagline: string;
  schoolCode: string;
  address: string;
  contactNumber: string;
  email: string;
  website: string;
  academicSession: string;
  logoUrl: string;
  principalSignatureUrl: string;
  principalName: string;
  defaultTemplateId: TemplateId;
  defaultOrientation: 'landscape' | 'portrait';
  defaultCustomization?: CardStyleCustomization;
  cardDimensions: {
    widthMm: number;
    heightMm: number;
  };
  customBrandColors?: {
    enabled: boolean;
    primary: string;
    secondary: string;
    accent: string;
  };
  adminUsername?: string;
  adminPassword?: string;
  visibleFields: {
    fatherName: boolean;
    motherName: boolean;
    contactNumber: boolean;
    dob: boolean;
    address: boolean;
    conveyance: boolean;
    session: boolean;
    rollNo: boolean;
    classGrade: boolean;
    bloodGroup: boolean;
    principalSignature: boolean;
    logo?: boolean;
    schoolAddress?: boolean;
    schoolContact?: boolean;
    barcode?: boolean;
  };
}

export type PrinterPreset =
  | 'a4_8_landscape'
  | 'a4_6_portrait'
  | 'a4_10_compact'
  | 'pvc_tray_5'
  | 'pvc_tray_2'
  | 'single_cr80';


// Exactly 15 Portrait + 15 Landscape = 30 Premium Templates
export type PortraitTemplateId =
  | 'portrait_red_magenta_curved' // 1. Red and Magenta Curved Academic (Ref 1)
  | 'portrait_navy_gold_premium'  // 2. Navy Blue and Gold Premium
  | 'portrait_charcoal_orange_geom' // 3. Charcoal and Orange Geometric (Ref 2)
  | 'portrait_royal_blue_inst'    // 4. Royal Blue Institutional
  | 'portrait_tricolour_accent'   // 5. Indian Tricolour Accent
  | 'portrait_emerald_green'      // 6. Emerald Green Academic
  | 'portrait_burgundy_ivory'     // 7. Burgundy and Ivory Classic
  | 'portrait_white_minimal'      // 8. White Minimal Professional
  | 'portrait_red_white_modern'   // 9. Red and White Modern School
  | 'portrait_dark_premium_geom'  // 10. Dark Premium Geometric
  | 'portrait_blue_diagonal'      // 11. Blue Diagonal Contemporary
  | 'portrait_school_crest'       // 12. Elegant School Crest
  | 'portrait_colorful_primary'   // 13. Colorful Primary School
  | 'portrait_black_gold'         // 14. Black and Gold Executive
  | 'portrait_modern_curved';     // 15. Modern Curved Editorial

export type LandscapeTemplateId =
  | 'landscape_red_curved_school' // 1. Red Curved Horizontal School Card (Ref 1 Horiz)
  | 'landscape_navy_gold_inst'    // 2. Navy and Gold Institutional
  | 'landscape_charcoal_orange'   // 3. Charcoal and Orange Designer (Ref 2 Horiz)
  | 'landscape_blue_split'        // 4. Modern Blue Split Layout
  | 'landscape_tricolour_horiz'   // 5. Tricolour Accent Horizontal
  | 'landscape_green_cream'       // 6. Green and Cream Academic
  | 'landscape_burgundy_premium'  // 7. Burgundy Premium Horizontal
  | 'landscape_minimal_white_grid' // 8. Minimal White Grid
  | 'landscape_royal_blue_geom'   // 9. Royal Blue Geometric
  | 'landscape_dark_charcoal'     // 10. Dark Charcoal Premium
  | 'landscape_red_diagonal'      // 11. Red Diagonal School Identity
  | 'landscape_classic_border'    // 12. Classic Academic Border
  | 'landscape_photo_panel'       // 13. Contemporary Photo Panel
  | 'landscape_crest_header'      // 14. Elegant Crest Header
  | 'landscape_modern_asymmetric'; // 15. Modern Asymmetric Editorial

export type TemplateId = PortraitTemplateId | LandscapeTemplateId;

export interface TemplateDefinition {
  id: TemplateId;
  name: string;
  category: 'Portrait' | 'Landscape';
  subCategory: 'Curved Academic' | 'Geometric Modern' | 'Heritage' | 'Institutional' | 'Minimal';
  orientation: 'portrait' | 'landscape';
  description: string;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
  isDarkTheme?: boolean;
}

export interface CardStyleCustomization {
  // Font families
  fontFamily?: string;
  headingFontFamily?: string;

  // Font sizes
  schoolNameFontSize?: number; // 20 - 45
  studentNameFontSize?: number; // 20 - 48
  fieldLabelFontSize?: number; // 10 - 18
  fieldValueFontSize?: number; // 12 - 24
  addressFontSize?: number; // 10 - 18

  // Element sizes & shapes
  logoSize?: number; // 35 - 110
  logoShape?: 'circle' | 'square' | 'rounded' | 'none';
  logoBadgeStyle?: 'white' | 'gold-ring' | 'tinted' | 'minimal';
  signatureWidth?: number; // 60 - 200
  signatureHeight?: number; // 30 - 90
  signatureTitle?: string; // "PRINCIPAL", "DIRECTOR", etc.
  photoWidth?: number; // 110 - 240
  photoHeight?: number; // 130 - 260
  photoRadius?: number; // 0 - 50

  // Watermark
  watermarkEnabled?: boolean;
  watermarkOpacity?: number; // 0.01 - 0.25
  watermarkSize?: number; // 120 - 450

  // Color overrides
  primaryColorOverride?: string;
  accentColorOverride?: string;
  surfaceColorOverride?: string;
  textColorOverride?: string;
  labelColorOverride?: string;

  // Custom Field Labels
  customLabels?: {
    fatherName?: string;
    motherName?: string;
    contactNumber?: string;
    dob?: string;
    conveyance?: string;
    address?: string;
    classGrade?: string;
    rollNo?: string;
    bloodGroup?: string;
    session?: string;
  };
}

export interface CardCustomization extends CardStyleCustomization {
  templateId: TemplateId;
  orientation: 'landscape' | 'portrait';
  side: 'front' | 'back';
  showBarcode?: boolean;
  showSignature?: boolean;
  showLogo?: boolean;
  fieldVisibility?: Partial<SchoolSettings['visibleFields']>;
}

export interface SavedCustomTemplate {
  id: string;
  name: string;
  baseTemplateId: TemplateId;
  orientation: 'landscape' | 'portrait';
  createdAt: string;
  updatedAt: string;
  customization: CardCustomization;
}

export type ActiveNavTab =
  | 'dashboard'
  | 'students'
  | 'import'
  | 'templates'
  | 'editor'
  | 'export'
  | 'settings';
