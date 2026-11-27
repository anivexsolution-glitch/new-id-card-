import React, { useState, useMemo } from 'react';
import { ActiveNavTab, ExportHistoryRecord, SchoolSettings, Student, TemplateId } from '../../types';
import {
  autoDetectColumnMapping,
  ColumnMapping,
  downloadSampleRosterCSV,
  parseExcelFile,
  ParsedWorkbook,
  switchSheet,
  validateMappedRows,
  ValidatedRecord,
} from '../../utils/excel';
import { TEMPLATE_REGISTRY } from '../../constants/initialData';
import { CR80Card } from '../cards/CR80Card';
import { CardSurface, PageHeader, StatusText } from '../ui/EnterpriseUI';
import {
  UploadCloud,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Download,
  AlertCircle,
  Check,
  CheckCircle2,
  Printer,
  Users,
} from 'lucide-react';

interface ExcelImportWizardProps {
  schoolSettings: SchoolSettings;
  onImportComplete: (importedStudents: Student[], mode: 'append' | 'replace') => void;
  onNavigate: (tab: ActiveNavTab) => void;
  onLogExport?: (entry: Omit<ExportHistoryRecord, 'id' | 'timestamp'>) => void;
}

const STEPS = [
  { num: 1, label: 'Upload File' },
  { num: 2, label: 'Preview Records' },
  { num: 3, label: 'Map Columns' },
  { num: 4, label: 'Validate Data' },
  { num: 5, label: 'Review Cards' },
  { num: 6, label: 'Generate & Export' },
];

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  schoolSettings,
  onImportComplete,
  onNavigate,
  onLogExport,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawBuffer, setRawBuffer] = useState<ArrayBuffer | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
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
  });

  const [validatedRecords, setValidatedRecords] = useState<ValidatedRecord[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [reviewSide, setReviewSide] = useState<'front' | 'back'>('front');
  const [reviewTemplateId, setReviewTemplateId] = useState<TemplateId>(
    schoolSettings.defaultTemplateId
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processProgress, setProcessProgress] = useState<number>(0);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Step 1: Upload Excel or CSV
  const handleFileUpload = async (uploadedFile: File) => {
    setIsLoading(true);
    setErrorMessage('');
    setCommitSuccessMsg('');
    try {
      const buffer = await uploadedFile.arrayBuffer();
      const parsed = await parseExcelFile(uploadedFile);
      setFile(uploadedFile);
      setRawBuffer(buffer);
      setParsedWorkbook(parsed);
      setSelectedSheet(parsed.activeSheet);

      const autoMap = autoDetectColumnMapping(parsed.headers);
      setColumnMapping(autoMap);
      setCurrentStep(2);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing spreadsheet. Verify valid .xlsx, .xls, or .csv format.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle worksheet switch in Step 2
  const handleSelectSheet = (sheetName: string) => {
    if (!parsedWorkbook || !rawBuffer) return;
    try {
      const switched = switchSheet(rawBuffer, sheetName);
      setSelectedSheet(sheetName);
      setParsedWorkbook({
        ...parsedWorkbook,
        activeSheet: sheetName,
        headers: switched.headers,
        rows: switched.rows,
      });
      setColumnMapping(autoDetectColumnMapping(switched.headers));
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to switch worksheet.');
    }
  };

  // Step 3 -> 4: Validate mapped rows
  const handleProceedToValidation = () => {
    if (!parsedWorkbook) return;
    if (!columnMapping.name) {
      setErrorMessage("Map at least the 'Student Full Name' column before validating.");
      return;
    }
    setErrorMessage('');
    const records = validateMappedRows(
      parsedWorkbook.rows,
      columnMapping,
      schoolSettings.academicSession
    );
    setValidatedRecords(records);
    setCurrentStep(4);
  };

  // Step 4 inline edit
  const handleUpdateRecordField = (rowIndex: number, field: keyof Student, val: string) => {
    setValidatedRecords((prev) =>
      prev.map((rec) => {
        if (rec.index !== rowIndex) return rec;
        const updatedData = { ...rec.data, [field]: val };
        const updatedErrors = rec.errors.filter((e) => e.field !== field);
        return {
          ...rec,
          data: updatedData,
          errors: updatedErrors,
          isValid: !updatedErrors.some((e) => e.severity === 'error'),
        };
      })
    );
  };

  // Validation counts
  const validationStats = useMemo(() => {
    const valid = validatedRecords.filter((r) => r.isValid).length;
    const invalid = validatedRecords.filter((r) => !r.isValid).length;
    const duplicates = validatedRecords.filter((r) =>
      r.errors.some((e) => e.message.toLowerCase().includes('duplicate'))
    ).length;
    const missingRequired = validatedRecords.reduce(
      (sum, r) => sum + r.errors.filter((e) => e.severity === 'error').length,
      0
    );
    return { valid, invalid, duplicates, missingRequired };
  }, [validatedRecords]);

  const validStudents = useMemo<Student[]>(
    () => validatedRecords.filter((r) => r.isValid).map((r) => r.data as Student),
    [validatedRecords]
  );

  // Step 6: Execute Import & optional export
  const handleCommitBatch = (destination: 'students' | 'export') => {
    if (validStudents.length === 0) {
      setErrorMessage('No valid records are available to generate. Resolve errors in Step 4.');
      return;
    }
    setErrorMessage('');
    setIsProcessing(true);
    setProcessProgress(35);

    setTimeout(() => {
      setProcessProgress(100);
      onImportComplete(validStudents, importMode);
      setIsProcessing(false);
      setCommitSuccessMsg(
        `Committed ${validStudents.length} valid student records (${importMode === 'replace' ? 'Replaced roster' : 'Appended to roster'}).`
      );
      if (destination === 'export') {
        onNavigate('export');
      } else {
        onNavigate('students');
      }
    }, 280);
  };

  const handleExportValidCsv = () => {
    if (validStudents.length === 0) return;
    const headers = [
      'Student Name',
      "Father's Name",
      "Mother's Name",
      'Contact Number',
      'D.O.B.',
      'Address',
      'Conveyance',
      'Session',
      'Roll No',
      'Class',
    ];
    const rows = validStudents.map((s) => [
      s.name,
      s.fatherName,
      s.motherName,
      s.contactNumber,
      s.dob,
      s.address,
      s.conveyance,
      s.session,
      s.rollNo || '',
      s.classGrade || '',
    ]);
    const fileName = `Validated_Bulk_Roster_${Date.now()}.csv`;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        headers.join(','),
        ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onLogExport?.({
      format: 'CSV',
      fileName,
      cardCount: validStudents.length,
      templateName: 'Validated Bulk Import',
      orientation: schoolSettings.defaultOrientation,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Bulk ID Generation"
        meta={
          file && parsedWorkbook ? (
            <span className="font-mono tabular-nums">
              {file.name} · {parsedWorkbook.rows.length} rows
            </span>
          ) : undefined
        }
        subtitle="Import student spreadsheets, validate fields, preview CR80 ID cards, and commit batches."
        actions={
          <button
            type="button"
            onClick={downloadSampleRosterCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#536477]" />
            <span>Sample CSV</span>
          </button>
        }
      />

      {/* 6-Step Progress Bar */}
      <CardSurface padding="sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STEPS.map((st) => {
            const isPassed = currentStep > st.num;
            const isCurrent = currentStep === st.num;
            return (
              <button
                key={st.num}
                type="button"
                disabled={!parsedWorkbook && st.num > 1}
                onClick={() => {
                  if (st.num < currentStep) setCurrentStep(st.num);
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors border ${
                  isCurrent
                    ? 'bg-[#24364B] text-white border-[#24364B]'
                    : isPassed
                    ? 'bg-[#F5F6F7] text-[#202B38] border-[#E3E7EB] hover:bg-[#F0F2F4]'
                    : 'bg-white text-[#75808C] border-transparent opacity-60 cursor-default'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-mono font-bold shrink-0 ${
                    isCurrent
                      ? 'bg-white text-[#24364B]'
                      : isPassed
                      ? 'bg-[#25845A] text-white'
                      : 'bg-[#E3E7EB] text-[#536477]'
                  }`}
                >
                  {isPassed ? <Check className="w-3 h-3" /> : st.num}
                </span>
                <span className="text-xs font-semibold truncate">{st.label}</span>
              </button>
            );
          })}
        </div>
      </CardSurface>

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-[#C44949]/10 border border-[#C44949]/30 flex items-center gap-2 text-xs text-[#C44949]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {commitSuccessMsg && (
        <div className="p-3.5 rounded-lg bg-[#25845A]/10 border border-[#25845A]/30 flex items-center gap-2 text-xs text-[#25845A]">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{commitSuccessMsg}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD EXCEL OR CSV */}
      {currentStep === 1 && (
        <CardSurface padding="lg" className="text-center space-y-5">
          <div className="max-w-lg mx-auto p-8 rounded-[10px] border border-dashed border-[#E3E7EB] hover:border-[#24364B] bg-[#F5F6F7] transition-colors flex flex-col items-center justify-center">
            <div className="w-11 h-11 rounded-[10px] bg-white border border-[#E3E7EB] flex items-center justify-center text-[#24364B] mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#202B38]">
              Upload Student Roster (.xlsx, .xls, .csv)
            </h3>
            <p className="text-xs text-[#75808C] mt-1 mb-4 max-w-sm">
              Spreadsheets are parsed directly in your browser. Zero student data leaves your workstation.
            </p>
            <label className="px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg cursor-pointer transition-colors">
              <span>{isLoading ? 'Reading File...' : 'Select Spreadsheet File'}</span>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                disabled={isLoading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="pt-4 border-t border-[#E3E7EB] flex flex-wrap items-center justify-center gap-2 text-xs text-[#75808C]">
            <span>Need a structured starting sheet?</span>
            <button
              type="button"
              onClick={downloadSampleRosterCSV}
              className="text-[#24364B] hover:underline font-semibold"
            >
              Download Sample CSV Template
            </button>
          </div>
        </CardSurface>
      )}

      {/* STEP 2: PREVIEW RECORDS */}
      {currentStep === 2 && parsedWorkbook && (
        <CardSurface padding="md" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7EB] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#202B38]">
                Preview Records · {parsedWorkbook.fileName}
              </h3>
              <p className="text-xs text-[#75808C] mt-0.5 tabular-nums">
                {parsedWorkbook.rows.length} rows and {parsedWorkbook.headers.length} columns detected.
              </p>
            </div>

            {parsedWorkbook.sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#536477]">Worksheet:</label>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSelectSheet(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] font-medium"
                >
                  {parsedWorkbook.sheetNames.map((sheet) => (
                    <option key={sheet} value={sheet}>
                      {sheet}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="overflow-x-auto max-h-[360px] border border-[#E3E7EB] rounded-[10px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F5F6F7] sticky top-0 border-b border-[#E3E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#75808C]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  {parsedWorkbook.headers.map((h) => (
                    <th key={h} className="py-2.5 px-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E7EB]">
                {parsedWorkbook.rows.slice(0, 25).map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F6F7]/70">
                    <td className="py-2 px-3 text-center font-mono text-[#75808C] tabular-nums">
                      {idx + 1}
                    </td>
                    {parsedWorkbook.headers.map((h) => (
                      <td
                        key={h}
                        className="py-2 px-3 text-[#202B38] max-w-[180px] truncate"
                      >
                        {String(row[h] ?? '') || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedWorkbook.rows.length > 25 && (
            <p className="text-[11px] text-[#75808C]">
              Showing first 25 of {parsedWorkbook.rows.length} rows. All rows will be validated in Step 4.
            </p>
          )}

          <div className="pt-3 border-t border-[#E3E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change File</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
            >
              <span>Next: Map Columns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardSurface>
      )}

      {/* STEP 3: MAP COLUMNS */}
      {currentStep === 3 && parsedWorkbook && (
        <CardSurface padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E3E7EB] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#202B38]">
                Map Spreadsheet Columns to Student Fields
              </h3>
              <p className="text-xs text-[#75808C] mt-0.5">
                Auto-detected mappings can be adjusted below before data validation.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-[#75808C]">
              {parsedWorkbook.rows.length} rows
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Student Full Name', required: true },
              { key: 'fatherName', label: "Father's Name", required: true },
              { key: 'motherName', label: "Mother's Name", required: true },
              { key: 'contactNumber', label: 'Contact Phone Number', required: true },
              { key: 'dob', label: 'Date of Birth (DD/MM/YYYY)', required: true },
              { key: 'address', label: 'Residential Address', required: true },
              { key: 'conveyance', label: 'Conveyance / Bus Route', required: true },
              { key: 'session', label: 'Academic Session', required: true },
              { key: 'rollNo', label: 'Roll Number / Admission No', required: false },
              { key: 'classGrade', label: 'Class & Section', required: false },
              { key: 'bloodGroup', label: 'Blood Group', required: false },
              { key: 'photoUrl', label: 'Photo URL', required: false },
            ].map((field) => {
              const selectedHeader = (columnMapping as any)[field.key] || '';
              const sampleVal =
                selectedHeader && parsedWorkbook.rows[0]
                  ? String(parsedWorkbook.rows[0][selectedHeader] ?? '')
                  : '';
              return (
                <div
                  key={field.key}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#F5F6F7] border border-[#E3E7EB]"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#202B38] block">
                      {field.label}{' '}
                      {field.required && <span className="text-[#C44949]">*</span>}
                    </span>
                    <span className="text-[11px] text-[#75808C] truncate block">
                      {sampleVal ? `Sample: ${sampleVal}` : 'Unmapped'}
                    </span>
                  </div>
                  <select
                    value={selectedHeader}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, [field.key]: e.target.value })
                    }
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38] max-w-[190px] focus:outline-none focus:border-[#24364B]"
                  >
                    <option value="">-- Unmapped --</option>
                    {parsedWorkbook.headers.map((hdr) => (
                      <option key={hdr} value={hdr}>
                        {hdr}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-[#E3E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={handleProceedToValidation}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
            >
              <span>Validate {parsedWorkbook.rows.length} Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardSurface>
      )}

      {/* STEP 4: VALIDATE DATA */}
      {currentStep === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <CardSurface padding="sm">
              <p className="text-xs font-medium text-[#75808C]">Valid Records</p>
              <p className="text-2xl font-bold text-[#25845A] font-mono tabular-nums mt-1">
                {validationStats.valid}
              </p>
            </CardSurface>
            <CardSurface padding="sm">
              <p className="text-xs font-medium text-[#75808C]">Invalid Records</p>
              <p className="text-2xl font-bold text-[#C44949] font-mono tabular-nums mt-1">
                {validationStats.invalid}
              </p>
            </CardSurface>
            <CardSurface padding="sm">
              <p className="text-xs font-medium text-[#75808C]">Duplicate Records</p>
              <p className="text-2xl font-bold text-[#C18A38] font-mono tabular-nums mt-1">
                {validationStats.duplicates}
              </p>
            </CardSurface>
            <CardSurface padding="sm">
              <p className="text-xs font-medium text-[#75808C]">Missing Required Fields</p>
              <p className="text-2xl font-bold text-[#202B38] font-mono tabular-nums mt-1">
                {validationStats.missingRequired}
              </p>
            </CardSurface>
          </div>

          <CardSurface padding="md" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E3E7EB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#202B38]">
                  Inline Data Validation & Resolution
                </h3>
                <p className="text-xs text-[#75808C] mt-0.5">
                  Edit any cell directly to fix missing required fields or duplicate names.
                </p>
              </div>
              <StatusText
                tone={validationStats.invalid > 0 ? 'warning' : 'success'}
                label={
                  validationStats.invalid > 0
                    ? `${validationStats.invalid} rows require fixes`
                    : 'All records validated'
                }
              />
            </div>

            <div className="overflow-x-auto max-h-[45vh] border border-[#E3E7EB] rounded-[10px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F5F6F7] sticky top-0 z-10 border-b border-[#E3E7EB] text-[11px] font-semibold uppercase tracking-wider text-[#75808C]">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Father&apos;s Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">D.O.B.</th>
                    <th className="py-2.5 px-3">Conveyance</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E7EB]">
                  {validatedRecords.map((rec) => (
                    <tr
                      key={rec.index}
                      className={!rec.isValid ? 'bg-[#C44949]/5' : 'hover:bg-[#F5F6F7]/60'}
                    >
                      <td className="py-2 px-3 text-center font-mono text-[#75808C] tabular-nums">
                        {rec.index + 1}
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.name || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'name', e.target.value)}
                          className="w-full min-w-[120px] bg-transparent border border-transparent hover:border-[#E3E7EB] focus:border-[#24364B] focus:bg-white px-1.5 py-1 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.fatherName || ''}
                          onChange={(e) =>
                            handleUpdateRecordField(rec.index, 'fatherName', e.target.value)
                          }
                          className="w-full min-w-[110px] bg-transparent border border-transparent hover:border-[#E3E7EB] focus:border-[#24364B] focus:bg-white px-1.5 py-1 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="text"
                          value={rec.data.contactNumber || ''}
                          onChange={(e) =>
                            handleUpdateRecordField(rec.index, 'contactNumber', e.target.value)
                          }
                          className="w-full min-w-[110px] bg-transparent border border-transparent hover:border-[#E3E7EB] focus:border-[#24364B] focus:bg-white px-1.5 py-1 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3 font-mono">
                        <input
                          type="text"
                          value={rec.data.dob || ''}
                          onChange={(e) => handleUpdateRecordField(rec.index, 'dob', e.target.value)}
                          className="w-full min-w-[95px] bg-transparent border border-transparent hover:border-[#E3E7EB] focus:border-[#24364B] focus:bg-white px-1.5 py-1 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={rec.data.conveyance || 'No'}
                          onChange={(e) =>
                            handleUpdateRecordField(rec.index, 'conveyance', e.target.value)
                          }
                          className="text-xs bg-white border border-[#E3E7EB] rounded px-2 py-1"
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={rec.data.address || ''}
                          onChange={(e) =>
                            handleUpdateRecordField(rec.index, 'address', e.target.value)
                          }
                          className="w-full min-w-[150px] bg-transparent border border-transparent hover:border-[#E3E7EB] focus:border-[#24364B] focus:bg-white px-1.5 py-1 rounded text-xs truncate"
                        />
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {rec.isValid ? (
                          <StatusText
                            tone={
                              rec.errors.some((e) => e.severity === 'warning')
                                ? 'warning'
                                : 'success'
                            }
                            label={
                              rec.errors.some((e) => e.message.toLowerCase().includes('duplicate'))
                                ? 'Duplicate'
                                : 'Valid'
                            }
                          />
                        ) : (
                          <span title={rec.errors.map((e) => e.message).join(', ')}>
                            <StatusText
                              tone="danger"
                              label={`Invalid (${rec.errors.length})`}
                            />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-[#E3E7EB] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Mapping</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                disabled={validStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] disabled:opacity-40 rounded-lg"
              >
                <span>Review {validStudents.length} Generated Cards</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </CardSurface>
        </div>
      )}

      {/* STEP 5: REVIEW GENERATED ID CARDS */}
      {currentStep === 5 && (
        <CardSurface padding="md" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E7EB] pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#202B38]">
                Review Generated ID Cards ({validStudents.length})
              </h3>
              <p className="text-xs text-[#75808C] mt-0.5">
                Inspect card rendering accuracy across student records before saving to your school roster.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Preview template"
                value={reviewTemplateId}
                onChange={(e) => setReviewTemplateId(e.target.value as TemplateId)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-[#E3E7EB] bg-white text-[#202B38]"
              >
                {TEMPLATE_REGISTRY.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.orientation})
                  </option>
                ))}
              </select>

              <div className="inline-flex bg-[#F0F2F4] p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setReviewSide('front')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    reviewSide === 'front' ? 'bg-white text-[#202B38]' : 'text-[#536477]'
                  }`}
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => setReviewSide('back')}
                  className={`px-2.5 py-1 rounded-md font-semibold ${
                    reviewSide === 'back' ? 'bg-white text-[#202B38]' : 'text-[#536477]'
                  }`}
                >
                  Back
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[58vh] overflow-y-auto p-1 studio-grid-bg rounded-[10px] border border-[#E3E7EB]">
            {validStudents.slice(0, 12).map((st) => {
              const orient = reviewTemplateId.startsWith('portrait_') ? 'portrait' : 'landscape';
              return (
                <div
                  key={st.id}
                  className="bg-white border border-[#E3E7EB] rounded-[10px] p-3 flex flex-col items-center gap-2"
                >
                  <div className={orient === 'portrait' ? 'w-[190px]' : 'w-full max-w-[260px]'}>
                    <CR80Card
                      student={st}
                      schoolSettings={schoolSettings}
                      customization={{
                        templateId: reviewTemplateId,
                        orientation: orient,
                        side: reviewSide,
                      }}
                    />
                  </div>
                  <div className="w-full flex items-center justify-between text-[11px] pt-1 border-t border-[#E3E7EB]">
                    <span className="font-semibold text-[#202B38] truncate">{st.name}</span>
                    <span className="font-mono text-[#75808C]">{st.rollNo || st.classGrade || 'CR80'}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {validStudents.length > 12 && (
            <p className="text-[11px] text-[#75808C]">
              Previewing the first 12 cards. All {validStudents.length} valid records will be committed in Step 6.
            </p>
          )}

          <div className="pt-3 border-t border-[#E3E7EB] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Validation</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(6)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
            >
              <span>Next: Generate &amp; Export</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardSurface>
      )}

      {/* STEP 6: GENERATE AND EXPORT */}
      {currentStep === 6 && (
        <CardSurface padding="md" className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-[#202B38]">Generate &amp; Export Batch</h3>
            <p className="text-xs text-[#75808C] mt-0.5">
              Choose how to commit these {validStudents.length} verified records into THE ID MAKER.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              className={`p-4 rounded-[10px] border cursor-pointer flex items-start gap-3 transition-colors ${
                importMode === 'append'
                  ? 'border-[#24364B] bg-[#F5F6F7]'
                  : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/50'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="mt-0.5 accent-[#24364B]"
              />
              <div>
                <span className="text-xs font-bold text-[#202B38] block">
                  Append to Existing Roster
                </span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">
                  Keeps current students and adds these {validStudents.length} new records.
                </span>
              </div>
            </label>

            <label
              className={`p-4 rounded-[10px] border cursor-pointer flex items-start gap-3 transition-colors ${
                importMode === 'replace'
                  ? 'border-[#24364B] bg-[#F5F6F7]'
                  : 'border-[#E3E7EB] bg-white hover:bg-[#F5F6F7]/50'
              }`}
            >
              <input
                type="radio"
                name="importMode"
                checked={importMode === 'replace'}
                onChange={() => setImportMode('replace')}
                className="mt-0.5 accent-[#24364B]"
              />
              <div>
                <span className="text-xs font-bold text-[#202B38] block">
                  Replace Entire Roster
                </span>
                <span className="text-[11px] text-[#75808C] block mt-0.5">
                  Clears demo or older rows and makes this spreadsheet the active roster.
                </span>
              </div>
            </label>
          </div>

          {isProcessing && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-[#536477]">
                <span>Saving student batch to local database...</span>
                <span className="font-mono tabular-nums">{processProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#F0F2F4] overflow-hidden">
                <div
                  className="h-full bg-[#24364B] transition-all duration-200"
                  style={{ width: `${processProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="p-4 rounded-[10px] border border-[#E3E7EB] bg-[#F5F6F7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs">
              <p className="font-bold text-[#202B38]">
                {validStudents.length} Valid Records Ready
              </p>
              <p className="text-[#75808C] mt-0.5">
                {validationStats.invalid} invalid rows skipped · Session {schoolSettings.academicSession}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportValidCsv}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                <Download className="w-3.5 h-3.5 text-[#536477]" />
                <span>Export Valid CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleCommitBatch('students')}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#202B38] bg-white border border-[#E3E7EB] hover:bg-[#F0F2F4] rounded-lg"
              >
                <Users className="w-3.5 h-3.5 text-[#536477]" />
                <span>Commit to Students</span>
              </button>
              <button
                type="button"
                onClick={() => handleCommitBatch('export')}
                disabled={isProcessing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#24364B] hover:bg-[#304A64] rounded-lg"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Commit &amp; Batch Print A4</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#536477] hover:text-[#202B38]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Card Review</span>
            </button>
          </div>
        </CardSurface>
      )}
    </div>
  );
};
