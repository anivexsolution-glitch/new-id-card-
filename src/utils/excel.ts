import * as XLSX from 'xlsx';
import { Student } from '../types';
import { sanitizeStudentPhotoUrl } from './photoUtils';

export interface ColumnMapping {
  name: string;
  fatherName: string;
  motherName: string;
  contactNumber: string;
  dob: string;
  address: string;
  conveyance: string;
  session: string;
  rollNo?: string;
  classGrade?: string;
  bloodGroup?: string;
  photoUrl?: string;
}

export interface ParsedWorkbook {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
}

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidatedRecord {
  index: number;
  data: Partial<Student>;
  raw: Record<string, any>;
  errors: ValidationError[];
  isValid: boolean;
}

export const parseExcelFile = async (file: File): Promise<ParsedWorkbook> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheetNames = workbook.SheetNames;
        if (!sheetNames || sheetNames.length === 0) {
          throw new Error('No worksheets found in uploaded file');
        }

        const activeSheet = sheetNames[0];
        const worksheet = workbook.Sheets[activeSheet];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (rawJson.length === 0) {
          // Check if at least headers exist
          const headerRow: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as any[];
          return resolve({
            sheetNames,
            activeSheet,
            headers: (headerRow || []).map(String),
            rows: [],
            fileName: file.name,
          });
        }

        const headers = Object.keys(rawJson[0]);

        resolve({
          sheetNames,
          activeSheet,
          headers,
          rows: rawJson,
          fileName: file.name,
        });
      } catch (err: any) {
        reject(new Error(err?.message || 'Failed to parse Excel file'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const switchSheet = (workbookData: ArrayBuffer, sheetName: string): { headers: string[]; rows: Record<string, any>[] } => {
  const workbook = XLSX.read(workbookData, { type: 'array', cellDates: true });
  const worksheet = workbook.Sheets[sheetName];
  const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  const headers = rawJson.length > 0 ? Object.keys(rawJson[0]) : [];
  return { headers, rows: rawJson };
};

// Smart heuristic auto-mapping
export const autoDetectColumnMapping = (headers: string[]): ColumnMapping => {
  const mapping: ColumnMapping = {
    name: '',
    fatherName: '',
    motherName: '',
    contactNumber: '',
    dob: '',
    address: '',
    conveyance: '',
    session: '',
    rollNo: '',
    classGrade: '',
    bloodGroup: '',
    photoUrl: '',
  };

  const clean = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  headers.forEach((h) => {
    const c = clean(h);

    if (!mapping.name && (c === 'name' || c === 'studentname' || c === 'fullname')) {
      mapping.name = h;
    } else if (!mapping.fatherName && (c.includes('father') || c === 'fathersname' || c === 'guardianname')) {
      mapping.fatherName = h;
    } else if (!mapping.motherName && (c.includes('mother') || c === 'mothersname')) {
      mapping.motherName = h;
    } else if (!mapping.contactNumber && (c.includes('contact') || c.includes('phone') || c.includes('mobile') || c === 'phoneno')) {
      mapping.contactNumber = h;
    } else if (!mapping.dob && (c === 'dob' || c.includes('birth') || c === 'dateofbirth')) {
      mapping.dob = h;
    } else if (!mapping.address && (c.includes('address') || c === 'residence' || c === 'location')) {
      mapping.address = h;
    } else if (!mapping.conveyance && (c.includes('conveyance') || c.includes('transport') || c.includes('bus') || c === 'transportsrv')) {
      mapping.conveyance = h;
    } else if (!mapping.session && (c.includes('session') || c.includes('academicyear') || c === 'year')) {
      mapping.session = h;
    } else if (!mapping.rollNo && (c.includes('roll') || c === 'rollnumber' || c === 'admissionno' || c === 'admno')) {
      mapping.rollNo = h;
    } else if (!mapping.classGrade && (c.includes('class') || c.includes('grade') || c.includes('sec') || c === 'standard')) {
      mapping.classGrade = h;
    } else if (!mapping.bloodGroup && (c.includes('blood') || c === 'bloodgroup' || c === 'bg')) {
      mapping.bloodGroup = h;
    } else if (!mapping.photoUrl && (c.includes('photo') || c.includes('image') || c.includes('pic'))) {
      mapping.photoUrl = h;
    }
  });

  return mapping;
};

// Normalize Indian Date Format DD/MM/YYYY
export const normalizeDateFormat = (rawDate: any): string => {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (!str) return '';

  // If already DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // If YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Try standard Date parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return str;
};

// Normalize Conveyance to 'Yes' | 'No'
export const normalizeConveyance = (val: any): 'Yes' | 'No' => {
  if (val === undefined || val === null) return 'No';
  const s = String(val).trim().toLowerCase();
  if (s === 'yes' || s === 'y' || s === 'true' || s === '1' || s === 'bus' || s === 'school bus') {
    return 'Yes';
  }
  return 'No';
};

// Validate and Map rows
export const validateMappedRows = (
  rows: Record<string, any>[],
  mapping: ColumnMapping,
  defaultSession: string
): ValidatedRecord[] => {
  return rows.map((raw, idx) => {
    const errors: ValidationError[] = [];

    const name = String(raw[mapping.name] || '').trim();
    const fatherName = String(raw[mapping.fatherName] || '').trim();
    const motherName = String(raw[mapping.motherName] || '').trim();
    const rawContact = String(raw[mapping.contactNumber] || '').trim();
    const rawDob = raw[mapping.dob];
    const address = String(raw[mapping.address] || '').trim();
    const rawConveyance = raw[mapping.conveyance];
    const rawSession = String(raw[mapping.session] || '').trim() || defaultSession;
    const rollNo = mapping.rollNo ? String(raw[mapping.rollNo] || '').trim() : '';
    const classGrade = mapping.classGrade ? String(raw[mapping.classGrade] || '').trim() : '';
    const bloodGroup = mapping.bloodGroup ? String(raw[mapping.bloodGroup] || '').trim() : '';
    const photoUrl = mapping.photoUrl ? String(raw[mapping.photoUrl] || '').trim() : '';

    const seenNames = new Set<string>();
    rows.forEach((r, idx) => {
      const n = String(r[mapping.name] || '').trim().toLowerCase();
      if (n) {
        if (seenNames.has(n)) {
          // Will be marked on records
        } else {
          seenNames.add(n);
        }
      }
    });

    const isDuplicate = name && rows.filter((r) => String(r[mapping.name] || '').trim().toLowerCase() === name.toLowerCase()).length > 1;
    if (isDuplicate) {
      errors.push({ rowIndex: idx, field: 'name', message: 'Potential duplicate student name found in sheet', severity: 'warning' });
    }

    if (!name) {
      errors.push({ rowIndex: idx, field: 'name', message: 'Student Name is required', severity: 'error' });
    }
    if (!fatherName) {
      errors.push({ rowIndex: idx, field: 'fatherName', message: "Father's Name is required", severity: 'warning' });
    }
    if (!motherName) {
      errors.push({ rowIndex: idx, field: 'motherName', message: "Mother's Name is required", severity: 'warning' });
    }

    if (!rawContact) {
      errors.push({ rowIndex: idx, field: 'contactNumber', message: 'Contact Number is required', severity: 'error' });
    }

    const dob = normalizeDateFormat(rawDob);
    if (!dob) {
      errors.push({ rowIndex: idx, field: 'dob', message: 'D.O.B. is required', severity: 'error' });
    }

    if (!address) {
      errors.push({ rowIndex: idx, field: 'address', message: 'Residential Address is required', severity: 'error' });
    }

    const conveyance = normalizeConveyance(rawConveyance);
    const session = rawSession || defaultSession;

    const data: Partial<Student> = {
      id: `std_imp_${Date.now()}_${idx}`,
      name,
      fatherName,
      motherName,
      contactNumber: rawContact,
      dob,
      address,
      conveyance,
      session,
      rollNo: rollNo || undefined,
      classGrade: classGrade || undefined,
      bloodGroup: bloodGroup || undefined,
      photoUrl: sanitizeStudentPhotoUrl(photoUrl),
      idCardNumber: `SCH-${session.split('-')[0] || '2025'}-${String(idx + 101).padStart(4, '0')}`,
      isCardGenerated: false,
      createdAt: new Date().toISOString(),
    };

    const hasFatalError = errors.some((e) => e.severity === 'error');

    return {
      index: idx,
      data,
      raw,
      errors,
      isValid: !hasFatalError,
    };
  });
};

// Generate Sample CSV file for the user to download
export const downloadSampleRosterCSV = () => {
  const headers = [
    'Student Name',
    "Father's Name",
    "Mother's Name",
    'Contact Number',
    'D.O.B. (DD/MM/YYYY)',
    'Address',
    'Conveyance (Yes/No)',
    'Session',
    'Roll No',
    'Class',
    'Blood Group',
  ];

  const sampleRows = [
    [
      'Aarav Sharma',
      'Rajesh Sharma',
      'Sunita Sharma',
      '+91 98765 43210',
      '14/08/2009',
      'Flat 402, Shanti Heights, Sector 14, Rohini, New Delhi 110085',
      'Yes',
      '2025-2026',
      '10-A-24',
      'Class X - A',
      'B+',
    ],
    [
      'Ananya Verma',
      'Vikram Verma',
      'Pooja Verma',
      '+91 98112 34567',
      '22/11/2009',
      'B-14, Green Park Extension, New Delhi 110016',
      'No',
      '2025-2026',
      '10-A-12',
      'Class X - A',
      'O+',
    ],
    [
      'Rohan Mehra',
      'Alok Mehra',
      'Divya Mehra',
      '+91 97170 88991',
      '05/03/2010',
      'House No. 78, Pocket D, Mayur Vihar Phase II, Delhi 110091',
      'Yes',
      '2025-2026',
      '09-C-18',
      'Class IX - C',
      'A+',
    ],
  ];

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...sampleRows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join(
      '\n'
    );

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'school_student_roster_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
